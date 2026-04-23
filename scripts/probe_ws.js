const WebSocket = require('C:/ClaudeCodeProjects/StarGame/backend/node_modules/ws');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

const ws = new WebSocket('ws://127.0.0.1:9420');
const responses = {};

const send = (method, params = {}) => new Promise((resolve) => {
  const id = uuid();
  responses[id] = resolve;
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => {
    if (responses[id]) {
      delete responses[id];
      resolve({ timeout: true });
    }
  }, 5000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && responses[msg.id]) {
    const resolve = responses[msg.id];
    delete responses[msg.id];
    resolve(msg);
  }
});

ws.on('error', (e) => { console.log('Error:', e.message); process.exit(1); });

ws.on('open', async () => {
  console.log('Connected, probing methods...');
  
  // Try various screenshot-related methods
  const methods = [
    'Tool.screenshot',
    'Tool.captureScreenshot', 
    'App.screenshot',
    'Simulator.screenshot',
    'Simulator.captureScreenshot',
    'Page.screenshot',
    'App.captureScreenshot',  // known to timeout for mini games
  ];
  
  for (const method of methods) {
    console.log(`\nTrying: ${method}`);
    const r = await send(method, {});
    if (r.timeout) {
      console.log('  -> TIMEOUT (no response)');
    } else if (r.error) {
      console.log('  -> ERROR:', r.error.message || JSON.stringify(r.error));
    } else {
      console.log('  -> SUCCESS:', JSON.stringify(r.result).substring(0, 200));
    }
  }
  
  ws.close();
  process.exit(0);
});
