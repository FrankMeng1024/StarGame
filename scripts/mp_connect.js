const automator = require('miniprogram-automator');

const cliPath = 'C:\\tools\\微信web开发者工具\\cli.bat';
const projectPath = 'C:\\ClaudeCodeProjects\\StarGame\\miniprogram';

async function main() {
  console.log('Connecting to existing DevTools...');
  try {
    const miniProgram = await automator.connect({
      wsEndpoint: 'ws://localhost:9420',
    });
    console.log('Connected to DevTools');

    // Try to get the system info to verify connection
    const info = await miniProgram.systemInfo();
    console.log('SystemInfo:', JSON.stringify(info, null, 2));

    await miniProgram.close();
    console.log('Done');
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
