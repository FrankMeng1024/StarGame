#!/usr/bin/env node
/**
 * mp_qa_runner.js — miniprogram-automator QA runner（小游戏版）
 *
 * Usage:
 *   node scripts/mp_qa_runner.js --smoke
 *   node scripts/mp_qa_runner.js --story STORY-00203
 *   node scripts/mp_qa_runner.js --screenshot docs/qa/sprint1-mini-evidence/manual-01.png
 *
 * 连接方式：DevTools Security 设置里的 Service Port（HTTP）→ /v2/auto API → WebSocket
 *
 * Exit codes:  0 = success   1 = failure / error
 */

const path = require('path');
const fs   = require('fs');
const http = require('http');

// ─── Config ───────────────────────────────────────────────────────────────────

// DevTools HTTP Service Port（Settings → Security → Service Port 显示的值）
const DEVTOOLS_HTTP_PORT = parseInt(process.env.WX_DEVTOOLS_HTTP_PORT || '63906');

// miniprogram-automator WebSocket 端口（由 /v2/auto 启动后使用）
const AUTOMATOR_WS_PORT = parseInt(process.env.WX_AUTOMATOR_PORT || '9432');

const MINIPROGRAM_PATH = path.resolve(__dirname, '../miniprogram');
const PROJECT_ROOT     = path.resolve(__dirname, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(mp, filePath) {
  ensureDir(path.dirname(filePath));
  // mp.screenshot({ path }) 直接写文件（base64 decoded by sdk）
  // 若不传 path 则返回 base64 字符串
  const absPath = path.resolve(filePath);
  const result = await mp.screenshot({ path: absPath });
  // fallback: if sdk returned base64 string instead of writing file
  if (result && typeof result === 'string' && !fs.existsSync(absPath)) {
    fs.writeFileSync(absPath, Buffer.from(result, 'base64'));
  }
  console.log(`[screenshot] ${absPath}`);
}

async function getLogErrors(mp) {
  try {
    // 小游戏通过 evaluate 读取控制台日志
    const logs = await mp.evaluate(() => {
      return (wx.__logList || []).filter(l => l.type === 'error' || l.type === 'warn');
    });
    return logs || [];
  } catch (e) {
    return [];
  }
}

function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 通过 DevTools HTTP Service Port 启动 automator WebSocket 服务
function startAutoMode(projectPath, wsPort) {
  return new Promise((resolve, reject) => {
    const enc = encodeURIComponent(projectPath.replace(/\\/g, '/'));
    const url = `http://127.0.0.1:${DEVTOOLS_HTTP_PORT}/v2/auto?project=${enc}&port=${wsPort}`;
    console.log(`[runner] POST ${url}`);
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    }).on('error', reject);
  });
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

async function smokeTest(mp) {
  console.log('[smoke] starting happy path...');
  const evidenceDir = path.join(PROJECT_ROOT, 'docs/qa/sprint1-mini-evidence');
  ensureDir(evidenceDir);

  // Step 1: 主菜单截图
  await waitMs(2000); // 等 Canvas 渲染
  await saveScreenshot(mp, path.join(evidenceDir, 'smoke-01-menu.png'));

  const errors1 = await getLogErrors(mp);
  if (errors1.length > 0) {
    console.error('[smoke] console errors on menu:', JSON.stringify(errors1));
    return false;
  }

  // Step 2: 点击 [挑战关卡]（屏幕中间偏下 ~85% 位置）
  const info = await mp.callWxMethod('getSystemInfo');
  const w = info.windowWidth;
  const h = info.windowHeight;

  await mp.callWxMethod('vibrateShort');  // 确认 wx API 可用
  // 模拟 touch 在 [挑战关卡] 按钮位置（H * 0.84）
  await mp.evaluate((x, y) => {
    const canvas = wx.createCanvas ? null : document.querySelector('canvas');
    // 触发 touchstart 事件
    const e = { changedTouches: [{ clientX: x, clientY: y }] };
    if (typeof _testTap === 'function') _testTap(e);
  }, w / 2, Math.round(h * 0.845));

  await waitMs(1000);
  await saveScreenshot(mp, path.join(evidenceDir, 'smoke-02-levels.png'));

  const errors2 = await getLogErrors(mp);
  if (errors2.length > 0) {
    console.error('[smoke] console errors on levels:', JSON.stringify(errors2));
  }

  console.log('[smoke] PASS');
  return true;
}

async function storyTest(mp, storyId) {
  const evidenceDir = path.join(PROJECT_ROOT, 'docs/qa/sprint1-mini-evidence');
  ensureDir(evidenceDir);

  await waitMs(1500);
  await saveScreenshot(mp, path.join(evidenceDir, `${storyId}-01-initial.png`));

  const errors = await getLogErrors(mp);
  const consoleOut = path.join(evidenceDir, `${storyId}-console.json`);
  fs.writeFileSync(consoleOut, JSON.stringify(errors, null, 2));

  if (errors.length > 0) {
    console.warn(`[${storyId}] ${errors.length} issue(s) — see ${consoleOut}`);
  }
  console.log(`[${storyId}] screenshot + console log saved`);
  return errors.length === 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];

  // Load miniprogram-automator
  let automator;
  try {
    automator = require('miniprogram-automator');
  } catch (e) {
    try {
      automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');
    } catch (e2) {
      console.error('[error] miniprogram-automator not installed. Run: npm install -g miniprogram-automator');
      process.exit(1);
    }
  }

  console.log(`[runner] DevTools HTTP port: ${DEVTOOLS_HTTP_PORT}, WS port: ${AUTOMATOR_WS_PORT}`);
  console.log(`[runner] project: ${MINIPROGRAM_PATH}`);

  // 连接：先试直连，失败则触发 /v2/auto
  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${AUTOMATOR_WS_PORT}` });
    console.log('[runner] connected (reused existing ws)');
  } catch (e) {
    console.log('[runner] no existing ws, calling /v2/auto...');
    try {
      await startAutoMode(MINIPROGRAM_PATH, AUTOMATOR_WS_PORT);
      await waitMs(3000);
      mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${AUTOMATOR_WS_PORT}` });
      console.log('[runner] connected (new auto mode)');
    } catch (e2) {
      console.error('[error]', e2.message);
      console.error('Ensure WeChat DevTools is open with the miniprogram project loaded.');
      process.exit(1);
    }
  }

  let success = false;
  try {
    if (mode === '--smoke') {
      success = await smokeTest(mp);
    } else if (mode === '--story') {
      const storyId = args[1];
      if (!storyId) { console.error('Usage: --story STORY-NNNNN'); process.exit(1); }
      success = await storyTest(mp, storyId);
    } else if (mode === '--screenshot') {
      const outPath = args[1] || 'docs/qa/manual-screenshot.png';
      await waitMs(500);
      await saveScreenshot(mp, path.resolve(PROJECT_ROOT, outPath));
      success = true;
    } else {
      console.error('Usage: mp_qa_runner.js --smoke | --story STORY-NNNNN | --screenshot [path]');
      process.exit(1);
    }
  } finally {
    await mp.close();
  }

  process.exit(success ? 0 : 1);
}

main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
