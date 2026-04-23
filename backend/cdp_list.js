const WebSocket = require('ws');

// Try multiple approaches to list targets
const ws = new WebSocket('ws://127.0.0.1:46990');

ws.on('open', () => {
  console.log('Connected!');
  // Try Target.getTargets
  ws.send(JSON.stringify({ id: 1, method: 'Target.getTargets' }));
  ws.send(JSON.stringify({ id: 2, method: 'Target.getInfo' }));
  ws.send(JSON.stringify({ id: 3, method: 'Browser.getVersion' }));
  ws.send(JSON.stringify({ id: 4, method: 'Runtime.evaluate', params: { expression: 'window.location.href' } }));
  ws.send(JSON.stringify({ id: 5, method: 'Page.getFrameTree' }));
});

ws.on('message', (data) => {
  const msg = data.toString();
  console.log('MSG:', msg.substring(0, 400));
});

ws.on('error', e => console.log('Error:', e.message));
setTimeout(() => { ws.close(); process.exit(0); }, 4000);
