const WebSocket = require('ws');

// WeChat DevTools uses a different CDP endpoint
// Try the simulator's page target
const ws = new WebSocket('ws://127.0.0.1:9420');

ws.on('open', () => {
  console.log('Connected to 9420 root');
  // Send Page.captureScreenshot
  ws.send(JSON.stringify({id: 1, method: 'Page.captureScreenshot', params: {format: 'png'}}));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Keys:', Object.keys(msg));
  if (msg.result && msg.result.data) {
    const buf = Buffer.from(msg.result.data, 'base64');
    require('fs').writeFileSync('C:\tmp\cdp_shot.png', buf);
    console.log('Screenshot saved! Size:', buf.length);
  } else {
    console.log('Response:', data.toString().substring(0, 300));
  }
  ws.close();
});

ws.on('error', (err) => {
  console.log('Error:', err.message);
});

setTimeout(() => process.exit(0), 8000);
