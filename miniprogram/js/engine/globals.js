// globals.js — 全局 Canvas 引用（无任何 import，避免循环依赖）
// 由 app.js 调用 initGlobals() 在启动时注入。
// 所有其他模块从这里 import，不从 app.js import。

export let CANVAS   = null;
export let CTX      = null;
export let SCREEN_W = 0;
export let SCREEN_H = 0;

export function initGlobals(canvas, ctx, w, h) {
  CANVAS   = canvas;
  CTX      = ctx;
  SCREEN_W = w;
  SCREEN_H = h;
}
