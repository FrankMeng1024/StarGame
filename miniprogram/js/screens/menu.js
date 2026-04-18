// menu.js — Canvas 主菜单屏幕（微信小游戏版）
// 替代原版 DOM screen-menu + menu-sky.js
// 所有 UI 通过 Canvas 2D 绘制，无 DOM 依赖

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawSubtitle, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { AudioAdapter } from '../platform/wx-adapter.js';

const BGM_SRC = 'assets/audio/bgm.mp3';

const TWO_PI = Math.PI * 2;

// ── Premium menu button renderer (STORY-00270) ────────────────
// Draws a visually rich button with gradient fill, glow border, shadow, and icon.
// Returns {x, y, w, h} for hitTest.
function _drawMenuButton(ctx, x, y, w, h, label, opts = {}) {
  const {
    icon      = '',
    primary   = false,   // true = CTA style (brighter gradient)
    fontSize  = 16,
    radius    = 14,
  } = opts;

  ctx.save();

  // Drop shadow for depth
  ctx.shadowColor = primary ? 'rgba(120,40,220,0.55)' : 'rgba(60,20,140,0.40)';
  ctx.shadowBlur  = primary ? 14 : 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  // Solid gradient fill — web version style (STORY-00289: replaces ghost/transparent)
  const fillGrd = ctx.createLinearGradient(x, y, x, y + h);
  if (primary) {
    fillGrd.addColorStop(0, 'rgba(122,68,214,0.88)');
    fillGrd.addColorStop(1, 'rgba(74,28,150,0.88)');
  } else {
    fillGrd.addColorStop(0, 'rgba(61,40,117,0.80)');
    fillGrd.addColorStop(1, 'rgba(30,16,69,0.80)');
  }
  ctx.fillStyle = fillGrd;

  // Rounded rect fill
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();

  // Reset shadow before border/text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetY = 0;

  // Border — brightened for solid button style (STORY-00289)
  ctx.strokeStyle = primary ? 'rgba(210,120,255,0.65)' : 'rgba(140,90,220,0.45)';
  ctx.lineWidth   = primary ? 1.5 : 1.0;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.stroke();

  // Subtle inner top highlight — reduced for ghost style (STORY-00275)
  const highlightGrad = ctx.createLinearGradient(x, y, x, y + h * 0.45);
  highlightGrad.addColorStop(0,   'rgba(255,255,255,0.10)');
  highlightGrad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = highlightGrad;
  ctx.beginPath();
  ctx.moveTo(x + radius, y + 1);
  ctx.lineTo(x + w - radius, y + 1);
  ctx.arcTo(x + w - 1, y + 1, x + w - 1, y + radius, radius - 1);
  ctx.lineTo(x + w - 1, y + h * 0.45);
  ctx.lineTo(x + 1, y + h * 0.45);
  ctx.lineTo(x + 1, y + radius);
  ctx.arcTo(x + 1, y + 1, x + radius, y + 1, radius - 1);
  ctx.closePath();
  ctx.fill();

  // Label text
  ctx.fillStyle    = primary ? '#ffe566' : '#f0e0ff';
  ctx.font         = `bold ${fontSize}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const text = icon ? `${icon}  ${label}` : label;
  ctx.fillText(text, x + w / 2, y + h / 2);

  ctx.restore();
  return { x, y, w, h };
}


let _navigate   = null;
let _rafId      = null;
let _buttons    = [];   // [{x,y,w,h, key}]
let _muteBtn    = null; // {x,y,w,h}

// Constellation hero state
let _conStars = [];
let _conLines = [];
let _conDef   = null; // current constellation definition (STORY-00298)

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
  _conDef   = null;
}

// Pick a featured constellation (index cycles by day to feel alive)
function _pickCon() {
  const dayOfYear = Math.floor(Date.now() / 86400000) % CONSTELLATIONS.length;
  return CONSTELLATIONS[dayOfYear];
}

function _buildConLayout() {
  const conDef = _pickCon();
  if (!conDef || !conDef.stars) return;
  _conDef = conDef; // STORY-00298: store for info panel

  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const isLandscape = W > H;

  // In landscape: constellation fills the left 60% of screen (STORY-00289: was 52%)
  // In portrait: constellation fills the top ~60% of screen
  const safeL = G.SAFE_LEFT || 0;
  const cx = isLandscape ? safeL + (W * 0.60 - safeL) * 0.5 : W * 0.50;
  const cy = isLandscape ? H * 0.45 : H * 0.32;
  const BOX = isLandscape ? Math.min(H * 0.80, (W * 0.60 - safeL) * 0.88) : Math.min(H * 0.60, W * 0.80);

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
  const maxW = isLandscape ? W * 0.58 - MARGIN : W - MARGIN * 2;
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
    // Constellation fills left 60%; title + buttons in right 36% (STORY-00289: was 52%/44%)
    const rightX  = W * 0.62 + (G.SAFE_LEFT || 0) * 0.2;
    const rightW  = W - rightX - (G.SAFE_RIGHT || 0) - 16;  // STORY-00287: was -20
    const midX    = rightX + rightW / 2;

    // STORY-00280: title moved up to prevent overlap with tall constellation
    drawTitle(ctx, '追  星  少  女', midX, H * 0.14, 30);  // STORY-00289: spaced title, slightly smaller for wider layout
    drawSubtitle(ctx, '探索88星座的奇妙旅程', midX, H * 0.14 + 26, 12);

    const BW  = rightW;
    const BH  = Math.max(26, Math.min(30, (H - G.SAFE_TOP - G.SAFE_BOTTOM - 110) / 3));  // STORY-00287: was max(30,min(36,...))
    const GAP = 8;
    // Stack 3 buttons vertically in right pane — center in available height
    const totalBtnsH = 3 * BH + 2 * GAP;
    const usableH = H - G.SAFE_TOP - G.SAFE_BOTTOM;
    const startY = G.SAFE_TOP + usableH * 0.42 - totalBtnsH / 2;

    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座图鉴', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by = startY + i * (BH + GAP);
      const rect = _drawMenuButton(ctx, rightX, by, BW, BH, d.label, {
        icon: d.icon, primary: i === 0, fontSize: 13,  // STORY-00287: was 14
      });
      _buttons.push({ ...rect, key: d.key });
    });

    // Achievement button removed — STORY-00295 (CR-080 parity: web removed it in Sprint 27)
  } else {
    // ── Portrait layout ───────────────────────────────────────
    drawTitle(ctx, '追  星  少  女', W / 2, H * 0.72, 38);  // Arch review: portrait also uses double-space per STORY-00289
    drawSubtitle(ctx, '探索88星座的奇妙旅程', W / 2, H * 0.72 + 38, 14);

    const BW = W * 0.60;
    const BH = 36;   // STORY-00287: was 40
    const BX = (W - BW) / 2;
    const GAP = 10;  // STORY-00280: was 14
    const startY = H - G.SAFE_BOTTOM - 160;

    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座图鉴', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by = startY + i * (BH + GAP);
      const rect = _drawMenuButton(ctx, BX, by, BW, BH, d.label, {
        icon: d.icon, primary: i === 0, fontSize: 15,  // STORY-00287: was 16
      });
      _buttons.push({ ...rect, key: d.key });
    });

    // Achievement button removed — STORY-00295 (CR-080 parity)
  }

  // ── Constellation info panel (STORY-00298) ──
  _drawConInfoPanel(ctx, W, H, isLandscape);

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

  // Global fade overlay (STORY-00282)
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

// ── Constellation info panel (STORY-00298) ────────────────────
// Frosted-glass strip at bottom showing name + viewing tip
function _drawConInfoPanel(ctx, W, H, isLandscape) {
  if (!_conDef) return;

  const safeB = G.SAFE_BOTTOM || 0;
  const safeL = G.SAFE_LEFT   || 0;
  const safeR = G.SAFE_RIGHT  || 0;

  const PANEL_H = 44;
  const PAD_X   = 16;
  // In landscape, panel spans the constellation half (left 60%)
  // In portrait, panel spans full width
  const panelW = isLandscape ? W * 0.62 - safeL - 8 : W - safeL - safeR - 24;
  const panelX = safeL + (isLandscape ? 4 : 12);
  const panelY = H - safeB - PANEL_H - 8;

  // Glass background
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle   = 'rgba(12,10,38,0.75)';
  _roundRectPanel(ctx, panelX, panelY, panelW, PANEL_H, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,185,130,0.35)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Location icon + constellation name
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = 'rgba(255,220,120,0.92)';
  ctx.fillText('✦ ' + _conDef.nameZh, panelX + PAD_X, panelY + 14);

  // Viewing tip (bestViewMonth)
  if (_conDef.bestViewMonth) {
    ctx.font      = '11px sans-serif';
    ctx.fillStyle = 'rgba(200,195,240,0.78)';
    ctx.fillText(_conDef.bestViewMonth + '最易观测', panelX + PAD_X, panelY + 31);
  }

  // Notable stars (right-aligned, truncated if needed)
  if (_conDef.mainStars) {
    const maxChars = isLandscape ? 14 : 12;
    const starsText = _conDef.mainStars.length > maxChars
      ? _conDef.mainStars.substring(0, maxChars) + '…'
      : _conDef.mainStars;
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'right';
    ctx.fillStyle    = 'rgba(180,175,220,0.65)';
    ctx.fillText('★ ' + starsText, panelX + panelW - PAD_X, panelY + PANEL_H / 2);
  }

  ctx.restore();
}

function _roundRectPanel(ctx, x, y, w, h, r) {
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

function _onTouch(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;  // fixed: revert incorrect DPR (STORY-00269)
  const ty = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)

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
