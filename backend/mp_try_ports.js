const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

const ports = [27363, 29529, 32123, 33019, 46990, 57578];

async function tryPort(port) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({port, result: 'timeout'}), 4000);
    automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` })
      .then(mp => {
        clearTimeout(timeout);
        resolve({port, result: 'connected', mp});
      })
      .catch(e => {
        clearTimeout(timeout);
        resolve({port, result: 'failed: ' + e.message.substring(0, 80)});
      });
  });
}

async function main() {
  for (const port of ports) {
    process.stdout.write(`Port ${port}: `);
    const r = await tryPort(port);
    console.log(r.result);
    if (r.mp) {
      try {
        const info = await r.mp.callWxMethod('getSystemInfoSync');
        console.log('  systemInfo:', JSON.stringify(info).substring(0, 100));
      } catch(e) {
        console.log('  callWxMethod failed:', e.message.substring(0, 60));
      }
      try { await r.mp.close(); } catch(e) {}
      return;
    }
  }
}

main().catch(console.error);
