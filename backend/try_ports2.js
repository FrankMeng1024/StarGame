const WebSocket = require('ws');
const ports = [6655, 13328, 15236, 17652, 30670, 49669, 49670, 49792, 55067, 61981, 62522];

async function tryPort(port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => {
      console.log(`PORT ${port}: Connected!`);
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '"ping"' } }));
      setTimeout(() => { ws.close(); resolve(port); }, 2000);
    });
    ws.on('message', d => console.log(`PORT ${port}: ${d.toString().substring(0,200)}`));
    ws.on('error', e => resolve(null));
    ws.on('close', () => resolve(null));
  });
}

(async () => {
  for (const p of ports) await tryPort(p);
  process.exit(0);
})();
