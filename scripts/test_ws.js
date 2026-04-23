const WebSocket = require('ws');

const ports = [32123, 45394, 65152, 28702];

async function tryConnect(port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const timer = setTimeout(() => {
      ws.terminate();
      resolve({ port, result: 'timeout' });
    }, 2000);
    ws.on('open', () => {
      clearTimeout(timer);
      resolve({ port, result: 'connected' });
      ws.close();
    });
    ws.on('error', (e) => {
      clearTimeout(timer);
      resolve({ port, result: 'error: ' + e.message.split('\n')[0] });
    });
    ws.on('message', (data) => {
      console.log(`Port ${port} message:`, data.toString().substring(0, 200));
    });
  });
}

async function main() {
  // Check if ws module is available
  try {
    require('ws');
  } catch(e) {
    console.log('ws not available, using http check instead');
    const http = require('http');
    for (const port of ports) {
      await new Promise(resolve => {
        const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`Port ${port}: HTTP ${res.statusCode}`);
            resolve();
          });
        });
        req.on('error', e => {
          console.log(`Port ${port}: error ${e.message}`);
          resolve();
        });
        setTimeout(() => { req.destroy(); resolve(); }, 2000);
      });
    }
    return;
  }
  
  for (const port of ports) {
    const result = await tryConnect(port);
    console.log(`Port ${result.port}: ${result.result}`);
  }
}

main();
