const WebSocket = require('../backend/node_modules/ws');
const fs = require('fs');

console.log('WS module loaded');
const ws = new WebSocket('ws://127.0.0.1:9420');
let msgId = 1;

ws.on('open', () => {
  console.log('WS connected');
  // First try to list methods available - use getCurrentPage
  ws.send(JSON.stringify({
    id: msgId++,
    method: 'Page.captureScreenshot',
    params: { format: 'png', quality: 80 }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  const preview = JSON.stringify(msg).substring(0, 500);
  console.log('Response id=' + msg.id + ':', preview);
  
  if (msg.id === 1) {
    if (msg.result && msg.result.data) {
      const imgData = Buffer.from(msg.result.data, 'base64');
      const outPath = 'C:/ClaudeCodeProjects/StarGame/docs/virtual-user/sprint7-mini-flow/flow-14-ws-shot.png';
      fs.writeFileSync(outPath, imgData);
      console.log('Screenshot saved!', imgData.length, 'bytes');
      ws.close();
      process.exit(0);
    } else {
      console.log('No screenshot data. Trying screenshot method...');
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'screenshot',
        params: { 
          path: 'C:/ClaudeCodeProjects/StarGame/docs/virtual-user/sprint7-mini-flow/flow-14-auto.png'
        }
      }));
    }
  } else {
    console.log('Other msg:', preview.substring(0, 200));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (e) => { console.log('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.log('Timeout'); ws.close(); process.exit(1); }, 12000);
