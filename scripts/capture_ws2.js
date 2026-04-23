const WebSocket = require('C:/ClaudeCodeProjects/StarGame/backend/node_modules/ws');
const fs = require('fs');

console.log('Connecting...');
const ws = new WebSocket('ws://127.0.0.1:9420');
let msgId = 1;

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    id: msgId++,
    method: 'App.captureScreenshot',
    params: {}
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  const preview = JSON.stringify(msg).substring(0, 600);
  console.log('Response:', preview);
  
  if (msg.id === 1) {
    if (msg.result && msg.result.data) {
      const imgData = Buffer.from(msg.result.data, 'base64');
      const outPath = 'C:/ClaudeCodeProjects/StarGame/docs/virtual-user/sprint7-mini-flow/flow-14-ws-shot.png';
      fs.writeFileSync(outPath, imgData);
      console.log('Screenshot saved!', imgData.length, 'bytes');
    } else {
      console.log('No data. Full response:', JSON.stringify(msg));
    }
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (e) => { console.log('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.log('Timeout'); ws.close(); process.exit(1); }, 15000);
