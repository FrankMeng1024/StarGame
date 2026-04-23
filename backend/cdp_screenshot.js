const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Try to connect to WeChat DevTools CDP
const ws = new WebSocket('ws://127.0.0.1:9420/json');

ws.on('open', () => {
  console.log('Connected to CDP');
  // Send a simple command
  ws.send(JSON.stringify({id: 1, method: 'Target.getTargets'}));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString().substring(0, 500));
  ws.close();
});

ws.on('error', (err) => {
  console.log('Error:', err.message);
});

ws.on('close', () => {
  console.log('Connection closed');
});

setTimeout(() => {
  console.log('Timeout - closing');
  ws.close();
  process.exit(0);
}, 5000);
