/**
 * Try to use wx.__navigate and clear stars via automation WS
 * Port 9423 (cli.bat auto --auto-port 9423)
 */
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9423');
const TIMEOUT = 5000;

let id = 1;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    const timeout = setTimeout(() => reject(new Error(`timeout: ${method}`)), TIMEOUT);
    const onMsg = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === msgId) {
        clearTimeout(timeout);
        ws.removeListener('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('open', async () => {
  console.log('WS connected');
  try {
    // Try Tool.getInfo first
    const info = await send('Tool.getInfo', {});
    console.log('Tool.getInfo:', JSON.stringify(info.result));

    // Try App.evaluate to clear all stars (make all caught)
    const evalResult = await send('App.evaluate', {
      expression: `
        // Try to trigger victory by setting all stars as caught
        (function() {
          try {
            return 'evaluate works';
          } catch(e) {
            return 'error: ' + e.message;
          }
        })()
      `
    });
    console.log('App.evaluate:', JSON.stringify(evalResult));
  } catch (e) {
    console.log('Error:', e.message);
  }
  ws.close();
});

ws.on('error', (e) => {
  console.log('WS error:', e.message);
});
