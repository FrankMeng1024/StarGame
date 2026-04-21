// game.js — 微信小游戏入口
// 负责：wx.login 静默登录 → 获取 openid → 加载云端存档 → 启动主菜单
// STORY-00347: 修复扫码黑屏 — wx.onShow 延迟启动 + 加长 canvas 就绪等待

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

// 全局 Canvas
const canvas = wx.createCanvas();
const ctx    = canvas.getContext('2d');

// ── 获取屏幕尺寸 — 横屏时 windowWidth > windowHeight ──────────
function _getScreenSize() {
  const si = wx.getSystemInfoSync();
  let w = si.windowWidth  || si.screenWidth  || 667;
  let h = si.windowHeight || si.screenHeight || 375;
  // 小游戏横屏：如果系统尚未旋转，w/h 可能对调，强制修正
  if (w < h) { const tmp = w; w = h; h = tmp; }
  return { w, h, safeArea: si.safeArea, dpr: si.pixelRatio || 1 };
}

const { w: screenW, h: screenH, safeArea, dpr } = _getScreenSize();
canvas.width  = screenW;
canvas.height = screenH;
initGlobals(canvas, ctx, screenW, screenH, safeArea, dpr);

// 全局状态
let gameState   = null;
let _booted     = false;  // 防止多次 boot

// ── 导航路由 ──────────────────────────────────────────────────
let _lastNavTime = 0;
function navigate(key) {
  const now = Date.now();
  if (now - _lastNavTime < 100) return;
  _lastNavTime = now;

  hideMenu(); hideLevels(); hideGame();
  hideGallery(); hideShop(); hideAchievement(); hideIntro();

  switch (key) {
    case 'intro':       showIntro(navigate);       break;
    case 'menu':        showMenu(navigate);         break;
    case 'levels':
      _lastNavTime = 0;
      showLevels(navigate);
      break;
    case 'game':        showGame(navigate);         break;
    case 'gallery':     showGallery(navigate);      break;
    case 'shop':        showShop(navigate);         break;
    case 'achievement': showAchievement(navigate);  break;
    default:            showMenu(navigate);
  }
}

// ── 启动逻辑 ──────────────────────────────────────────────────
async function boot() {
  if (_booted) return;
  _booted = true;

  // 本地存档同步加载
  const localSave = StorageAdapter.loadSaveLocal();
  state.fromSaveData(localSave);
  gameState = state;

  wx.__navigate = navigate;  // DevTools 控制台后门

  // 确保 canvas 尺寸就绪 — 扫码冷启动时需更多帧（最多等 30 帧 ≈ 500ms）
  // STORY-00347: 从5帧扩展到30帧，覆盖低端机扫码慢启动场景
  let attempts = 0;
  function _tryStart() {
    attempts++;
    // 每次尝试都重新拿一下尺寸（防止横屏切换未就绪）
    const { w, h, safeArea: sa, dpr: dp } = _getScreenSize();
    if (w > 0 && h > 0) {
      canvas.width  = w;
      canvas.height = h;
      initGlobals(canvas, ctx, w, h, sa, dp);
    }
    if ((canvas.width === 0 || canvas.height === 0) && attempts < 30) {
      requestAnimationFrame(_tryStart);
      return;
    }
    // 最终强制赋值
    if (canvas.width === 0)  canvas.width  = screenW;
    if (canvas.height === 0) canvas.height = screenH;
    console.log('[boot] canvas:', canvas.width, 'x', canvas.height, 'attempts:', attempts);
    navigate('intro');
  }
  requestAnimationFrame(_tryStart);

  // 后台异步：登录 + 云端存档（不阻塞UI）
  try {
    await AuthManager.login();
    const saveData = await StorageAdapter.loadSave();
    state.mergeFromCloudData(saveData);
  } catch (e) {
    console.warn('[boot] sync failed, offline mode:', e.message);
  }
}

// ── STORY-00347: wx.onShow 确保扫码冷启动也能触发 boot ────────
// 微信扫码启动时，某些设备 game.js 执行时渲染层还未就绪。
// wx.onShow 在渲染层真正激活后才触发，是最可靠的启动时机。
let _onShowFired = false;
wx.onShow(() => {
  _onShowFired = true;
  if (!_booted) {
    // 扫码冷启动：boot() 还未执行，从 onShow 触发
    boot();
  } else {
    // 从后台切回：canvas 可能失效，重新初始化尺寸
    const { w, h, safeArea: sa, dpr: dp } = _getScreenSize();
    if (w > 0 && h > 0) {
      canvas.width  = w;
      canvas.height = h;
      initGlobals(canvas, ctx, w, h, sa, dp);
    }
  }
});

// 立即尝试启动（正常点击启动路径）
// 如果 onShow 先于 boot() 完成会被 _booted flag 保护不重复执行
boot();
