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
import { showAchievement, hideAchievement } from './js/screens/achievement.js';
import { showIntro, hideIntro } from './js/screens/intro.js';

// 全局 Canvas — 立即初始化 globals（其他模块从 globals.js import，无循环依赖）
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
// canvas.width/height 可能为 0（QR码扫码冷启动时Canvas尚未就绪），用 systemInfo 作为可靠来源
const sysInfo = wx.getSystemInfoSync();
const screenW = sysInfo.windowWidth  || 375;
const screenH = sysInfo.windowHeight || 667;
canvas.width  = screenW;
canvas.height = screenH;
// safeArea: {top, left, bottom, right, width, height} in px — notch + home indicator
// Falls back gracefully on older wx SDK versions where safeArea may be undefined.
initGlobals(canvas, ctx, screenW, screenH, sysInfo.safeArea, sysInfo.pixelRatio || 1);

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
  hideAchievement();
  hideIntro();

  switch (key) {
    case 'intro':
      showIntro(navigate);
      break;
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
    case 'achievement':
      showAchievement(navigate);
      break;
    default:
      showMenu(navigate);
  }
}

async function boot() {
  // 1. 立即从本地存档启动，消除黑屏等待
  // 先用本地存档（同步读取，无网络等待）启动主菜单
  const localSave = StorageAdapter.loadSaveLocal();
  state.fromSaveData(localSave);
  gameState = state;

  // 立刻显示开场动画（不等网络）— 动画结束自动导航到 menu
  // STORY-00276: always play intro on fresh launch — no storage gate
  const startScreen = 'intro';

  // 确保 canvas 尺寸已生效再开始渲染：延迟一帧，防止扫码冷启动黑屏 (STORY-00271)
  requestAnimationFrame(() => {
    // 再次校验 canvas 尺寸（防止极端情况下仍为0）
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width  = screenW;
      canvas.height = screenH;
    }
    navigate(startScreen);
  });

  // 开发后门：挂到 wx 命名空间，DevTools console 可调用 wx.__navigate('levels')
  wx.__navigate = navigate;

  // 2. 后台异步：静默登录 + 云端存档同步（不阻塞UI）
  // 用 merge 而非 fromSaveData，避免覆盖玩家本次会话中的进度
  try {
    await AuthManager.login();
    const saveData = await StorageAdapter.loadSave();
    state.mergeFromCloudData(saveData);
  } catch (e) {
    console.warn('[boot] background sync failed, running offline:', e.message);
  }
}

boot();
