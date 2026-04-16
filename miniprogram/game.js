// app.js — 微信小游戏入口
// 负责：wx.login 静默登录 → 获取 openid → 加载云端存档 → 启动主菜单

import { initGlobals } from './js/engine/globals.js';
import { AuthManager } from './js/platform/auth.js';
import { StorageAdapter } from './js/platform/wx-adapter.js';
import state from './js/engine/state.js';
import { showMenu, hideMenu } from './js/screens/menu.js';
import { showLevels, hideLevels } from './js/screens/levels.js';
import { showGame, hideGame } from './js/screens/game.js';
import { showGallery, hideGallery } from './js/screens/gallery.js';
import { showShop, hideShop } from './js/screens/shop.js';

// 全局 Canvas — 立即初始化 globals（其他模块从 globals.js import，无循环依赖）
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
// canvas.width/height 可能为 0，用 systemInfo 作为可靠来源
const sysInfo = wx.getSystemInfoSync();
const screenW = canvas.width  || sysInfo.windowWidth;
const screenH = canvas.height || sysInfo.windowHeight;
canvas.width  = screenW;
canvas.height = screenH;
// safeArea: {top, left, bottom, right, width, height} in px — notch + home indicator
// Falls back gracefully on older wx SDK versions where safeArea may be undefined.
initGlobals(canvas, ctx, screenW, screenH, sysInfo.safeArea);

// 全局状态（外部只读引用）
let gameState = null;

// ── 导航路由 ──────────────────────────────────────────────────
let _lastNavTime = 0;
function navigate(key) {
  // Debounce: ignore navigate calls within 300ms of each other (prevents double-tap)
  const now = Date.now();
  if (now - _lastNavTime < 300) return;
  _lastNavTime = now;

  // 先全部清理
  hideMenu();
  hideLevels();
  hideGame();
  hideGallery();
  hideShop();

  switch (key) {
    case 'menu':
      showMenu(navigate);
      break;
    case 'levels':
      showLevels(navigate);
      break;
    case 'game':
      showGame(navigate);
      break;
    case 'gallery':
      showGallery(navigate);
      break;
    case 'shop':
      showShop(navigate);
      break;
    default:
      showMenu(navigate);
  }
}

async function boot() {
  // 1. 静默登录 — 获取 openid + JWT token
  try {
    await AuthManager.login();
  } catch (e) {
    console.warn('[boot] login failed, running offline:', e.message);
  }

  // 2. 加载存档（云端优先，本地降级）
  const saveData = await StorageAdapter.loadSave();
  state.fromSaveData(saveData);
  gameState = state;

  // 3. 启动页面 — 开发后门：读取 __initScreen storage key 决定初始屏幕
  // 生产使用时 key 不存在，走正常主菜单
  let startScreen = 'menu';
  try { startScreen = wx.getStorageSync('__initScreen') || 'menu'; } catch (e) {}
  navigate(startScreen);

  // 开发后门：挂到 wx 命名空间，DevTools console 可调用 wx.__navigate('levels')
  wx.__navigate = navigate;
}

boot();
