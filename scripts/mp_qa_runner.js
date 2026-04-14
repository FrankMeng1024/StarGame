#!/usr/bin/env node
/**
 * mp_qa_runner.js — miniprogram-automator QA runner
 *
 * Usage:
 *   node scripts/mp_qa_runner.js --smoke
 *   node scripts/mp_qa_runner.js --story STORY-00203
 *   node scripts/mp_qa_runner.js --screenshot docs/qa/sprint1-mini-evidence/manual-01.png
 *
 * Exit codes:
 *   0 = success
 *   1 = failure / error
 *
 * Requires: miniprogram-automator (npm install -g miniprogram-automator)
 * Requires: WeChat DevTools installed at path in TECH_SPEC §devtools-path
 */

const path = require('path');
const fs = require('fs');

// ─── Config ──────────────────────────────────────────────────────────────────

const DEVTOOLS_CLI = process.env.WX_DEVTOOLS_CLI ||
  'C:\\tools\\微信web开发者工具\\cli.bat';

const MINIPROGRAM_PATH = path.resolve(__dirname, '../miniprogram');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, filePath) {
  ensureDir(path.dirname(filePath));
  const buffer = await page.screenshot();
  fs.writeFileSync(filePath, buffer);
  console.log(`[screenshot] ${filePath}`);
}

async function getLogErrors(page) {
  const logs = await page.getLogList();
  return logs.filter(l => l.level === 'error' || l.level === 'warn');
}

function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

async function smokeTest(miniProgram) {
  console.log('[smoke] starting happy path...');
  const evidenceDir = path.join(PROJECT_ROOT, 'docs/qa/sprint1-mini-evidence');
  ensureDir(evidenceDir);

  const page = miniProgram.currentPage();

  // Step 1: Main menu visible
  await waitMs(1500); // wait for canvas render
  await saveScreenshot(page, path.join(evidenceDir, 'smoke-01-menu.png'));

  let errors = await getLogErrors(page);
  if (errors.length > 0) {
    console.error('[smoke] console errors on menu:', errors);
    return false;
  }

  // Step 2: Navigate to levels
  // Find canvas center and tap the [挑战关卡] button area (approx y: 55% of screen)
  const info = await miniProgram.callWxMethod('getSystemInfo');
  const w = info.windowWidth;
  const h = info.windowHeight;

  await page.tap({ x: w / 2, y: h * 0.55 }); // [挑战关卡] button
  await waitMs(800);
  await saveScreenshot(page, path.join(evidenceDir, 'smoke-02-levels.png'));

  errors = await getLogErrors(page);
  if (errors.length > 0) {
    console.error('[smoke] console errors on levels:', errors);
    return false;
  }

  console.log('[smoke] PASS');
  return true;
}

async function storyTest(miniProgram, storyId) {
  const sprintMatch = storyId.match(/STORY-002(\d+)/);
  const sprint = sprintMatch ? '1' : '1';
  const evidenceDir = path.join(PROJECT_ROOT, `docs/qa/sprint${sprint}-mini-evidence`);
  ensureDir(evidenceDir);

  const page = miniProgram.currentPage();
  await waitMs(1000);
  await saveScreenshot(page, path.join(evidenceDir, `${storyId}-01-initial.png`));

  const errors = await getLogErrors(page);
  const consoleOut = path.join(evidenceDir, `${storyId}-console.json`);
  fs.writeFileSync(consoleOut, JSON.stringify(errors, null, 2));

  if (errors.length > 0) {
    console.warn(`[${storyId}] ${errors.length} console error(s) — see ${consoleOut}`);
  }

  console.log(`[${storyId}] screenshot saved, console log saved`);
  return errors.length === 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0]; // --smoke | --story | --screenshot

  // Check miniprogram-automator available
  let automator;
  try {
    automator = require('miniprogram-automator');
  } catch (e) {
    // Try global path fallback
    try {
      automator = require('C:/Users/I585134/AppData/Roaming/npm/node_modules/miniprogram-automator');
    } catch (e2) {
      console.error('[error] miniprogram-automator not installed.');
      console.error('  Run: npm install -g miniprogram-automator');
      process.exit(1);
    }
  }

  // Check DevTools CLI exists
  if (!fs.existsSync(DEVTOOLS_CLI)) {
    console.error(`[error] WeChat DevTools CLI not found at: ${DEVTOOLS_CLI}`);
    console.error('  Update DEVTOOLS_CLI in this script or set WX_DEVTOOLS_CLI env var.');
    process.exit(1);
  }

  console.log('[runner] connecting to WeChat DevTools...');
  console.log(`[runner] miniprogram path: ${MINIPROGRAM_PATH}`);

  let miniProgram;
  try {
    miniProgram = await automator.launch({
      cliPath: DEVTOOLS_CLI,
      projectPath: MINIPROGRAM_PATH,
    });
  } catch (e) {
    console.error('[error] failed to launch/connect to DevTools:', e.message);
    console.error('  Ensure WeChat DevTools is installed and the project is opened.');
    process.exit(1);
  }

  let success = false;

  try {
    if (mode === '--smoke') {
      success = await smokeTest(miniProgram);
    } else if (mode === '--story') {
      const storyId = args[1];
      if (!storyId) { console.error('Usage: --story STORY-NNNNN'); process.exit(1); }
      success = await storyTest(miniProgram, storyId);
    } else if (mode === '--screenshot') {
      const outPath = args[1] || 'docs/qa/manual-screenshot.png';
      const page = miniProgram.currentPage();
      await waitMs(500);
      await saveScreenshot(page, path.resolve(PROJECT_ROOT, outPath));
      success = true;
    } else {
      console.error('Usage: mp_qa_runner.js --smoke | --story STORY-NNNNN | --screenshot [path]');
      process.exit(1);
    }
  } finally {
    await miniProgram.close();
  }

  process.exit(success ? 0 : 1);
}

main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
