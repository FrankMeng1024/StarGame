const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');
async function main() {
    try {
        // The CLI auto endpoint returns a token; connect using wsEndpoint
        const mp = await automator.connect({
            wsEndpoint: 'ws://localhost:9420',
        });
        console.log('Connected');
        const pages = await mp.currentPage();
        console.log('Page:', JSON.stringify(pages));
    } catch(e) {
        console.error('Error:', e.message);
    }
}
main();
