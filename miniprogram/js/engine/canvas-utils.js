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
const _bgStars = [];
export function initBgStars(w, h, count = 80) {
  _bgStars.length = 0;
  for (let i = 0; i < count; i++) {
    _bgStars.push({
      x:    Math.random() * w,
      y:    Math.random() * h,
      r:    Math.random() < 0.1 ? 1.4 : Math.random() < 0.3 ? 1.0 : 0.6,
      ph:   Math.random() * TWO_PI,
      spd:  0.3 + Math.random() * 0.8,
      base: 0.2 + Math.random() * 0.5,
      bright: false,
    });
  }
  // Add 6 bright background stars (STORY-00260) — larger with soft glow
  for (let i = 0; i < 6; i++) {
    _bgStars.push({
      x:     Math.random() * w,
      y:     Math.random() * h * 0.6,  // only in upper sky area
      r:     2.0 + Math.random() * 0.8,
      ph:    Math.random() * TWO_PI,
      spd:   0.2 + Math.random() * 0.4,
      base:  0.5 + Math.random() * 0.3,
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
