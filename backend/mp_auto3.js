const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function main() {
  const ports = [6655, 17652, 24687, 32123, 44493];
  for (const port of ports) {
    console.log(`Trying port ${port}...`);
    try {
      const miniProgram = await automator.connect({
        wsEndpoint: `ws://127.0.0.1:${port}`,
        reconnectInterval: 500,
        reconnectTotal: 2,
      });
      console.log(`SUCCESS on port ${port}!`);
      // Try screenshot
      try {
        const result = await miniProgram.screenshot({ path: `C:\tmp\mp_shot_${port}.png` });
        console.log('Screenshot:', result);
      } catch(e2) {
        console.log('Screenshot error:', e2.message);
      }
      await miniProgram.close();
      return;
    } catch(e) {
      console.log(`  Failed: ${e.message.substring(0, 80)}`);
    }
  }
}

main().catch(console.error);
