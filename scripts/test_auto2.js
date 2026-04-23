const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');
async function main() {
    // Try port 24773 - new port that appeared after auto enable
    const ports = [24773, 42417, 9001];
    for (const port of ports) {
        try {
            console.log('Trying port', port);
            const mp = await automator.connect({
                wsEndpoint: 'ws://localhost:' + port,
                connectionTimeout: 3000
            });
            console.log('Connected on port', port);
            process.exit(0);
        } catch(e) {
            console.log('Failed port', port, ':', e.message.substring(0, 60));
        }
    }
}
main();
