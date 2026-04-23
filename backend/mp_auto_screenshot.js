const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function main() {
  console.log('Connecting to WeChat DevTools automation...');
  try {
    const miniProgram = await automator.connect({
      wsEndpoint: 'ws://127.0.0.1:9420',
    });
    console.log('Connected!');
    
    // For miniGame, try screenshot directly
    const shot = await miniProgram.screenshot({
      path: 'C:\tmp\mp_shot.png',
    });
    console.log('Screenshot done:', shot);
    
    await miniProgram.close();
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
