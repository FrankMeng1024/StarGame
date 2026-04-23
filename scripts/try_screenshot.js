/**
 * Try App.captureScreenshot directly on automation WS
 * Also try App.getPageStack, App.getCurrentPage to see game state
 */
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WS_PORT = 9423;
const OUT_DIR = 'C:\\ClaudeCodeProjects\\StarGame\\docs\\qa\\sprint2-mini-evidence';

function wsFrame(data) {
  const payload = Buffer.from(JSON.stringify(data));
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
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
  const opcode = buf[0] & 0x0f;
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(2); offset = 4; }
  else if (payloadLen === 127) { payloadLen = Number(buf.readBigUInt64BE(2)); offset = 10; }
  if (buf.length < offset + payloadLen) return null;
  return { opcode, payload: buf.slice(offset, offset + payloadLen).toString('utf8'), consumed: offset + payloadLen };
}

class WsClient {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
    this.msgId = 1;
    this.buffer = Buffer.alloc(0);
    this.eventHandlers = new Map();
    this.allMessages = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(WS_PORT, '127.0.0.1');
      this.socket = socket;
      const key = crypto.randomBytes(16).toString('base64');
      socket.once('connect', () => {
        socket.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${WS_PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      socket.once('data', (data) => {
        if (data.toString().includes('101')) {
          socket.on('data', (chunk) => this._onData(chunk));
          resolve(this);
        } else { reject(new Error('WS handshake failed')); }
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
          this.allMessages.push(msg);
          if (msg.id && this.callbacks.has(msg.id)) {
            const { resolve, reject } = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
          } else if (msg.method) {
            const handlers = this.eventHandlers.get(msg.method) || [];
            handlers.forEach(h => h(msg.params));
          }
        } catch(e) {}
      }
    }
  }

  send(method, params = {}, timeout = 15000) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.socket.write(wsFrame({ id, method, params }));
      const t = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`timeout(${timeout}ms): ${method}`));
        }
      }, timeout);
    });
  }

  close() { this.socket && this.socket.destroy(); }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const client = new WsClient();
  try {
    await client.connect();
    console.log('Connected to ws://127.0.0.1:' + WS_PORT);
    await sleep(500);

    // Try to understand game state first
    const probes = [
      ['Tool.getInfo', {}],
      ['App.getPageStack', {}],
      ['App.getCurrentPage', {}],
    ];

    for (const [method, params] of probes) {
      try {
        console.log(`\nTrying ${method}...`);
        const result = await client.send(method, params, 8000);
        console.log('  Result:', JSON.stringify(result || '').substring(0, 300));
      } catch(e) {
        console.log('  Error:', e.message);
      }
    }

    // Try captureScreenshot with longer timeout
    console.log('\nTrying App.captureScreenshot (30s timeout)...');
    try {
      const result = await client.send('App.captureScreenshot', {}, 30000);
      if (result && result.data) {
        const buf = Buffer.from(result.data, 'base64');
        const outPath = path.join(OUT_DIR, 'screenshot-auto.png');
        fs.writeFileSync(outPath, buf);
        console.log('SAVED! Size:', buf.length, 'bytes', '->', outPath);
      } else {
        console.log('No data:', JSON.stringify(result));
      }
    } catch(e) {
      console.log('Error:', e.message);
    }

  } catch(e) {
    console.error('Fatal:', e.message);
  } finally {
    client.close();
  }
}

main();
