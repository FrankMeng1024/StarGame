const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:46990');
let msgId = 1;

function send(method, params) {
  const id = msgId++;
  ws.send(JSON.stringify({ id, method, params: params || {} }));
  return id;
}

ws.on('open', () => {
  console.log('Connected!');
  // First enable runtime
  send('Runtime.enable');
  
  // Then evaluate to check what's running
  setTimeout(() => {
    const id = send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          hasWx: typeof wx !== 'undefined',
          currentScreen: typeof G !== 'undefined' ? 'G exists' : 'no G',
          navigate: typeof navigate !== 'undefined' ? 'yes' : 'no'
        })
      `
    });
    console.log('Sent evaluate id:', id);
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('MSG:', JSON.stringify(msg).substring(0, 300));
});

ws.on('error', e => console.log('Error:', e.message));

setTimeout(() => { ws.close(); process.exit(0); }, 5000);
