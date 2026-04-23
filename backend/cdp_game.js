const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:46990');

ws.on('open', () => {
  console.log('Connected to WeChat CDP!');
  
  // WeChat DevTools uses specific WXD protocol
  // Try sending a WXMLDOM or AppService message
  
  const methods = [
    // Standard CDP
    { id: 1, method: 'Runtime.enable' },
    { id: 2, method: 'Runtime.evaluate', params: { expression: '(function(){try{return JSON.stringify({screen: typeof _currentScreen !== "undefined" ? _currentScreen : "unknown", navigate: typeof navigate !== "undefined"})}catch(e){return "err:"+e.message}})()' } },
    // WeChat-specific
    { id: 3, method: 'WxDebug.enable' },
    { id: 4, method: 'WxDebug.getAppConfig' },
    // Try calling wx.navigateTo simulation
    { id: 5, method: 'App.callFunction', params: { name: 'getSystemInfo' } },
  ];
  
  for (const msg of methods) {
    ws.send(JSON.stringify(msg));
  }
});

ws.on('message', (data) => {
  const s = data.toString();
  console.log('MSG:', s.substring(0, 500));
});

ws.on('error', e => console.log('Error:', e.message));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));

setTimeout(() => { ws.close(); process.exit(0); }, 5000);
