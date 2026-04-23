const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function tryConnect(port) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
    try {
      const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
      clearTimeout(timeout);
      resolve(mp);
    } catch(e) {
      clearTimeout(timeout);
      reject(e);
    }
  });
}

async function main() {
  for (const port of [27283, 24687, 32123]) {
    console.log(`Trying ${port}...`);
    try {
      const mp = await tryConnect(port);
      console.log(`SUCCESS on ${port}!`);
      try {
        // For minigame, try callWxMethod
        const result = await mp.callWxMethod('getSystemInfoSync');
        console.log('systemInfo:', JSON.stringify(result).substring(0, 100));
      } catch(e) {
        console.log('callWxMethod failed:', e.message);
      }
      await mp.close();
      return;
    } catch(e) {
      console.log(`  ${e.message.substring(0, 60)}`);
    }
  }
}

main();
