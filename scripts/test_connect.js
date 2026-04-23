const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');
async function main() {
    try {
        console.log('Connecting to ws://localhost:9420...');
        const mp = await automator.connect({
            wsEndpoint: 'ws://localhost:9420'
        });
        console.log('Connected!');
        console.log('Checking version...');
        // For mini games, captureScreenshot won't work but we can try
        // Try to reload the game
        try {
            await mp.reLaunch({ url: 'game' });
            console.log('reLaunch called');
        } catch(e) {
            console.log('reLaunch error:', e.message);
        }
        console.log('Done');
        process.exit(0);
    } catch(e) {
        console.error('Connect error:', e.message);
        process.exit(1);
    }
}
main();
