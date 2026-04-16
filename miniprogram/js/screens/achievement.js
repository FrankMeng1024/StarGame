// achievement.js — 全部通关成就页（微信小游戏版）
// 显示30个星座通关网格，金色=已通关，灰色=未解锁

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, hitTest,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../engine/state.js';

// ── Module state ──────────────────────────────────────────────
let _navigate   = null;
let _rafId      = null;
let _backRect   = null;
let _cellRects  = [];
let _scrollY    = 0;
let _scrollTarget = 0;
let _lastTouchY = 0;
let _isDragging = false;
let _totalH     = 0;

// ── Public API ────────────────────────────────────────────────
export function showAchievement(navigate) {
  _navigate = navigate;
  _cleanup();
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  initBgStars(W, H, 50);
  _buildLayout(W, H);
  G.CANVAS.addEventListener('touchstart', _onTouchStart);
  G.CANVAS.addEventListener('touchmove',  _onTouchMove);
  G.CANVAS.addEventListener('touchend',   _onTouchEnd);
  _rafId = requestAnimationFrame(_loop);
}

export function hideAchievement() {
  _cleanup();
}

// ── Layout ────────────────────────────────────────────────────
function _buildLayout(W, H) {
  const isLandscape = W > H;
  const COLS        = isLandscape ? 6 : 5;
  const PAD_X       = 16;
  const PAD_TOP     = G.SAFE_TOP + 56;
  const GAP         = 8;
  const CELL_W      = Math.floor((W - PAD_X * 2 - GAP * (COLS - 1)) / COLS);
  const CELL_H      = CELL_W + 14;
  const rows        = Math.ceil(CONSTELLATIONS.length / COLS);

  _totalH = PAD_TOP + rows * (CELL_H + GAP) + 24 + G.SAFE_BOTTOM;
  _cellRects = [];

  CONSTELLATIONS.forEach((c, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x   = PAD_X + col * (CELL_W + GAP);
    const y   = PAD_TOP + row * (CELL_H + GAP);
    _cellRects.push({ x, y, w: CELL_W, h: CELL_H, idx });
  });
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = (now || 0) * 0.001;

  // Smooth scroll
  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  drawSkyBg(ctx, W, H);
  drawBgStars(ctx, t);

  ctx.save();
  ctx.translate(0, -_scrollY);

  // Title
  ctx.save();
  ctx.font         = `bold 18px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.starGold;
  ctx.fillText('⭐ 星座图鉴', W / 2, G.SAFE_TOP + 28);
  ctx.restore();

  // Count completed
  const completed = CONSTELLATIONS.filter((c, i) => {
    const s = state.getScore(i);
    return s && s.stars > 0;
  }).length;
  ctx.save();
  ctx.font         = `13px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text2;
  ctx.fillText(`已发现 ${completed} / ${CONSTELLATIONS.length} 个星座`, W / 2, G.SAFE_TOP + 46);
  ctx.restore();

  // Grid cells
  for (const cr of _cellRects) {
    _drawCell(ctx, cr);
  }

  ctx.restore();

  // Back button (fixed, not scrolled)
  _backRect = drawButton(ctx, 12, G.SAFE_TOP + 8, 60, 32, '← 返回', {
    fontSize: 12, radius: 8,
    color0: 'rgba(40,50,90,0.85)', color1: 'rgba(30,60,120,0.85)',
  });

  _rafId = requestAnimationFrame(_loop);
}

function _drawCell(ctx, cr) {
  const { x, y, w, h, idx } = cr;
  const c     = CONSTELLATIONS[idx];
  const score = state.getScore(idx);
  const done  = !!(score && score.stars > 0);
  const stars = score ? score.stars : 0;

  // Card background
  ctx.save();
  ctx.fillStyle = done
    ? 'rgba(40,35,10,0.85)'
    : 'rgba(18,20,45,0.75)';
  _roundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = done
    ? 'rgba(255,215,0,0.45)'
    : 'rgba(80,80,130,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Icon
  ctx.save();
  ctx.font         = `${Math.round(w * 0.30)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = done ? 1.0 : 0.28;
  ctx.fillText(c.icon || '★', x + w / 2, y + h * 0.40);
  ctx.restore();

  // Name
  ctx.save();
  ctx.font         = `bold ${Math.max(8, Math.round(w * 0.11))}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = done ? COLORS.text : 'rgba(120,120,160,0.45)';
  const name = (c.nameZh || '').length > 4 ? (c.nameZh || '').slice(0, 4) : (c.nameZh || '');
  ctx.fillText(name, x + w / 2, y + h * 0.72);
  ctx.restore();

  // Stars row
  if (done) {
    ctx.save();
    ctx.font         = `${Math.max(7, Math.round(w * 0.10))}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLORS.starGold;
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), x + w / 2, y + h * 0.89);
    ctx.restore();
  } else {
    // Index number
    ctx.save();
    ctx.font      = `9px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(100,100,140,0.45)';
    ctx.fillText(String(idx + 1), x + w / 2, y + h * 0.89);
    ctx.restore();
  }
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Touch ─────────────────────────────────────────────────────
function _onTouchStart(e) {
  const t = e.touches[0];
  if (!t) return;
  _lastTouchY = t.clientY;
  _isDragging = false;
}

function _onTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;
  const dy = _lastTouchY - t.clientY;
  if (Math.abs(dy) > 5) _isDragging = true;
  _lastTouchY = t.clientY;
  const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
  _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget + dy));
}

function _onTouchEnd(e) {
  if (_isDragging) { _isDragging = false; return; }
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX, ty = touch.clientY;

  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate('menu');
    return;
  }
}

// ── Cleanup ───────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart', _onTouchStart);
    G.CANVAS.removeEventListener('touchmove',  _onTouchMove);
    G.CANVAS.removeEventListener('touchend',   _onTouchEnd);
  }
  _backRect = null;
  _cellRects = [];
  _scrollY = _scrollTarget = 0;
}
