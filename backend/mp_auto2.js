const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function main() {
  const ports = [9420, 9222, 9229, 5000, 5050, 55952, 64842];
  for (const port of ports) {
    console.log(`Trying port ${port}...`);
    try {
      const miniProgram = await automator.connect({
        wsEndpoint: `ws://127.0.0.1:${port}`,
        reconnectInterval: 1000,
        reconnectTotal: 1,
      });
      console.log(`SUCCESS on port ${port}`);
      await miniProgram.close();
      return;
    } catch(e) {
      console.log(`  Failed: ${e.message.substring(0, 60)}`);
    }
  }
}

main().catch(console.error);
