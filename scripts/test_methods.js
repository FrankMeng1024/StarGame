/**
 * Test what methods work on mini game
 */
const { launcher } = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator/out/index');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  let miniProgram;
  try {
    miniProgram = await Promise.race([
      launcher.connect({ wsEndpoint: 'ws://127.0.0.1:9422' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    console.log('Connected!');
  } catch(e) {
    console.error('Connect failed:', e.message);
    process.exit(1);
  }

  // Test screenshot first (10s timeout per op)
  const ops = [
    ['screenshot', () => miniProgram.screenshot({ path: 'C:\\ClaudeCodeProjects\\StarGame\\docs\\qa\\sprint2-mini-evidence\\test-screenshot.png' })],
    ['systemInfo', () => miniProgram.systemInfo()],
  ];

  for (const [name, fn] of ops) {
    try {
      console.log(`Testing ${name}...`);
      const result = await Promise.race([fn(), new Promise((_, r) => setTimeout(() => r(new Error('op timeout 8s')), 8000))]);
      console.log(`  ${name}: OK`, typeof result === 'object' ? JSON.stringify(result).substring(0, 100) : result);
    } catch(e) {
      console.log(`  ${name}: FAILED - ${e.message}`);
    }
  }

  await miniProgram.close();
}

main();
