const automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');

async function withTimeout(promise, ms, name) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout: ' + name + ' after ' + ms + 'ms')), ms);
        promise.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
    });
}

async function main() {
    try {
        console.log('Connecting to ws://localhost:9420...');
        const mp = await withTimeout(automator.connect({ wsEndpoint: 'ws://localhost:9420' }), 5000, 'connect');
        console.log('Connected!');
        
        // Try reLaunch with timeout
        try {
            await withTimeout(mp.reLaunch({ url: 'game' }), 10000, 'reLaunch');
            console.log('reLaunch success');
        } catch(e) {
            console.log('reLaunch result:', e.message);
        }
        
        console.log('Done');
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

main();
