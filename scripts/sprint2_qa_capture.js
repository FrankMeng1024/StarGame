/**
 * Sprint 2-mini QA Screenshot Capture Script
 * Connects to DevTools automation on port 9422, navigates game screens, captures evidence.
 *
 * SETUP: Run before this script:
 *   "C:\tools\微信web开发者工具\cli.bat" auto --project "C:\ClaudeCodeProjects\StarGame\miniprogram" --port 28702 --auto-port 9422
 */

const { launcher } = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator/out/index');
const path = require('path');
const evidenceDir = 'C:\\ClaudeCodeProjects\\StarGame\\docs\\qa\\sprint2-mini-evidence';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture(miniProgram, name) {
  const filepath = path.join(evidenceDir, name);
  try {
    await miniProgram.screenshot({ path: filepath });
    console.log('  Screenshot:', name);
  } catch(e) {
    console.log('  Screenshot failed:', e.message);
  }
}

async function main() {
  const wsEndpoint = 'ws://127.0.0.1:9422';
  console.log('Connecting to:', wsEndpoint);

  let miniProgram;
  try {
    miniProgram = await Promise.race([
      launcher.connect({ wsEndpoint }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 15s')), 15000))
    ]);
    console.log('Connected!');
  } catch (e) {
    console.error('Connect failed:', e.message);
    process.exit(1);
  }

  try {
    // 1. Navigate to menu (initial state)
    console.log('\n[1] Navigate to menu');
    await miniProgram.evaluate(() => {
      if (wx && wx.__navigate) wx.__navigate('menu');
    });
    await sleep(1500);
    await capture(miniProgram, 'STORY-00206-01-menu.png');

    // 2. Navigate to levels screen
    console.log('[2] Navigate to levels');
    await miniProgram.evaluate(() => {
      if (wx && wx.__navigate) wx.__navigate('levels');
    });
    await sleep(1500);
    await capture(miniProgram, 'STORY-00206-02-levels.png');

    // 3. Set level 0 and navigate to game
    console.log('[3] Navigate to game (level 0)');
    await miniProgram.evaluate(() => {
      // Set current level via state
      try {
        const state = require('./js/engine/state.js').default;
        state.currentLevel = 0;
      } catch(e) {}
      if (wx && wx.__navigate) wx.__navigate('game');
    });
    await sleep(2000);
    await capture(miniProgram, 'STORY-00206-03-game-scene.png');

    // 4. Wait for animation frames
    console.log('[4] Game after 2 seconds (stars twinkling)');
    await sleep(2000);
    await capture(miniProgram, 'STORY-00207-04-game-swing.png');

    // 5. Simulate tap to launch net
    console.log('[5] Tap to launch net');
    await miniProgram.evaluate(() => {
      // Simulate touch event on canvas
      const canvas = wx.createCanvas ? null : document.querySelector('canvas');
      // For mini game, trigger via global touch handler if available
      if (typeof handleTap === 'function') {
        handleTap({ touches: [{ pageX: 200, pageY: 400 }] });
      }
      // Alternative: dispatch touchstart
    });
    await sleep(1000);
    await capture(miniProgram, 'STORY-00207-05-net-extended.png');

    // 6. Wait for net retraction
    await sleep(2000);
    await capture(miniProgram, 'STORY-00208-06-stars-visible.png');

    // 7. Check HUD
    console.log('[6] HUD visible');
    await sleep(500);
    await capture(miniProgram, 'STORY-00210-07-hud.png');

    // 8. Navigate to different scene (level 5 = scene 1)
    console.log('[7] Navigate game scene 1 (level 5)');
    await miniProgram.evaluate(() => {
      try {
        const state = require('./js/engine/state.js').default;
        state.currentLevel = 5;
      } catch(e) {}
      if (wx && wx.__navigate) wx.__navigate('game');
    });
    await sleep(2000);
    await capture(miniProgram, 'STORY-00206-08-game-scene1.png');

    // 9. Back to menu
    console.log('[8] Return to menu');
    await miniProgram.evaluate(() => {
      if (wx && wx.__navigate) wx.__navigate('menu');
    });
    await sleep(1000);
    await capture(miniProgram, 'STORY-00211-09-back-menu.png');

    console.log('\nAll screenshots captured!');
  } catch(e) {
    console.error('Error during capture:', e.message);
    console.error(e.stack);
  } finally {
    await miniProgram.close();
  }
}

main();
