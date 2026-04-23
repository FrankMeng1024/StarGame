const WebSocket = require('ws');

// Connect to the DevTools automation WebSocket
const ws = new WebSocket('ws://127.0.0.1:9420');
let msgId = 1;

function send(method, params) {
  const id = msgId++;
  const msg = JSON.stringify({ id, method, params: params || {} });
  ws.send(msg);
  return id;
}

ws.on('open', () => {
  console.log('Connected to DevTools WS');
  // Try Page.captureScreenshot
  send('Page.captureScreenshot', { format: 'png' });
});

let responses = {};
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Response:', JSON.stringify(msg).substring(0, 200));
  
  if (msg.result && msg.result.data) {
    const buf = Buffer.from(msg.result.data, 'base64');
    require('fs').writeFileSync('C:/ClaudeCodeProjects/StarGame/docs/qa/sprint26-mini-evidence/cdp-capture-01.png', buf);
    console.log('Saved screenshot!', buf.length, 'bytes');
    ws.close();
  }
  
  if (msg.error) {
    console.log('CDP Error:', JSON.stringify(msg.error));
    // Try alternative
    if (msg.error.code === -32601) {
      console.log('Method not found, trying Runtime.evaluate with canvas...');
      send('Runtime.evaluate', { 
        expression: 'typeof wx !== "undefined" ? "wx available" : "no wx"' 
      });
    } else {
      ws.close();
    }
  }
});

ws.on('error', (e) => console.error('WS Error:', e.message));
ws.on('close', () => { console.log('Closed'); process.exit(0); });

setTimeout(() => { ws.close(); process.exit(1); }, 5000);
