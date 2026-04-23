const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function main() {
  console.log('Connecting...');
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  console.log('Connected!');
  
  try {
    // For mini game, try to get canvas data via evaluateCode
    const result = await Promise.race([
      mp.callWxMethod('getSystemInfoSync'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000))
    ]);
    console.log('systemInfo:', JSON.stringify(result).substring(0, 200));
  } catch(e) {
    console.log('callWxMethod error:', e.message);
  }
  
  await mp.disconnect();
}

main().catch(e => { console.log('Fatal:', e.message); process.exit(1); });
