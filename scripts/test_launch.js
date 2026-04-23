const { launcher } = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator/out/index');

const projectPath = 'C:\\ClaudeCodeProjects\\StarGame\\miniprogram';
const cliPath = 'C:\\tools\\微信web开发者工具\\cli.bat';

console.log('Project path:', projectPath);

launcher.launch({
  projectPath,
  cliPath,
  port: 9421,
  timeout: 60000,
}).then(async (miniProgram) => {
  console.log('Connected!');
  await miniProgram.close();
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
