#!/usr/bin/env node
/**
 * mp_qa_runner.js — 微信小游戏 QA runner（mss Python 管道版）
 *
 * Usage:
 *   node scripts/mp_qa_runner.js --smoke [--sprint N]
 *   node scripts/mp_qa_runner.js --story STORY-NNNNN [--sprint N]
 *   node scripts/mp_qa_runner.js --navigate --story SPIKE-002 [--sprint 27]
 *
 * SPIKE-001/002 结论：miniprogram-automator WebSocket 对小游戏无效（timeout）。
 * 本脚本改为调用 Python mss 管道：
 *   - mss_check.py  — Sprint 启动验证（hwnd 发现 + 截图 + 亮度检查）
 *   - mss_navigate.py — 完整 5 步导航截图 + GLM-4V 验证
 *
 * Exit codes:  0 = success   1 = failure / error
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseCLI() {
  const args = process.argv.slice(2);
  const result = { mode: null, sprint: 27, story: null, noGlm: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--smoke')     result.mode = 'smoke';
    if (args[i] === '--navigate')  result.mode = 'navigate';
    if (args[i] === '--story')     result.story = args[++i];
    if (args[i] === '--sprint')    result.sprint = parseInt(args[++i]);
    if (args[i] === '--no-glm')    result.noGlm = true;
  }
  if (!result.mode) result.mode = 'smoke';
  if (!result.story) result.story = `SPIKE-002`;
  return result;
}

function runPython(scriptArgs, description) {
  console.log(`[runner] ${description}`);
  console.log(`[runner] python ${scriptArgs.join(' ')}`);

  const result = spawnSync('python', scriptArgs, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    encoding: 'utf8',
  });

  const exitCode = result.status ?? 1;
  if (result.error) {
    console.error(`[error] Failed to launch Python: ${result.error.message}`);
    return 1;
  }
  return exitCode;
}

// ─── Smoke Test: mss_check.py ─────────────────────────────────────────────────

function smokeTest(sprint) {
  console.log(`\n[smoke] Sprint ${sprint} pipeline check via mss_check.py`);
  const evidenceDir = path.join(PROJECT_ROOT, `docs/qa/sprint${sprint}-evidence`);
  ensureDir(evidenceDir);

  const code = runPython(
    ['scripts/mss_check.py', '--sprint', String(sprint)],
    `mss_check.py --sprint ${sprint}`
  );

  if (code === 0) {
    console.log('[smoke] PASS — screenshot pipeline OK');
  } else {
    console.error('[smoke] FAIL — pipeline error (black screen or hwnd not found)');
  }
  return code === 0;
}

// ─── Navigate Test: mss_navigate.py ───────────────────────────────────────────

function navigateTest(sprint, story, noGlm) {
  console.log(`\n[navigate] Sprint ${sprint} / ${story} via mss_navigate.py`);

  const scriptArgs = ['scripts/mss_navigate.py', '--sprint', String(sprint), '--story', story];
  if (noGlm) scriptArgs.push('--no-glm');

  const code = runPython(scriptArgs, `mss_navigate.py --sprint ${sprint} --story ${story}`);

  if (code === 0) {
    console.log('[navigate] PASS — all navigation steps verified');
  } else {
    console.error('[navigate] FAIL — one or more navigation steps failed');
  }
  return code === 0;
}

// ─── Story Test: smoke + navigate ─────────────────────────────────────────────

function storyTest(sprint, story, noGlm) {
  console.log(`\n[story] ${story} — Sprint ${sprint}`);

  // Step 1: smoke check
  const smokeOk = smokeTest(sprint);
  if (!smokeOk) {
    console.error('[story] FAIL at smoke check — aborting story test');
    return false;
  }

  // Step 2: navigate
  const navOk = navigateTest(sprint, story, noGlm);
  return navOk;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const { mode, sprint, story, noGlm } = parseCLI();

  let success = false;

  if (mode === 'smoke') {
    success = smokeTest(sprint);
  } else if (mode === 'navigate') {
    success = navigateTest(sprint, story, noGlm);
  } else if (mode === 'story') {
    success = storyTest(sprint, story, noGlm);
  } else {
    console.error('Usage: mp_qa_runner.js --smoke | --navigate --story ID | --story ID [--sprint N] [--no-glm]');
    process.exit(1);
  }

  process.exit(success ? 0 : 1);
}

main();
