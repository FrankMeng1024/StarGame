const WebSocket = require('ws');

// Connect to port 46990 (the game simulator connects here)
const ws = new WebSocket('ws://127.0.0.1:46990');

ws.on('open', () => {
  console.log('Connected!');
  
  // The WeChat mini game uses WxDebug protocol
  // Let's try calling the game's navigate function
  const calls = [
    { id: 1, method: 'WxDebug.enable', params: {} },
    { id: 2, method: 'WxDebug.appReady' },
    { id: 3, method: 'Runtime.callFunctionOn', params: {
      functionDeclaration: 'function() { return typeof navigate; }',
      objectId: '{"injectedScriptId":1,"id":1}'
    }},
    // Try to call navigate directly
    { id: 4, method: 'Runtime.evaluate', params: {
      expression: 'JSON.stringify(Object.keys(self || window || {}).slice(0,20))',
      returnByValue: true
    }},
  ];
  
  for (const c of calls) {
    ws.send(JSON.stringify(c));
  }
});

ws.on('message', d => console.log('MSG:', d.toString().substring(0, 300)));
ws.on('error', e => console.log('ERR:', e.message));
setTimeout(() => { ws.close(); process.exit(0); }, 6000);
