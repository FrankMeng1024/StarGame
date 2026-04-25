// globals.js — 全局 Canvas 引用（无任何 import，避免循环依赖）
// 由 app.js 调用 initGlobals() 在启动时注入。
// 所有其他模块从这里 import，不从 app.js import。
//
// 使用对象形式而非 export let，因为微信小游戏 JS 引擎对
// export let live binding 支持不完整——import 端可能拿到初始值 0。

export const G = {
  CANVAS:      null,
  CTX:         null,
  SCREEN_W:    0,
  SCREEN_H:    0,
  SAFE_TOP:    0,   // px from top edge to safe area (notch height)
  SAFE_BOTTOM: 0,   // px from bottom edge to safe area (home indicator height)
  SAFE_LEFT:   0,   // px from left edge (usually 0 in portrait)
  SAFE_RIGHT:  0,   // px from right edge (usually 0 in portrait)
  DPR:         1,   // device pixel ratio — stored for reference only; canvas and touch coords both use CSS pixels, no DPR scaling needed (STORY-00269)
};

/**
 * 跨平台触摸事件工具
 * DevTools: canvas.addEventListener 有效，wx.onTouch* 无效
 * 真机 iOS: canvas.addEventListener 无效，wx.onTouch* 有效
 * 方案：双注册 + 50ms 去重，防止两套都响应时回调执行两次
 */
const _touchLastFired = new Map();
function _normTouches(e) {
  // DOM TouchEvent (canvas.addEventListener) uses clientX/clientY measured from
  // the WebView viewport left edge — NOT from the canvas element left edge.
  // WeChat touch events (wx.onTouchStart) use x/y already in canvas coordinates.
  // Convert DOM clientX/clientY to canvas-space coordinates using getBoundingClientRect.
  let rect = null;
  if (G.CANVAS && G.CANVAS.getBoundingClientRect) {
    try { rect = G.CANVAS.getBoundingClientRect(); } catch(e2) {}
  }
  const lists = ['touches', 'changedTouches', 'targetTouches'];
  for (const key of lists) {
    if (e[key]) {
      for (let i = 0; i < e[key].length; i++) {
        const t = e[key][i];
        if (t && t.x == null) {
          if (rect && (rect.width > 0) && (rect.height > 0)) {
            // Scale: canvas.width/rect.width accounts for CSS zoom scaling
            const scaleX = G.SCREEN_W / rect.width;
            const scaleY = G.SCREEN_H / rect.height;
            t.x = (t.clientX - rect.left) * scaleX;
            t.y = (t.clientY - rect.top)  * scaleY;
          } else {
            t.x = t.clientX;
            t.y = t.clientY;
          }
        }
      }
    }
  }
}
function _wrapDedup(fn) {
  const wrapped = function(e) {
    const now = Date.now();
    const last = _touchLastFired.get(fn) || 0;
    if (now - last < 16) return;  // STORY-00404: 16ms (one frame) prevents dual-source double-fire; 50ms was swallowing legitimate sequential button taps
    _touchLastFired.set(fn, now);
    _normTouches(e);
    fn(e);
  };
  // 存反向映射，off 时能找到 wrapped 函数
  _wrapDedup._map = _wrapDedup._map || new Map();
  _wrapDedup._map.set(fn, wrapped);
  return wrapped;
}

export function onTouch(type, fn) {
  const wrapped = _wrapDedup(fn);
  if (type === 'start') {
    wx.onTouchStart(wrapped);
    try { G.CANVAS && G.CANVAS.addEventListener('touchstart', wrapped); } catch(e) {}
  } else if (type === 'move') {
    wx.onTouchMove(wrapped);
    try { G.CANVAS && G.CANVAS.addEventListener('touchmove', wrapped); } catch(e) {}
  } else if (type === 'end') {
    wx.onTouchEnd(wrapped);
    try { G.CANVAS && G.CANVAS.addEventListener('touchend', wrapped); } catch(e) {}
  }
}

export function offTouch(type, fn) {
  const wrapped = (_wrapDedup._map || new Map()).get(fn) || fn;
  if (type === 'start') {
    wx.offTouchStart(wrapped);
    try { G.CANVAS && G.CANVAS.removeEventListener('touchstart', wrapped); } catch(e) {}
  } else if (type === 'move') {
    wx.offTouchMove(wrapped);
    try { G.CANVAS && G.CANVAS.removeEventListener('touchmove', wrapped); } catch(e) {}
  } else if (type === 'end') {
    wx.offTouchEnd(wrapped);
    try { G.CANVAS && G.CANVAS.removeEventListener('touchend', wrapped); } catch(e) {}
  }
  if (_wrapDedup._map) _wrapDedup._map.delete(fn);
  _touchLastFired.delete(fn);
}

/**
 * @param {object} [safeArea] — wx.getSystemInfoSync().safeArea
 *   { top, left, bottom, right, width, height } all in px
 *   Falls back gracefully if undefined (older wx SDK).
 */
export function initGlobals(canvas, ctx, w, h, safeArea, dpr) {
  G.CANVAS   = canvas;
  G.CTX      = ctx;
  G.SCREEN_W = w;
  G.SCREEN_H = h;
  G.DPR      = dpr || 1;
  if (safeArea) {
    // Guard against DevTools passing portrait-mode safeArea when game is in landscape.
    // safeArea.right can equal portrait-width (h) instead of landscape-width (w),
    // causing SAFE_RIGHT = w - h ≈ 454 which breaks button layout. Clamp to [0, w/4].
    G.SAFE_TOP    = Math.max(0, Math.min(safeArea.top    || 0, h / 4));
    G.SAFE_BOTTOM = Math.max(0, Math.min(h - (safeArea.bottom || h), h / 4));
    G.SAFE_LEFT   = Math.max(0, Math.min(safeArea.left   || 0, w / 4));
    G.SAFE_RIGHT  = Math.max(0, Math.min(w - (safeArea.right  || w), w / 4));
  }
}
