const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function main() {
  console.log('Connecting to DevTools on port 9420...');
  let miniProgram;
  try {
    miniProgram = await automator.connect({
      wsEndpoint: 'ws://localhost:9420',
    });
    console.log('Connected');

    // Try to relaunch the mini game
    console.log('Relaunching...');
    await miniProgram.reLaunch({
      url: 'game',
    });
    console.log('Relaunched game');

    await new Promise(r => setTimeout(r, 2000));

    await miniProgram.close();
  } catch(e) {
    console.error('Error:', e.message);
    if (miniProgram) {
      try { await miniProgram.close(); } catch(_) {}
    }
    process.exit(1);
  }
}

main();
