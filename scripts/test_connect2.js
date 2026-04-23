const { launcher } = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator/out/index');

async function main() {
  const wsEndpoint = 'ws://127.0.0.1:9422';
  console.log('Connecting to:', wsEndpoint);

  try {
    const miniProgram = await Promise.race([
      launcher.connect({ wsEndpoint }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 15s')), 15000))
    ]);
    console.log('Connected!');
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(miniProgram));
    console.log('Methods:', proto.join(', '));

    // Take screenshot
    try {
      const result = await miniProgram.screenshot({ path: 'C:\\ClaudeCodeProjects\\StarGame\\docs\\qa\\sprint2-mini-evidence\\auto-01.png' });
      console.log('Screenshot done:', result);
    } catch(e) {
      console.log('screenshot error:', e.message);
    }

    await miniProgram.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
