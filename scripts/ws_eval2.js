const WS = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator/node_modules/ws/index.js');

const cmd = process.argv[2] || "wx.__navigate('levelSelect')";

const ws = new WS('ws://127.0.0.1:9423');
let done = false;

ws.on('open', () => {
  const id = 'qa-' + Date.now();
  const msg = JSON.stringify({
    id,
    method: 'App.callFunction',
    params: {
      functionDeclaration: 'function() { ' + cmd + ' }',
      args: []
    }
  });
  console.log('Connected, sending:', msg);
  ws.send(msg);
});

ws.on('message', (data) => {
  console.log('Response:', data.toString());
  done = true;
  ws.close();
});

ws.on('error', (e) => {
  console.log('WS Error:', e.message);
});

ws.on('close', () => {
  if (!done) console.log('Connection closed without response');
  process.exit(0);
});

setTimeout(() => {
  console.log('5s timeout');
  ws.close();
}, 5000);
