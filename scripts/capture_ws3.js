const WebSocket = require('C:/ClaudeCodeProjects/StarGame/backend/node_modules/ws');
const fs = require('fs');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

console.log('Connecting...');
const ws = new WebSocket('ws://127.0.0.1:9420');

ws.on('open', () => {
  console.log('Connected');
  const id = uuid();
  const msg = JSON.stringify({ id, method: 'App.captureScreenshot', params: {} });
  console.log('Sending:', msg.substring(0, 100));
  ws.send(msg);
  
  setTimeout(() => {
    // Also try Tool.getInfo to see if we get any response
    const id2 = uuid();
    ws.send(JSON.stringify({ id: id2, method: 'Tool.getInfo', params: {} }));
    console.log('Also sent Tool.getInfo with id:', id2.substring(0, 8));
  }, 2000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  const preview = JSON.stringify(msg).substring(0, 600);
  console.log('Response:', preview);
  
  if (msg.result && msg.result.data) {
    const imgData = Buffer.from(msg.result.data, 'base64');
    const outPath = 'C:/ClaudeCodeProjects/StarGame/docs/virtual-user/sprint7-mini-flow/flow-14-ws-shot.png';
    fs.writeFileSync(outPath, imgData);
    console.log('Screenshot saved!', imgData.length, 'bytes');
    ws.close();
    process.exit(0);
  }
  
  if (msg.result && msg.result.SDKVersion) {
    console.log('Tool.getInfo response - SDK version:', msg.result.SDKVersion);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (e) => { console.log('WS error:', e.message); process.exit(1); });
setTimeout(() => { 
  console.log('Timeout - no response received'); 
  ws.close(); 
  process.exit(1); 
}, 15000);
