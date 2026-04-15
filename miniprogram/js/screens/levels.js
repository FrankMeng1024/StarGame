// levels.js — Canvas 选关屏幕（微信小游戏版）
// 替代原版 DOM screen-levels，纯 Canvas 2D 绘制

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawCard, hitTest,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate     = null;
let _rafId        = null;
let _cardRects    = [];   // [{x,y,w,h,idx}]
let _backRect     = null;
let _scrollY      = 0;
let _scrollTarget = 0;
let _lastTouchY   = 0;
let _isDragging   = false;
let _totalH       = 0;

// Layout constants (computed at showLevels time, not module load)
const COLS    = 5;
const PAD_X   = 12;
const PAD_TOP = 80;   // below back button
const GAP     = 6;

// ── Public API ────────────────────────────────────────────────
export function showLevels(navigate) {
  _navigate = navigate;
  _cleanup();

  initBgStars(G.SCREEN_W, G.SCREEN_H, 60);
  _computeLayout();

  G.CANVAS.addEventListener('touchstart',  _onTouchStart);
  G.CANVAS.addEventListener('touchmove',   _onTouchMove);
  G.CANVAS.addEventListener('touchend',    _onTouchEnd);

  _rafId = requestAnimationFrame(_loop);
}

export function hideLevels() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart',  _onTouchStart);
    G.CANVAS.removeEventListener('touchmove',   _onTouchMove);
    G.CANVAS.removeEventListener('touchend',    _onTouchEnd);
  }
  _cardRects = [];
  _backRect  = null;
  _scrollY   = 0;
  _scrollTarget = 0;
}

function _computeLayout() {
  _cardRects = [];
  const CARD_W = Math.floor((G.SCREEN_W - 32) / COLS) - 4;
  const CARD_H = CARD_W + 12;
  const rows = Math.ceil(CONSTELLATIONS.length / COLS);
  _totalH = PAD_TOP + rows * (CARD_H + GAP) + 16;

  CONSTELLATIONS.forEach((c, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x   = PAD_X + col * (CARD_W + GAP);
    const y   = PAD_TOP + row * (CARD_H + GAP);
    _cardRects.push({ x, y, w: CARD_W, h: CARD_H, idx });
  });
}

function _getSceneBg() {
  const maxIdx = state.unlockedLevels.size > 0
    ? Math.max(...Array.from(state.unlockedLevels)) : 0;
  const si    = Math.min(Math.floor(maxIdx / 5), SCENE_PALETTES.length - 1);
  return SCENE_PALETTES[si];
}

function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // Smooth scroll
  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  // Background
  const scene = _getSceneBg();
  drawSkyBg(ctx, W, H, scene.sky0, scene.sky1, scene.sky2);
  drawBgStars(ctx, t);

  // ── Back button (fixed, above scroll area) ────────────────
  _backRect = drawButton(ctx, 12, 14, 80, 36, '← 返回', {
    fontSize: 13,
    radius:   10,
    color0:   'rgba(80,60,140,0.85)',
    color1:   'rgba(60,90,180,0.85)',
  });

  // Title
  ctx.save();
  ctx.font        = 'bold 18px sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle   = COLORS.text;
  ctx.fillText('选择关卡', W / 2, 32);
  ctx.restore();

  // ── Scrollable card area ──────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, PAD_TOP - 8, W, H - PAD_TOP + 8);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  for (const cr of _cardRects) {
    _drawCard(ctx, cr, t);
  }

  ctx.restore();

  _rafId = requestAnimationFrame(_loop);
}

function _drawCard(ctx, cr, t) {
  const { x, y, w, h, idx } = cr;
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);

  // Card background
  const bgAlpha = unlocked ? 0.82 : 0.45;
  ctx.save();
  ctx.globalAlpha = bgAlpha;
  ctx.fillStyle   = unlocked ? COLORS.cardBg : 'rgba(20,20,40,0.7)';
  _roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = unlocked ? COLORS.cardBorder : 'rgba(80,80,120,0.3)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();

  // Number
  ctx.save();
  ctx.font         = `10px sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = unlocked ? COLORS.text2 : 'rgba(120,120,160,0.6)';
  ctx.fillText(String(idx + 1), x + 5, y + 4);
  ctx.restore();

  // Constellation icon / lock
  ctx.save();
  ctx.font         = `${Math.round(w * 0.38)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = unlocked ? 0.9 : 0.35;
  ctx.fillText(unlocked ? (c.icon || '★') : '🔒', x + w / 2, y + h * 0.42);
  ctx.restore();

  // Name
  ctx.save();
  ctx.font         = `bold 11px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = unlocked ? COLORS.text : 'rgba(120,120,160,0.5)';
  ctx.fillText(c.nameZh || c.name, x + w / 2, y + h * 0.72);
  ctx.restore();

  // Stars (score)
  if (unlocked && score && score.stars > 0) {
    ctx.save();
    ctx.font        = `10px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle   = COLORS.starGold;
    const stars = '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars);
    ctx.fillText(stars, x + w / 2, y + h * 0.88);
    ctx.restore();
  }
}

// ── Touch handling ────────────────────────────────────────────
function _onTouchStart(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  _lastTouchY = touch.clientY;
  _isDragging = false;
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const dy = touch.clientY - _lastTouchY;
  _lastTouchY = touch.clientY;
  if (Math.abs(dy) > 3) _isDragging = true;

  const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
  _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget - dy));
}

function _onTouchEnd(e) {
  if (_isDragging) {
    _isDragging = false;
    return;
  }
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;
  const ty = touch.clientY;

  // Back button (fixed — no scroll offset)
  if (_backRect && hitTest(_backRect, tx, ty)) {
    console.log('navigate:menu');
    if (_navigate) _navigate('menu');
    return;
  }

  // Card tap (adjust for scroll)
  const ayy = ty + _scrollY;  // scroll-adjusted y
  for (const cr of _cardRects) {
    if (tx >= cr.x && tx <= cr.x + cr.w && ayy >= cr.y && ayy <= cr.y + cr.h) {
      if (!state.isUnlocked(cr.idx)) return;
      state.currentLevel = cr.idx;
      console.log('navigate:game idx=' + cr.idx);
      if (_navigate) _navigate('game');
      return;
    }
  }
}

// ── Helper: rounded rect path ─────────────────────────────────
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
