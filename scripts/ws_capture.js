/**
 * Sprint 2-mini QA - Canvas screenshot via game's own canvas.toDataURL()
 * The mini game canvas can take its own screenshot via canvas.toDataURL()
 * We inject this via the DevTools automation WebSocket protocol
 */

const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WS_PORT = 9423;
const EVIDENCE_DIR = 'C:\\ClaudeCodeProjects\\StarGame\\docs\\qa\\sprint2-mini-evidence';

function wsHandshake(key) {
  const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto.createHash('sha1').update(key + magic).digest('base64');
}

function wsFrame(data) {
  const payload = Buffer.from(JSON.stringify(data));
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function parseWsFrame(buf) {
  if (buf.length < 2) return null;
  const fin = (buf[0] & 0x80) !== 0;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(2); offset = 4; }
  else if (payloadLen === 127) { payloadLen = Number(buf.readBigUInt64BE(2)); offset = 10; }
  if (buf.length < offset + payloadLen) return null;
  const payload = buf.slice(offset, offset + payloadLen);
  return { opcode, payload: payload.toString('utf8'), consumed: offset + payloadLen };
}

class WsClient {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
    this.msgId = 1;
    this.buffer = Buffer.alloc(0);
    this.eventHandlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(WS_PORT, '127.0.0.1');
      this.socket = socket;

      const key = crypto.randomBytes(16).toString('base64');
      socket.once('connect', () => {
        socket.write(
          `GET / HTTP/1.1\r\nHost: 127.0.0.1:${WS_PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
      });

      socket.once('data', (data) => {
        const str = data.toString();
        if (str.includes('101')) {
          console.log('WebSocket connected!');
          socket.on('data', (chunk) => this._onData(chunk));
          resolve(this);
        } else {
          reject(new Error('WS handshake failed: ' + str.split('\r\n')[0]));
        }
      });

      socket.once('error', reject);
      setTimeout(() => reject(new Error('connect timeout')), 5000);
    });
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const frame = parseWsFrame(this.buffer);
      if (!frame) break;
      this.buffer = this.buffer.slice(frame.consumed);
      if (frame.opcode === 1) {
        try {
          const msg = JSON.parse(frame.payload);
          if (msg.id && this.callbacks.has(msg.id)) {
            const { resolve, reject } = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          } else if (msg.method) {
            const handlers = this.eventHandlers.get(msg.method) || [];
            handlers.forEach(h => h(msg.params));
          }
        } catch(e) {}
      }
    }
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.socket.write(wsFrame({ id, method, params }));
      setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 10000);
    });
  }

  close() {
    this.socket && this.socket.destroy();
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const client = new WsClient();

  try {
    await client.connect();

    // Use the automation protocol to run JS in the game context
    // The game has wx.__navigate for navigation
    // We can use canvas.toDataURL() to get the screenshot

    const screens = [
      { name: 'menu', nav: 'menu', file: 'STORY-00206-01-menu.png' },
      { name: 'levels', nav: 'levels', file: 'STORY-00206-02-levels.png' },
      { name: 'game', nav: 'game', file: 'STORY-00206-03-game.png' },
    ];

    for (const screen of screens) {
      console.log(`\nCapturing: ${screen.name}`);

      // Navigate
      try {
        await client.send('App.callFunction', {
          name: '__navigate',
          args: [screen.nav]
        });
      } catch(e) {
        console.log('  callFunction error:', e.message);
        // Try evaluate
        try {
          await client.send('Runtime.evaluate', {
            expression: `wx.__navigate && wx.__navigate('${screen.nav}')`
          });
        } catch(e2) {
          console.log('  evaluate error:', e2.message);
        }
      }

      await sleep(2000);

      // Take canvas screenshot
      try {
        const result = await client.send('App.captureScreenshot');
        if (result && result.data) {
          const imgBuf = Buffer.from(result.data, 'base64');
          const outPath = path.join(EVIDENCE_DIR, screen.file);
          fs.writeFileSync(outPath, imgBuf);
          console.log('  Saved:', screen.file, '(' + imgBuf.length + ' bytes)');
        } else {
          console.log('  No screenshot data:', JSON.stringify(result));
        }
      } catch(e) {
        console.log('  screenshot error:', e.message);
      }
    }

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    client.close();
  }
}

main();
