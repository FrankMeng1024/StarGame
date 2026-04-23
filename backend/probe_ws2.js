const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9420');
let timer;

ws.on('open', () => {
  console.log('Connected');
  // Send the automator protocol init message
  const msg = JSON.stringify({ id: 1, method: 'Page.getResourceTree', params: {} });
  console.log('Sending:', msg);
  ws.send(msg);
  timer = setTimeout(() => {
    console.log('Timeout - closing');
    ws.close();
    process.exit(0);
  }, 3000);
});

ws.on('message', (data) => {
  clearTimeout(timer);
  console.log('MSG:', data.toString().substring(0, 500));
  ws.close();
  process.exit(0);
});

ws.on('error', (e) => { console.log('Error:', e.message); process.exit(1); });
