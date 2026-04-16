// menu.js — Canvas 主菜单屏幕（微信小游戏版）
// 替代原版 DOM screen-menu + menu-sky.js
// 所有 UI 通过 Canvas 2D 绘制，无 DOM 依赖

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawSubtitle, hitTest,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { AudioAdapter } from '../platform/wx-adapter.js';

const BGM_SRC = 'assets/audio/bgm.mp3';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate   = null;
let _rafId      = null;
let _buttons    = [];   // [{x,y,w,h, key}]
let _muteBtn    = null; // {x,y,w,h}

// Constellation hero state
let _conStars = [];
let _conLines = [];

// ── Public API ────────────────────────────────────────────────
/**
 * @param {function} navigate  — navigate(key) → 'levels' | 'gallery' | 'shop'
 */
export function showMenu(navigate) {
  _navigate = navigate;
  _cleanup();

  initBgStars(G.SCREEN_W, G.SCREEN_H, 80);
  _buildConLayout();

  G.CANVAS.addEventListener('touchstart', _onTouch);

  // Start BGM (idempotent — safe to call every time; checks mute state internally)
  AudioAdapter.playBGM(BGM_SRC);

  _rafId = requestAnimationFrame(_loop);
}

export function hideMenu() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  G.CANVAS.removeEventListener('touchstart', _onTouch);
  _buttons  = [];
  _conStars = [];
  _conLines = [];
}

// Pick a featured constellation (index cycles by day to feel alive)
function _pickCon() {
  const dayOfYear = Math.floor(Date.now() / 86400000) % CONSTELLATIONS.length;
  return CONSTELLATIONS[dayOfYear];
}

function _buildConLayout() {
  const conDef = _pickCon();
  if (!conDef || !conDef.stars) return;

  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const isLandscape = W > H;

  // In landscape: constellation fills the left 55% of screen
  // In portrait: constellation fills the top ~60% of screen
  const cx = isLandscape ? W * 0.28 : W * 0.50;
  const cy = isLandscape ? H * 0.45 : H * 0.32;
  const BOX = isLandscape ? Math.min(H * 0.80, W * 0.44) : Math.min(H * 0.60, W * 0.80);

  // Raw positions
  const raw = conDef.stars.map((s, si) => ({
    cx:    cx + (s.x - 0.5) * BOX,
    cy:    cy + (s.y - 0.5) * BOX,
    r:     Math.max(3, Math.min(11, magToRadius(s.mag) * 1.4)),
    color: typeToColor(s.type),
    phase: (si * 1.618) % TWO_PI,
    speed: 0.4 + (si % 5) * 0.15,
  }));

  // Auto-center bounding box
  const xs  = raw.map(s => s.cx);
  const ys  = raw.map(s => s.cy);
  const dx  = cx - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy  = cy - (Math.min(...ys) + Math.max(...ys)) / 2;
  for (const s of raw) { s.cx += dx; s.cy += dy; }

  // Scale down if overflowing (landscape: constrain to left 55%; portrait: full width)
  const MARGIN = 32;
  const xs2 = raw.map(s => s.cx);
  const ys2 = raw.map(s => s.cy);
  const conW = Math.max(...xs2) - Math.min(...xs2);
  const conH = Math.max(...ys2) - Math.min(...ys2);
  const maxW = isLandscape ? W * 0.50 - MARGIN : W - MARGIN * 2;
  const maxH = isLandscape ? H - MARGIN * 2 : H * 0.55;
  const scale = Math.min(1, maxW / (conW || 1), maxH / (conH || 1));
  if (scale < 1) {
    for (const s of raw) {
      s.cx = cx + (s.cx - cx) * scale;
      s.cy = cy + (s.cy - cy) * scale;
      s.r  = Math.max(2, s.r * scale);
    }
  }

  _conStars = raw;
  _conLines = (conDef.lines || []).map(([ai, bi]) => {
    const a = raw[ai], b = raw[bi];
    if (!a || !b) return null;
    return { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy };
  }).filter(Boolean);
}

function _drawConBg(t) {
  const ctx = G.CTX;

  // Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(200,185,130,0.38)';
  ctx.lineWidth   = 1.2;
  for (const ln of _conLines) {
    ctx.beginPath();
    ctx.moveTo(ln.x1, ln.y1);
    ctx.lineTo(ln.x2, ln.y2);
    ctx.stroke();
  }
  ctx.restore();

  // Stars with glow
  for (const s of _conStars) {
    const alpha = 0.50 + 0.50 * Math.abs(Math.sin(t * s.speed + s.phase));

    // Soft glow halo — convert hex #rrggbb to rgba()
    const grd = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r * 5);
    const inner = _hexToRgba(s.color, alpha * 0.40);;
    grd.addColorStop(0, inner);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.r * 5, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Core dot
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur  = s.r * 3;
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;
  const isLandscape = W > H;

  // Background
  drawSkyBg(ctx, W, H);
  drawBgStars(ctx, t);
  _drawConBg(t);

  _buttons = [];

  if (isLandscape) {
    // ── Landscape layout ─────────────────────────────────────
    // Constellation fills left 55%; title + buttons in right 45%
    const rightX  = W * 0.56;
    const rightW  = W - rightX - G.SAFE_RIGHT - 12;
    const midX    = rightX + rightW / 2;

    drawTitle(ctx, '追星少女', midX, H * 0.26, 30);
    drawSubtitle(ctx, '探索88星座的奇妙旅程', midX, H * 0.26 + 32, 12);

    const BW  = rightW;
    const BH  = Math.max(32, Math.min(42, (H - G.SAFE_TOP - G.SAFE_BOTTOM - 120) / 3));
    const GAP = 10;
    // Stack 3 buttons vertically in right pane, centered
    const totalBtnsH = 3 * BH + 2 * GAP;
    const startY = H / 2 - totalBtnsH / 2 + 16;

    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座展厅', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by = startY + i * (BH + GAP);
      const rect = drawButton(ctx, rightX, by, BW, BH, d.label, {
        icon: d.icon, alpha: 0.92, fontSize: 15,
      });
      _buttons.push({ ...rect, key: d.key });
    });
  } else {
    // ── Portrait layout (original) ───────────────────────────
    drawTitle(ctx, '追星少女', W / 2, H * 0.72, 38);
    drawSubtitle(ctx, '探索88星座的奇妙旅程', W / 2, H * 0.72 + 38, 14);

    const BW = W * 0.60;
    const BH = 48;
    const BX = (W - BW) / 2;
    const GAP = 14;
    const startY = H - G.SAFE_BOTTOM - 180;

    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座展厅', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by = startY + i * (BH + GAP);
      const rect = drawButton(ctx, BX, by, BW, BH, d.label, {
        icon: d.icon, alpha: 0.92,
      });
      _buttons.push({ ...rect, key: d.key });
    });
  }

  // Mute button — top-right corner, within safe area
  const muteBtnSize = 36;
  const muteBtnX    = W - G.SAFE_RIGHT - muteBtnSize - 10;
  const muteBtnY    = G.SAFE_TOP + 10;
  const muteIcon    = AudioAdapter.isMuted() ? '🔇' : '🔊';
  ctx.save();
  ctx.font         = '18px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = 0.80;
  ctx.fillStyle    = 'rgba(20,25,60,0.55)';
  ctx.beginPath();
  ctx.arc(muteBtnX + muteBtnSize / 2, muteBtnY + muteBtnSize / 2, muteBtnSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha  = 1;
  ctx.fillText(muteIcon, muteBtnX + muteBtnSize / 2, muteBtnY + muteBtnSize / 2);
  ctx.restore();
  _muteBtn = { x: muteBtnX, y: muteBtnY, w: muteBtnSize, h: muteBtnSize };

  _rafId = requestAnimationFrame(_loop);
}

function _onTouch(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;
  const ty = touch.clientY;

  // Mute button tap
  if (_muteBtn && hitTest(_muteBtn, tx, ty)) {
    AudioAdapter.toggleMute(BGM_SRC);
    return;
  }

  for (const btn of _buttons) {
    if (hitTest(btn, tx, ty)) {
      console.log('navigate:' + btn.key);
      if (_navigate) _navigate(btn.key);
      return;
    }
  }
}

// ── Helper: hex #rrggbb → rgba(r,g,b,a) ──────────────────────
function _hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
