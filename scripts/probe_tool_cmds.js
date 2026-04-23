/**
 * Probe all Tool.* commands on automation WS
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
    header = Buffer.alloc(2); header[0] = 0x81; header[1] = len;
  } else {
    header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126;
    header.writeUInt16BE(len, 2);
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
  constructor() { this.socket = null; this.callbacks = new Map(); this.msgId = 1; this.buffer = Buffer.alloc(0); }
  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(WS_PORT, '127.0.0.1');
      this.socket = socket;
      const key = crypto.randomBytes(16).toString('base64');
      socket.once('connect', () => {
        socket.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${WS_PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      socket.once('data', (data) => {
        if (data.toString().includes('101')) { socket.on('data', (chunk) => this._onData(chunk)); resolve(this); }
        else reject(new Error('WS handshake failed'));
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
            if (msg.error) reject(new Error(JSON.stringify(msg.error)));
            else resolve(msg.result);
          }
        } catch(e) {}
      }
    }
  }
  send(method, params = {}, timeout = 8000) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.socket.write(wsFrame({ id, method, params }));
      setTimeout(() => { if (this.callbacks.has(id)) { this.callbacks.delete(id); reject(new Error(`timeout: ${method}`)); } }, timeout);
    });
  }
  close() { this.socket && this.socket.destroy(); }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const client = new WsClient();
  await client.connect();
  console.log('Connected');

  // Probe Tool.* namespace
  const toolCmds = [
    'Tool.getInfo',
    'Tool.getTestAccounts',
    'Tool.enableRemoteDebug',
    'Tool.screenshot',
    'Tool.capture',
    'Tool.captureScreenshot',
    'Tool.captureCanvas',
    'Tool.getScreenshot',
    'Tool.preview',
    'Tool.getSimulatorImage',
    'Tool.simulatorScreenshot',
    'Tool.relaunch',
    'Tool.close',
    'Tool.launchGame',
    'Tool.getGameCanvas',
  ];

  for (const cmd of toolCmds) {
    try {
      const result = await client.send(cmd, {}, 5000);
      const str = JSON.stringify(result || '');
      console.log(`${cmd}: OK - ${str.substring(0, 200)}`);
      // If we get image data, save it
      if (result && result.data && result.data.length > 100) {
        const buf = Buffer.from(result.data, 'base64');
        const outPath = path.join(OUT_DIR, `tool-${cmd.replace('.','-')}.png`);
        fs.writeFileSync(outPath, buf);
        console.log(`  -> SAVED ${buf.length} bytes to ${outPath}`);
      }
    } catch(e) {
      console.log(`${cmd}: ${e.message}`);
    }
  }

  client.close();
}

main().catch(console.error);
