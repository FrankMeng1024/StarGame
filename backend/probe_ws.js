// Try all App.* and Tool.* methods on the WebSocket to find what works
const WebSocket = require('ws');
const WS_URL = 'ws://127.0.0.1:9420';

async function main() {
  const ws = new WebSocket(WS_URL);
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
  console.log('Connected!');

  const allMsgs = [];
  ws.on('message', (d) => {
    const msg = d.toString();
    allMsgs.push(msg);
    console.log('RECV:', msg.slice(0, 300));
  });

  function sendRaw(method, params = {}) {
    const id = 'id_' + method.replace(/\./g, '_');
    ws.send(JSON.stringify({ id, method, params }));
    return id;
  }

  // Test tool-level methods that don't require the App to be a mini program
  const toolMethods = [
    ['Tool.getInfo', {}],
    ['Tool.getTestAccounts', {}],
    ['Tool.getTicket', {}],
    ['App.info', {}],
    ['App.enableLog', {}],
    ['App.getPageStack', {}],
    ['App.getCurrentPage', {}],
    ['App.captureScreenshot', {}],  // This is what screenshot() uses
    ['App.callFunction', { functionDeclaration: '() => "test"', args: [] }],
    ['App.callWxMethod', { method: 'getSystemInfoSync', args: [] }],
  ];

  for (const [method, params] of toolMethods) {
    sendRaw(method, params);
    await new Promise(r => setTimeout(r, 800));
  }

  await new Promise(r => setTimeout(r, 5000));
  ws.close();
  console.log('All done. Received', allMsgs.length, 'messages');
}

main().catch(console.error);
