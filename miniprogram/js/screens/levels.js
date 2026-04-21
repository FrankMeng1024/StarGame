// levels.js — Canvas 选关屏幕（微信小游戏版）
// 替代原版 DOM screen-levels，纯 Canvas 2D 绘制

import { G } from '../engine/globals.js';
import {
  COLORS,
  drawButton, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { ITEMS } from './shop.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── STORY-00345: Orbital level select — 5 concentric elliptical rings ────────
// Orbit ring definitions: rx = half-width, speed = rad/s, offset = initial angle
const _RINGS = [
  { rx:  62, speed: 0.020, offset: Math.PI * 0.1 },
  { rx: 104, speed: 0.014, offset: Math.PI * 0.4 },
  { rx: 147, speed: 0.009, offset: Math.PI * 0.7 },
  { rx: 190, speed: 0.006, offset: Math.PI * 1.1 },
  { rx: 233, speed: 0.004, offset: Math.PI * 1.5 },
];
const _ELLIPSE_RATIO = 0.55;  // ry = rx * ratio (3D depth feel)
const _NODE_R = [22, 20, 18, 16, 14];  // node radius per ring (outer = smaller)
const _RING_LABELS = ['入门', '基础', '进阶', '挑战', '传奇'];
const _RING_LABEL_COLORS = ['#80c080', '#90b0e0', '#c0a0ff', '#ff9060', '#ff6060'];

// Orbital background nebulae (anti-claustrophobia: very faint, not pure black)
const _NEBULAE = [
  { xRatio: 0.22, yRatio: 0.28, rx: 120, ry: 70,  r: '100,70,255', a: 0.055 },
  { xRatio: 0.78, yRatio: 0.58, rx: 100, ry: 60,  r: '40,180,200', a: 0.045 },
  { xRatio: 0.50, yRatio: 0.85, rx: 130, ry: 75,  r: '200,80,150', a: 0.040 },
];

// ── Module state ──────────────────────────────────────────────
let _navigate     = null;
let _rafId        = null;
let _nodeRects    = [];   // [{cx,cy,r,idx}] — replaces _cardRects
let _backRect     = null;
let _shopRect     = null;  // STORY-00282: shop shortcut
let _scrollY      = 0;
let _scrollTarget = 0;
let _lastTouchY   = 0;
let _isDragging   = false;
let _totalH       = 0;
let _scrollVelocity = 0;  // for momentum scrolling
let _lastTouchTime  = 0;
let _orbitCX      = 0;   // orbital center x (computed at layout)
let _orbitCY      = 0;   // orbital center y (computed at layout)
let _bgStars      = [];  // background star field

// STORY-00342: Ma Shan Zheng font loading (same pattern as menu.js + intro.js)
// ⛔ 禁止修改：字体风格已定稿，与开场动画/主菜单一致，保持全游戏字体统一
let _maShanZhengLoaded = false;

// ── Item selection overlay state ───────────────────────────────
let _overlayActive      = false;
let _overlayToggled     = new Set(); // item IDs selected for use
let _overlayBtnRects    = [];        // [{id, rect}] toggle buttons
let _overlayConfirm     = null;
let _overlaySkip        = null;
let _overlayScrollY     = 0;
let _overlayScrollTarget = 0;
let _overlayTotalRowsH  = 0;  // total height of all item rows
let _overlayRowsClipY   = 0;  // clip top for rows area
let _overlayRowsClipH   = 0;  // clip height for rows area

// ── Public API ────────────────────────────────────────────────
export function showLevels(navigate) {
  _navigate = navigate;
  _cleanup();

  _bgStars = [];  // reset so _computeLayout regenerates
  _computeLayout();

  // STORY-00342: load Ma Shan Zheng for title consistency (same as menu.js/intro.js)
  if (!_maShanZhengLoaded) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.loadFontFace === 'function') {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _maShanZhengLoaded = true; },
          fail: () => { /* fallback to serif */ },
        });
      }
    } catch (e) { /* ignore */ }
  }

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
  _nodeRects = [];
  _bgStars   = [];
  _backRect  = null;
  _shopRect  = null;
  _scrollY   = 0;
  _scrollTarget = 0;
  _scrollVelocity = 0;
  _overlayActive = false;
  _overlayToggled.clear();
  _overlayBtnRects = [];
  _overlayConfirm = null;
  _overlaySkip = null;
  _overlayScrollY = _overlayScrollTarget = 0;
  _overlayTotalRowsH = 0;
}

function _computeLayout() {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  // Orbital center: horizontally centered, vertically at ~42% of screen
  _orbitCX = W / 2;
  _orbitCY = G.SAFE_TOP + 56 + (H - G.SAFE_TOP - 56) * 0.42;
  // Total scrollable height: enough to reveal outermost ring fully
  const outerRx = _RINGS[4].rx;
  _totalH = _orbitCY + outerRx + 80 + G.SAFE_BOTTOM;

  // Pre-compute static node positions for hit testing (using t=0)
  // Actual positions are re-computed each frame in _getNodeXY
  _nodeRects = CONSTELLATIONS.map((_, idx) => {
    const ring = Math.floor(idx / 6);
    const slot = idx % 6;
    return { ring, slot, r: _NODE_R[ring], idx };
  });

  // Background stars (generated once)
  if (_bgStars.length === 0) {
    _bgStars = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (_totalH * 1.1),
      r: Math.random() * 0.8 + 0.2,
      a: Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.8 + 1.0,
    }));
  }
}


function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // Smooth scroll with momentum
  if (!_isDragging) {
    _scrollTarget += _scrollVelocity;
    _scrollVelocity *= 0.88;  // friction
    const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget));
  }
  _scrollY += (_scrollTarget - _scrollY) * 0.22;

  // Background: deep space (not pure black — anti-claustrophobia)
  ctx.fillStyle = '#06091e';
  ctx.fillRect(0, 0, W, H);

  // Nebula halos (subtle color, parallax)
  _drawNebulaBg(ctx, W, H);

  // Background stars (parallax 0.15x)
  for (const s of _bgStars) {
    const sy = s.y - _scrollY * 0.15;
    if (sy < -4 || sy > H + 4) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#d4e4ff';
    ctx.beginPath();
    ctx.arc(s.x, sy, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Back button (fixed, above scroll area) ────────────────
  _backRect = drawButton(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 88, 38, '← 返回', {
    fontSize: 14,
    radius:   10,
    color0:   'rgba(80,60,140,0.85)',
    color1:   'rgba(60,90,180,0.85)',
  });

  // Shop shortcut (top-right, STORY-00282)
  _shopRect = drawButton(ctx, W - G.SAFE_RIGHT - 10 - 72, G.SAFE_TOP + 10, 72, 32, '🛒 商店', {
    fontSize: 12,
    radius:   10,
    color0:   'rgba(80,60,140,0.85)',
    color1:   'rgba(60,90,180,0.85)',
  });

  // Title — STORY-00342: Ma Shan Zheng calligraphy font, gold + glow (matches menu.js style)
  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.save();
  ctx.font         = `bold 22px ${titleFont}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.starGold;
  ctx.shadowColor  = 'rgba(255,200,80,0.55)';
  ctx.shadowBlur   = 10;
  ctx.fillText('选择关卡', W / 2, G.SAFE_TOP + 30);
  ctx.restore();

  // ── Orbital system (scrollable) ───────────────────────────
  const padTop = G.SAFE_TOP + 56;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();

  // Orbital center shifts up with scroll (parallax 0.6x — objects follow scroll but slower)
  const orbitCY = _orbitCY - _scrollY * 0.6;

  // Orbit rings
  _drawOrbits(ctx, orbitCY);

  // Sun at center
  _drawSun(ctx, _orbitCX, orbitCY, t);

  // Nodes: draw outer rings first (z-order: ring 4 behind ring 0)
  for (let ring = 4; ring >= 0; ring--) {
    for (let slot = 0; slot < 6; slot++) {
      const idx = ring * 6 + slot;
      if (idx >= CONSTELLATIONS.length) continue;
      const { x: nx, y: ny } = _getNodeXY(ring, slot, t, orbitCY);
      // Skip off-screen nodes
      if (ny + _NODE_R[ring] * 3 < padTop || ny - _NODE_R[ring] * 3 > H) continue;
      _drawNode(ctx, idx, nx, ny, _NODE_R[ring], t);
    }
  }

  ctx.restore();

  // Draw item selection overlay if active
  if (_overlayActive) {
    _drawItemOverlay(ctx, W, H);
  }

  // Global fade overlay (STORY-00282)
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

// ── STORY-00345: Orbital rendering helpers ────────────────────

// Get node screen position for given ring/slot at animation time t
function _getNodeXY(ring, slot, t, orbitCY) {
  const r = _RINGS[ring];
  const a = r.offset + slot * (TWO_PI / 6) + r.speed * t;
  return {
    x: _orbitCX + Math.cos(a) * r.rx,
    y: orbitCY  + Math.sin(a) * r.rx * _ELLIPSE_RATIO,
  };
}

// Nebula background halos
function _drawNebulaBg(ctx, W, H) {
  for (const n of _NEBULAE) {
    const nx = n.xRatio * W;
    const ny = n.yRatio * H - _scrollY * 0.25;
    ctx.save();
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(nx, ny * (n.rx / n.ry), 0, nx, ny * (n.rx / n.ry), n.rx);
    g.addColorStop(0, `rgba(${n.r},${n.a})`);
    g.addColorStop(1, `rgba(${n.r},0)`);
    ctx.beginPath();
    ctx.arc(nx, ny * (n.rx / n.ry), n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

// Orbit ring ellipses
function _drawOrbits(ctx, orbitCY) {
  ctx.save();
  for (let i = 0; i < _RINGS.length; i++) {
    const ring = _RINGS[i];
    ctx.save();
    ctx.scale(1, _ELLIPSE_RATIO);
    ctx.beginPath();
    ctx.arc(_orbitCX, orbitCY / _ELLIPSE_RATIO, ring.rx, 0, TWO_PI);
    ctx.strokeStyle = `rgba(100,130,200,${0.09 + i * 0.012})`;
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // Difficulty label at right of ring
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.font = '9px sans-serif';
    ctx.fillStyle = _RING_LABEL_COLORS[i];
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(_RING_LABELS[i], _orbitCX + ring.rx + 5, orbitCY);
    ctx.restore();
  }
  ctx.restore();
}

// Central sun
function _drawSun(ctx, cx, cy, t) {
  const pulse = 1 + Math.sin(t * 0.7) * 0.03;
  const sr = 22 * pulse;
  // Very gentle halo (anti-megalophobia: sr≤28, soft alpha)
  const halo = ctx.createRadialGradient(cx, cy, sr, cx, cy, sr * 4);
  halo.addColorStop(0, 'rgba(255,200,100,0.07)');
  halo.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, sr * 4, 0, TWO_PI);
  ctx.fillStyle = halo;
  ctx.fill();
  const glow = ctx.createRadialGradient(cx, cy, sr * 0.3, cx, cy, sr * 2);
  glow.addColorStop(0, 'rgba(255,220,130,0.22)');
  glow.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, sr * 2, 0, TWO_PI);
  ctx.fillStyle = glow;
  ctx.fill();
  const sunG = ctx.createRadialGradient(cx - sr * 0.3, cy - sr * 0.3, sr * 0.05, cx, cy, sr);
  sunG.addColorStop(0, '#fffaee');
  sunG.addColorStop(0.3, '#ffd870');
  sunG.addColorStop(0.75, '#e88820');
  sunG.addColorStop(1, '#b05010');
  ctx.beginPath();
  ctx.arc(cx, cy, sr, 0, TWO_PI);
  ctx.fillStyle = sunG;
  ctx.fill();
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI + t * 0.08;
    ctx.globalAlpha = 0.05 + Math.sin(t * 0.5 + i) * 0.02;
    ctx.strokeStyle = '#ffd870';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (sr + 1), cy + Math.sin(a) * (sr + 1));
    ctx.lineTo(cx + Math.cos(a) * (sr + 12), cy + Math.sin(a) * (sr + 12));
    ctx.stroke();
  }
  ctx.restore();
}

// Mini constellation line drawing inside a node
function _drawMiniConstellation(ctx, c, cx, cy, r, alpha) {
  const size = r * 1.65;
  const pts = c.stars.map(s => ({
    x: cx + (s.x - 0.5) * size,
    y: cy + (s.y - 0.5) * size,
  }));
  ctx.save();
  ctx.globalAlpha = alpha * 0.60;
  ctx.strokeStyle = '#b8d0ff';
  ctx.lineWidth = 0.65;
  ctx.lineCap = 'round';
  for (const [a, b] of c.lines) {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#ddeeff';
  for (let i = 0; i < pts.length; i++) {
    const sr = (i === 0 && pts.length > 4) ? 1.8 : 1.1;
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, sr, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

// Draw a single orbital node
function _drawNode(ctx, idx, x, y, r, t) {
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);
  const alpha    = unlocked ? 1.0 : 0.30;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer glow for unlocked nodes
  if (unlocked) {
    const glowA = 0.10 + Math.sin(t * 1.2 + idx * 0.5) * 0.04;
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.8);
    g.addColorStop(0, `rgba(140,160,255,${glowA})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Node body gradient
  const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r);
  if (unlocked) {
    grad.addColorStop(0, 'rgba(40,55,130,0.97)');
    grad.addColorStop(0.6, 'rgba(20,30,90,0.95)');
    grad.addColorStop(1, 'rgba(8,12,40,0.92)');
  } else {
    grad.addColorStop(0, 'rgba(22,24,48,0.75)');
    grad.addColorStop(1, 'rgba(10,12,28,0.65)');
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TWO_PI);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TWO_PI);
  if (unlocked) {
    const ba = 0.45 + Math.sin(t * 0.9 + idx * 0.4) * 0.1;
    ctx.strokeStyle = `rgba(140,170,255,${ba})`;
    ctx.lineWidth = 0.8;
  } else {
    ctx.strokeStyle = 'rgba(50,55,90,0.3)';
    ctx.lineWidth = 0.5;
  }
  ctx.stroke();

  // Constellation drawing (clipped to circle)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 0.5, 0, TWO_PI);
  ctx.clip();
  if (unlocked) {
    _drawMiniConstellation(ctx, c, x, y, r - 1, 1.0);
  } else {
    ctx.globalAlpha = 0.4;
    ctx.font = `${r * 0.85}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x, y + r * 0.05);
  }
  ctx.restore();
  ctx.restore();

  // Labels below node (outside clip, full alpha)
  const labelAlpha = unlocked ? 0.80 : 0.30;
  ctx.save();
  ctx.globalAlpha = labelAlpha;
  const fs = Math.max(9, r * 0.55);
  ctx.font = `${fs}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = unlocked ? '#c0d0ff' : 'rgba(80,85,120,0.6)';
  ctx.fillText(c.nameZh || c.nameEn, x, y + r + 4);
  if (unlocked) {
    const earned = (score && score.stars > 0) ? score.stars : 0;
    const starStr = '★'.repeat(earned) + '☆'.repeat(3 - earned);
    ctx.font = `${Math.max(8, r * 0.5)}px sans-serif`;
    ctx.fillStyle = earned > 0 ? COLORS.starGold : 'rgba(160,140,220,0.55)';
    ctx.fillText(starStr, x, y + r + 4 + fs + 1);
  }
  ctx.restore();
}


// ── Item selection overlay ────────────────────────────────────
function _drawItemOverlay(ctx, W, H) {
  // Smooth overlay scroll
  _overlayScrollY += (_overlayScrollTarget - _overlayScrollY) * 0.22;

  // Dim background
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const ownedItems = ITEMS.filter(it => state.getItemQty(it.id) > 0);
  const cardW = Math.min(W - 40, 340);
  const rowH  = 60;
  const HEADER_H = 70;   // title + subtitle area
  const FOOTER_H = 64;   // bottom buttons area (44px button + 10px top + 10px bottom)
  const naturalContentH = HEADER_H + ownedItems.length * rowH + FOOTER_H;
  // Clamp card height to available screen (safe margins)
  const maxCardH = H - G.SAFE_TOP - G.SAFE_BOTTOM - 16;
  const cardH = Math.min(naturalContentH, maxCardH);
  const cardX = (W - cardW) / 2;
  const cardY = Math.max(G.SAFE_TOP + 8, (H - cardH) / 2);

  // Card background
  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.97)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Title — STORY-00307: bold 18px
  ctx.save();
  ctx.font         = 'bold 18px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text;
  ctx.shadowColor  = 'rgba(150,120,255,0.6)';
  ctx.shadowBlur   = 8;
  ctx.fillText('选择使用道具', W / 2, cardY + 30);
  ctx.restore();

  // Sub-title — STORY-00307: 12px
  ctx.save();
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text2;
  ctx.fillText('本关结束后自动消耗，可多选', W / 2, cardY + 54);
  ctx.restore();

  // Scrollable rows area — clipped between header and footer
  const rowsAreaTop  = cardY + HEADER_H;
  const rowsAreaH    = cardH - HEADER_H - FOOTER_H;
  _overlayTotalRowsH = ownedItems.length * rowH;
  _overlayRowsClipY  = rowsAreaTop;
  _overlayRowsClipH  = rowsAreaH;
  const maxRowScroll = Math.max(0, _overlayTotalRowsH - rowsAreaH);
  _overlayScrollTarget = Math.max(0, Math.min(maxRowScroll, _overlayScrollTarget));

  // Item rows (clipped + scrolled)
  _overlayBtnRects = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(cardX, rowsAreaTop, cardW, rowsAreaH);
  ctx.clip();
  ctx.translate(0, -_overlayScrollY);

  ownedItems.forEach((it, i) => {
    const rowY   = rowsAreaTop + i * rowH;
    const toggled = _overlayToggled.has(it.id);
    const qty = state.getItemQty(it.id);

    // Row bg
    ctx.save();
    ctx.fillStyle = toggled ? 'rgba(60,180,100,0.18)' : 'rgba(255,255,255,0.04)';
    _roundRect(ctx, cardX + 10, rowY, cardW - 20, rowH - 5, 8);
    ctx.fill();
    if (toggled) {
      ctx.strokeStyle = 'rgba(60,220,100,0.5)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
    ctx.restore();

    // Icon + name + desc — STORY-00307: 24px icon, bold 14px name, 13px desc
    ctx.save();
    ctx.font         = '24px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cardX + 14, rowY + rowH * 0.5 - 3);
    ctx.restore();

    ctx.save();
    ctx.font         = 'bold 14px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLORS.text;
    ctx.fillText(it.nameZh + '  ×' + qty, cardX + 48, rowY + 8);
    ctx.restore();

    ctx.save();
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLORS.text2;
    ctx.fillText(it.desc, cardX + 48, rowY + 28);
    ctx.restore();

    // Toggle button — STORY-00307: 62×32px per AC spec
    const btnW = 62, btnH = 32;
    const btnX = cardX + cardW - 18 - btnW;
    const btnY = rowY + (rowH - 5 - btnH) / 2;
    const btn = drawButton(ctx, btnX, btnY, btnW, btnH, toggled ? '✓ 已选' : '使用', {
      fontSize: 12,
      radius: 8,
      color0: toggled ? 'rgba(30,140,70,0.9)' : 'rgba(80,60,160,0.85)',
      color1: toggled ? 'rgba(20,180,80,0.9)' : 'rgba(60,90,200,0.85)',
    });
    // Store btn in content-space y (caller adjusts for scroll)
    _overlayBtnRects.push({ id: it.id, rect: btn });
  });

  ctx.restore();

  // Bottom buttons: 跳过 + 确定出发 — STORY-00307: 44px height, full-width
  const btnY2  = cardY + cardH - 54;
  const btnW2  = (cardW - 36) / 2;
  _overlaySkip    = drawButton(ctx, cardX + 10,               btnY2, btnW2, 44, '跳过', {
    fontSize: 15, radius: 10,
    color0: 'rgba(60,60,100,0.80)', color1: 'rgba(80,80,140,0.80)',
  });
  _overlayConfirm = drawButton(ctx, cardX + cardW - 10 - btnW2, btnY2, btnW2, 44, '确定出发 →', {
    fontSize: 15, radius: 10,
    color0: 'rgba(30,130,60,0.90)', color1: 'rgba(20,180,80,0.90)',
  });
}

// ── Touch handling ────────────────────────────────────────────
function _onTouchStart(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  _lastTouchY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
  _isDragging = false;
  _scrollVelocity = 0;
  _lastTouchTime = Date.now();
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const rawY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
  const dy = rawY - _lastTouchY;
  _lastTouchY = rawY;

  if (_overlayActive) {
    // Scroll the overlay rows
    if (Math.abs(dy) > 2) _isDragging = true;
    const maxScroll = Math.max(0, _overlayTotalRowsH - _overlayRowsClipH);
    _overlayScrollTarget = Math.max(0, Math.min(maxScroll, _overlayScrollTarget - dy));
    return;
  }

  _scrollVelocity = -dy;  // track velocity for momentum
  if (Math.abs(dy) > 2) _isDragging = true;

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
  const tx = touch.clientX;  // fixed: revert incorrect DPR (STORY-00269)
  const ty = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)

  // ── Overlay touch handling ───────────────────────────────────
  if (_overlayActive) {
    if (_isDragging) { _isDragging = false; return; }

    // Toggle item buttons — adjust ty for the overlay scroll offset
    const scrolledTY = ty + _overlayScrollY;
    for (const { id, rect } of _overlayBtnRects) {
      if (hitTest(rect, tx, scrolledTY)) {
        if (_overlayToggled.has(id)) {
          _overlayToggled.delete(id);
        } else {
          _overlayToggled.add(id);
        }
        return;
      }
    }
    // Skip — go to game with no items
    if (_overlaySkip && hitTest(_overlaySkip, tx, ty)) {
      state.selectedItems = [];
      _overlayActive = false;
      _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game');
      return;
    }
    // Confirm — go to game with selected items
    if (_overlayConfirm && hitTest(_overlayConfirm, tx, ty)) {
      state.selectedItems = [..._overlayToggled];
      _overlayActive = false;
      _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game');
      return;
    }
    // Tap outside overlay dismisses it (cancel)
    _overlayActive = false;
    _overlayScrollY = _overlayScrollTarget = 0;
    return;
  }

  // Back button (fixed — no scroll offset)
  if (_backRect && hitTest(_backRect, tx, ty)) {
    console.log('navigate:menu');
    if (_navigate) _navigate('menu');
    return;
  }

  // Shop shortcut (STORY-00282)
  if (_shopRect && hitTest(_shopRect, tx, ty)) {
    console.log('navigate:shop');
    if (_navigate) _navigate('shop');
    return;
  }

  // Node tap — circular hit detection (STORY-00345)
  // orbitCY at the time of the tap (approximated — uses current scrollY)
  const orbitCY = _orbitCY - _scrollY * 0.6;
  const now2 = performance.now() * 0.001;
  for (const node of _nodeRects) {
    const { x: nx, y: ny } = _getNodeXY(node.ring, node.slot, now2, orbitCY);
    if (Math.hypot(tx - nx, ty - ny) <= node.r + 10) {
      if (!state.isUnlocked(node.idx)) return;
      state.currentLevel = node.idx;
      console.log('navigate:game idx=' + node.idx);

      // Check if player has any items — show selection overlay
      const hasItems = ITEMS.some(it => state.getItemQty(it.id) > 0);
      if (hasItems) {
        _overlayActive = true;
        _overlayToggled.clear();
        _overlayBtnRects = [];
        _overlayScrollY = _overlayScrollTarget = 0;
        return;
      }

      // No items — go straight to game
      state.selectedItems = [];
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
