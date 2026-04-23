const WebSocket = require('ws');
const { v4: uuid } = require('uuid') || { v4: () => Math.random().toString(36).slice(2) };

const cmd = process.argv[2] || "wx.__navigate('levelSelect')";

const ws = new WebSocket('ws://127.0.0.1:9423');

ws.on('open', () => {
  const id = Date.now().toString(36);
  const msg = JSON.stringify({
    id,
    method: 'App.callFunction',
    params: {
      functionDeclaration: `function() { return (${cmd}); }`,
      args: []
    }
  });
  console.log('Sending:', msg);
  ws.send(msg);
  
  setTimeout(() => {
    console.log('Timeout - no response');
    ws.close();
    process.exit(0);
  }, 5000);
});

ws.on('message', (data) => {
  console.log('Response:', data.toString());
  ws.close();
});

ws.on('error', (e) => {
  console.log('Error:', e.message);
});
