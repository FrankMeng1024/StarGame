const automator = require('miniprogram-automator');

async function main() {
  try {
    const miniProgram = await automator.connect({
      wsEndpoint: 'ws://127.0.0.1:46990',
    });
    console.log('Connected via miniprogram-automator!');
    
    // Try to evaluate
    const result = await miniProgram.evaluate('typeof wx');
    console.log('wx type:', result);
    
    await miniProgram.disconnect();
  } catch (e) {
    console.log('Error:', e.message);
    
    // Try with IDE path
    try {
      const miniProgram2 = await automator.launch({
        projectPath: 'C:\ClaudeCodeProjects\StarGame\miniprogram',
        port: 9420,
      });
      console.log('Launched!');
      await miniProgram2.disconnect();
    } catch (e2) {
      console.log('Launch error:', e2.message);
    }
  }
}

main().catch(console.error);
