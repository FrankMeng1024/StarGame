// canvas-utils.js — 小游戏 Canvas 共享绘图工具
// 替代原版 CSS/DOM，所有 UI 均通过这里的函数绘制

const TWO_PI = Math.PI * 2;

// ─── 颜色系统（与原版 CSS 变量一致）────────────────────────────
export const COLORS = {
  skyDeep:    '#0a0e27',
  skyMid:     '#1a1f4e',
  skyHorizon: '#2d1b4e',
  starGold:   '#ffd700',
  starBright: '#fff8e0',
  primary:    '#7c5cbf',
  primaryEnd: '#4a90d9',
  warmLight:  '#f5a623',
  text:       '#e8e8f0',
  text2:      '#9090b8',
  cardBg:     'rgba(26,31,78,0.85)',
  cardBorder: 'rgba(124,92,191,0.4)',
};

// ─── 背景渐变 ─────────────────────────────────────────────────
export function drawSkyBg(ctx, w, h, sky0 = COLORS.skyDeep, sky1 = COLORS.skyMid, sky2 = COLORS.skyHorizon) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,   sky0);
  grad.addColorStop(0.6, sky1);
  grad.addColorStop(1,   sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ─── 星点背景 ─────────────────────────────────────────────────
// Sin-based hash: eliminates diagonal aliasing from linear sequences (STORY-00340)
function _bgHash(n) { return Math.abs((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1); }

const _bgStars = [];
// seed: use Date.now()%100000 for session-unique layout (STORY-00340)
export function initBgStars(w, h, seed = 0) {
  _bgStars.length = 0;
  const s = seed % 100000;
  // Tiny stars (105): r=0.4-0.7, dim independent twinkle
  for (let i = 0; i < 105; i++) {
    _bgStars.push({
      x:    _bgHash(i + s)        * w,
      y:    _bgHash(i + 1000 + s) * h,
      r:    0.4 + _bgHash(i + 2000 + s) * 0.3,
      base: 0.10 + _bgHash(i + 3000 + s) * 0.22,
      ph:   _bgHash(i + 4000 + s) * TWO_PI,
      spd:  0.4 + _bgHash(i + 5000 + s) * 0.8,
      bright: false,
    });
  }
  // Medium stars (45): r=1.0-1.5
  for (let i = 0; i < 45; i++) {
    _bgStars.push({
      x:    _bgHash(i + 200 + s)  * w,
      y:    _bgHash(i + 1200 + s) * h,
      r:    1.0 + _bgHash(i + 2200 + s) * 0.5,
      base: 0.20 + _bgHash(i + 3200 + s) * 0.28,
      ph:   _bgHash(i + 4200 + s) * TWO_PI,
      spd:  0.5 + _bgHash(i + 5200 + s) * 0.7,
      bright: false,
    });
  }
  // Large/bright stars (18): r=1.8-2.6, soft glow (STORY-00260 + STORY-00340)
  for (let i = 0; i < 18; i++) {
    _bgStars.push({
      x:    _bgHash(i + 400 + s)  * w,
      y:    _bgHash(i + 1400 + s) * h * 0.8,  // bias toward upper sky
      r:    1.8 + _bgHash(i + 2400 + s) * 0.8,
      base: 0.48 + _bgHash(i + 3400 + s) * 0.30,
      ph:   _bgHash(i + 4400 + s) * TWO_PI,
      spd:  0.3 + _bgHash(i + 5400 + s) * 0.5,
      bright: true,
    });
  }
}

export function drawBgStars(ctx, t) {
  ctx.save();
  for (const s of _bgStars) {
    const a = s.base + (1 - s.base) * Math.abs(Math.sin(t * s.spd + s.ph));
    ctx.globalAlpha = a;
    if (s.bright) {
      // Bright background star with soft glow (STORY-00260)
      ctx.fillStyle   = '#fff8e0';
      ctx.shadowColor = '#ffffcc';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle   = '#e8e8f8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── 按钮绘制 ─────────────────────────────────────────────────
/**
 * 绘制一个圆角渐变按钮，返回点击区域 {x,y,w,h}
 */
export function drawButton(ctx, x, y, w, h, label, opts = {}) {
  const {
    color0    = COLORS.primary,
    color1    = COLORS.primaryEnd,
    textColor = '#ffffff',
    fontSize  = 18,
    radius    = 14,
    alpha     = 1,
    icon      = '',
  } = opts;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 渐变填充
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, color0);
  grad.addColorStop(1, color1);

  ctx.fillStyle = grad;
  _roundRect(ctx, x, y, w, h, radius);
  ctx.fill();

  // 边框高光
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // 文字
  ctx.globalAlpha = 1;
  ctx.fillStyle   = textColor;
  ctx.font        = `bold ${fontSize}px sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  const text = icon ? `${icon}  ${label}` : label;
  ctx.fillText(text, x + w / 2, y + h / 2);

  ctx.restore();
  return { x, y, w, h };
}

// ─── 标题文字（金色渐变）────────────────────────────────────────
export function drawTitle(ctx, text, cx, cy, fontSize = 42) {
  ctx.save();
  ctx.font        = `bold ${fontSize}px sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  const grad = ctx.createLinearGradient(cx - 100, cy, cx + 100, cy);
  grad.addColorStop(0,   '#ffd700');
  grad.addColorStop(0.5, '#fff8e0');
  grad.addColorStop(1,   '#ffa500');
  ctx.fillStyle  = grad;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 18;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// ─── 副标题 / 说明文字 ───────────────────────────────────────
export function drawSubtitle(ctx, text, cx, cy, fontSize = 14, color = COLORS.text2) {
  ctx.save();
  ctx.font         = `${fontSize}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = color;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// ─── 卡片背景 ────────────────────────────────────────────────
export function drawCard(ctx, x, y, w, h, opts = {}) {
  const { radius = 12, alpha = 0.85 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = COLORS.cardBg;
  _roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();
}

// ─── 点击命中检测 ────────────────────────────────────────────
export function hitTest(rect, tx, ty) {
  return tx >= rect.x && tx <= rect.x + rect.w &&
         ty >= rect.y && ty <= rect.y + rect.h;
}

// ─── 全局淡入/淡出过渡（STORY-00282）────────────────────────
let _fadeAlpha = 0;
let _fadeDir   = 0;  // 0=none, 1=fade-out (→black), -1=fade-in (black→clear)
let _fadeCb    = null;

/**
 * 强制重置淡入淡出状态为透明（解决黑屏：上一次导航残留 _fadeAlpha=1）
 */
export function resetFade() {
  _fadeAlpha = 0;
  _fadeDir   = 0;
  _fadeCb    = null;
}

/**
 * 触发屏幕切换淡入淡出。
 * 先淡出(150ms)→ 执行 cb → 淡入(150ms)。
 */
export function fadeNavigate(cb) {
  _fadeAlpha = 0;
  _fadeDir   = 1;
  _fadeCb    = cb;
}

/**
 * 每帧调用。返回当前 alpha（供调用方判断是否需要 requestAnimationFrame 继续）。
 */
export function tickFade(dt) {
  if (_fadeDir === 0) return;
  const step = dt / 0.15;  // 0→1 in 150ms
  if (_fadeDir === 1) {
    _fadeAlpha = Math.min(1, _fadeAlpha + step);
    if (_fadeAlpha >= 1 && _fadeCb) {
      const cb = _fadeCb;
      _fadeCb = null;
      _fadeDir = -1;
      cb();
    }
  } else if (_fadeDir === -1) {
    _fadeAlpha = Math.max(0, _fadeAlpha - step);
    if (_fadeAlpha <= 0) _fadeDir = 0;
  }
}

/**
 * 在每个屏幕的渲染循环末尾调用，覆盖黑色遮罩。
 */
export function drawFadeOverlay(ctx, w, h) {
  if (_fadeAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = _fadeAlpha;
  ctx.fillStyle   = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── 全局统一 Header 条（CR-137）────────────────────────────────
/**
 * 绘制顶部 header 条，统一所有二级屏幕（shop / levels / gallery）的视觉语言。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W  屏幕宽
 * @param {number} H  屏幕高（未使用，备扩展）
 * @param {string} title  居中标题文字
 * @param {object} opts
 *   opts.safeLeft    {number}  safe area left offset（默认0）
 *   opts.safeTop     {number}  safe area top offset（默认0）
 *   opts.fontLoaded  {boolean} Ma Shan Zheng 是否已加载
 *   opts.rightText   {string}  右侧文字（如金币数量，可选）
 * @returns {{backRect: {x,y,w,h}, headerH: number}}
 */
export function drawHeaderBar(ctx, W, H, title, opts = {}) {
  const safeLeft  = opts.safeLeft  || 0;
  const safeTop   = opts.safeTop   || 0;
  const fontLoaded = opts.fontLoaded || false;
  const rightText  = opts.rightText  || '';

  const headerH = safeTop + 48;

  // Semi-transparent dark strip
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,18,0.72)';
  ctx.fillRect(0, 0, W, headerH);

  // Bottom divider line
  ctx.strokeStyle = 'rgba(160,100,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(W, headerH);
  ctx.stroke();
  ctx.restore();

  // Back button
  const btnX = safeLeft + 96 + 10;
  const btnY = safeTop + 8;
  const btnW = 72;
  const btnH = 32;
  ctx.save();
  ctx.fillStyle = 'rgba(30,16,80,0.85)';
  _roundRect(ctx, btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,220,0.5)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#f0e0ff';
  ctx.fillText('← 返回', btnX + btnW / 2, btnY + btnH / 2);
  ctx.restore();

  // Title
  ctx.save();
  const titleFont = fontLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.font         = `bold 22px ${titleFont}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#e8d5ff';
  ctx.shadowColor  = 'rgba(160,120,255,0.5)';
  ctx.shadowBlur   = 8;
  ctx.fillText(title, W / 2, safeTop + 24);
  ctx.restore();

  // Optional right text
  if (rightText) {
    ctx.save();
    ctx.font         = 'bold 13px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd700';
    ctx.fillText(rightText, W - (opts.safeRight || 0) - 12, safeTop + 24);
    ctx.restore();
  }

  return { backRect: { x: btnX, y: btnY, w: btnW, h: btnH }, headerH };
}

// ─── 星云椭圆辉光（CR-136）— 供 shop/levels/gallery 复用 ─────────
/**
 * 绘制背景星云椭圆列表。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {Array} nebulae  [{xr,yr,rx,ry,col,a}]
 *   xr/yr: 相对于W/H的中心位置；rx/ry: 像素半径；col: 'R,G,B'字符串；a: 最大透明度
 * @param {number} t  时间（秒），用于轻微脉冲
 */
export function drawNebulae(ctx, W, H, nebulae, t) {
  for (const n of nebulae) {
    const nx = n.xr * W;
    const ny = n.yr * H;
    const pulse = 1 + Math.sin((t || 0) * 0.4 + n.xr * 6) * 0.04;
    const rx = n.rx * pulse;
    const ry = n.ry * pulse;
    // Draw ellipse via scale transform + radial gradient
    ctx.save();
    ctx.translate(nx, ny);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0,   `rgba(${n.col},${n.a})`);
    g.addColorStop(0.45, `rgba(${n.col},${n.a * 0.55})`);
    g.addColorStop(1,   `rgba(${n.col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── 内部辅助：圆角矩形 path ──────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
