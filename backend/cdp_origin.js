const WebSocket = require('ws');

// Chrome DevTools Protocol requires specific origin
const port = 32123;
const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
  headers: {
    'Origin': `devtools://devtools`
  }
});

ws.on('open', () => {
  console.log(`Port ${port}: Connected!`);
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1+1' } }));
  ws.send(JSON.stringify({ id: 2, method: 'Browser.getVersion' }));
});

ws.on('message', d => console.log('MSG:', d.toString().substring(0, 300)));
ws.on('error', e => console.log('ERR:', e.message));
setTimeout(() => { ws.close(); process.exit(0); }, 3000);
