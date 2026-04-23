const WebSocket = require('ws');

const ports = [32123, 27363, 33019];

for (const port of ports) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  ws.on('open', () => {
    console.log(`Port ${port}: Connected!`);
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1+1' } }));
    ws.send(JSON.stringify({ id: 2, method: 'Browser.getVersion' }));
  });
  ws.on('message', (d) => console.log(`Port ${port} MSG:`, d.toString().substring(0, 200)));
  ws.on('error', e => console.log(`Port ${port} Error:`, e.message.substring(0, 100)));
  ws.on('close', () => console.log(`Port ${port} Closed`));
}
setTimeout(() => process.exit(0), 5000);
