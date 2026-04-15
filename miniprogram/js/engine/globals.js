// globals.js — 全局 Canvas 引用（无任何 import，避免循环依赖）
// 由 app.js 调用 initGlobals() 在启动时注入。
// 所有其他模块从这里 import，不从 app.js import。
//
// 使用对象形式而非 export let，因为微信小游戏 JS 引擎对
// export let live binding 支持不完整——import 端可能拿到初始值 0。

export const G = {
  CANVAS:   null,
  CTX:      null,
  SCREEN_W: 0,
  SCREEN_H: 0,
};

export function initGlobals(canvas, ctx, w, h) {
  G.CANVAS   = canvas;
  G.CTX      = ctx;
  G.SCREEN_W = w;
  G.SCREEN_H = h;
}
