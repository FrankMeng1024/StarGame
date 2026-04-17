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
    G.SAFE_TOP    = safeArea.top    || 0;
    G.SAFE_BOTTOM = h - (safeArea.bottom || h);
    G.SAFE_LEFT   = safeArea.left   || 0;
    G.SAFE_RIGHT  = w - (safeArea.right  || w);
  }
}
