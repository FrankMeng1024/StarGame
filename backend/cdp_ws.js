const WebSocket = require('ws');
const http = require('http');

// Try to connect to the CDP WebSocket directly
const ws = new WebSocket('ws://127.0.0.1:46990', {
  headers: {
    'Host': '127.0.0.1:46990',
    'Upgrade': 'websocket',
    'Connection': 'Upgrade',
  }
});

ws.on('open', () => {
  console.log('Connected to CDP WebSocket!');
  // Send Runtime.evaluate to navigate
  const msg = JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'typeof wx !== "undefined" ? "wx_ok" : "no_wx"'
    }
  });
  ws.send(msg);
});

ws.on('message', (data) => {
  console.log('Message:', data.toString().substring(0, 500));
});

ws.on('error', (e) => {
  console.log('WS Error:', e.message);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
  process.exit(0);
}, 3000);
