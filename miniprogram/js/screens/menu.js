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
  ctx.shadowColor = primary ? 'rgba(80,30,180,0.45)' : 'rgba(20,10,60,0.50)';
  ctx.shadowBlur  = primary ? 14 : 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  // Dark pill fill — web version style (STORY-00313: matches web dark semi-transparent pills)
  const fillGrd = ctx.createLinearGradient(x, y, x, y + h);
  if (primary) {
    fillGrd.addColorStop(0, 'rgba(88,54,180,0.82)');
    fillGrd.addColorStop(1, 'rgba(54,28,120,0.82)');
  } else {
    fillGrd.addColorStop(0, 'rgba(18,12,48,0.78)');
    fillGrd.addColorStop(1, 'rgba(10,6,30,0.78)');
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

  // Border — subtle for dark pill style (STORY-00313)
  ctx.strokeStyle = primary ? 'rgba(160,100,255,0.55)' : 'rgba(80,50,160,0.35)';
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

// STORY-00338: Ma Shan Zheng font loading (same approach as intro.js)
// ⛔ 禁止修改：Ma Shan Zheng字体风格已定稿 (Sprint 44-mini)，与开场动画一致，保持全游戏字体统一
let _maShanZhengLoaded = false;

// STORY-00339: random constellation + reveal animation
let _lastConIdx    = -1;       // avoid consecutive duplicate
let _menuStartTime = 0;        // set on first _loop frame
let _starRevealT   = [];       // elapsed-seconds when each star was revealed
let _lineRevealT   = [];       // elapsed-seconds when each line starts drawing

// ── Public API ────────────────────────────────────────────────
/**
 * @param {function} navigate  — navigate(key) → 'levels' | 'gallery' | 'shop'
 */
export function showMenu(navigate) {
  _navigate = navigate;
  _cleanup();

  console.log('[menu] showMenu W=' + G.SCREEN_W + ' H=' + G.SCREEN_H + ' isLandscape=' + (G.SCREEN_W > G.SCREEN_H));

  // STORY-00340: session-unique sin-hash starfield seed
  initBgStars(G.SCREEN_W, G.SCREEN_H, Date.now() % 100000);

  // STORY-00338: load Ma Shan Zheng calligraphy font (same as intro.js)
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
    } catch (e) { /* ignore — title renders in fallback serif */ }
  }

  // STORY-00339: reset reveal timers
  _menuStartTime = 0;
  _starRevealT   = [];
  _lineRevealT   = [];

  _buildConLayout();

  G.CANVAS.addEventListener('touchend', _onTouch);

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
  G.CANVAS.removeEventListener('touchend', _onTouch);
  _buttons  = [];
  _conStars = [];
  _conLines = [];
  _conDef   = null;
  _menuStartTime = 0;
  _starRevealT   = [];
  _lineRevealT   = [];
}

// STORY-00339: true random pick, avoid consecutive duplicate
function _pickCon() {
  let idx = Math.floor(Math.random() * CONSTELLATIONS.length);
  if (idx === _lastConIdx) {
    idx = (idx + 1) % CONSTELLATIONS.length;
  }
  _lastConIdx = idx;
  return CONSTELLATIONS[idx];
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

  // Raw positions — assign revealTime stagger (STORY-00339: 0.12s per star)
  const raw = conDef.stars.map((s, si) => ({
    cx:         cx + (s.x - 0.5) * BOX,
    cy:         cy + (s.y - 0.5) * BOX,
    r:          Math.max(3, Math.min(11, magToRadius(s.mag) * 1.4)),
    color:      typeToColor(s.type),
    phase:      (si * 1.618) % TWO_PI,
    speed:      0.4 + (si % 5) * 0.15,
    revealTime: si * 0.12,  // STORY-00339: staggered reveal
    revealIdx:  si,
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
    return { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, ai, bi };
  }).filter(Boolean);
}

function _drawConBg(t, elapsed) {
  const ctx = G.CTX;

  // STORY-00339: gate line drawing on both endpoint stars being revealed
  // Schedule line reveal times lazily (same pattern as intro.js)
  for (let li = 0; li < _conLines.length; li++) {
    if (_lineRevealT[li] !== undefined) continue;
    const ln = _conLines[li];
    const revA = _conStars[ln.ai] ? _conStars[ln.ai].revealTime : 0;
    const revB = _conStars[ln.bi] ? _conStars[ln.bi].revealTime : 0;
    if (elapsed >= revA && elapsed >= revB) {
      _lineRevealT[li] = Math.max(revA, revB) + 0.10;
    }
  }

  // Lines — only draw when scheduled and both stars visible
  ctx.save();
  for (let li = 0; li < _conLines.length; li++) {
    if (_lineRevealT[li] === undefined || elapsed < _lineRevealT[li]) continue;
    const ln = _conLines[li];
    const prog = Math.min(1, (elapsed - _lineRevealT[li]) / 0.45);
    const sa = _conStars[ln.ai], sb = _conStars[ln.bi];
    if (!sa || !sb) continue;
    const ex = sa.cx + (sb.cx - sa.cx) * prog;
    const ey = sa.cy + (sb.cy - sa.cy) * prog;
    ctx.strokeStyle = 'rgba(200,185,130,0.38)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(sa.cx, sa.cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.restore();

  // Stars — staggered reveal with pulse (STORY-00339)
  for (const s of _conStars) {
    if (elapsed < s.revealTime) continue;  // not yet revealed

    const age   = elapsed - s.revealTime;
    const alpha = 0.50 + 0.50 * Math.abs(Math.sin(t * s.speed + s.phase));
    // Pulse on reveal: scale 1.0→1.4→1.0 over 0.3s
    const scale = age < 0.3 ? (1.0 + 0.4 * Math.sin(age / 0.3 * Math.PI)) : 1.0;
    const pulse = age < 0.4 ? (age / 0.4) : 1.0;

    // Soft glow halo
    const grd = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r * 5);
    const inner = _hexToRgba(s.color, alpha * 0.40 * pulse);
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
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle   = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur  = s.r * 3;
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.r * scale, 0, TWO_PI);
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

  // STORY-00339: track elapsed time from menu open
  if (_menuStartTime === 0) _menuStartTime = now;
  const elapsed = (now - _menuStartTime) * 0.001;

  // Background
  drawSkyBg(ctx, W, H);
  drawBgStars(ctx, t);
  _drawConBg(t, elapsed);

  _buttons = [];

  // STORY-00338: Ma Shan Zheng calligraphy font (same as intro.js Phase 3)
  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';

  if (isLandscape) {
    // ── Landscape layout ─────────────────────────────────────
    // STORY-00341: balanced vertical distribution — no hardcoded y positions
    const rightX  = W * 0.62 + (G.SAFE_LEFT || 0) * 0.2;
    const rightW  = W - rightX - (G.SAFE_RIGHT || 0) - 16;
    const midX    = rightX + rightW / 2;

    // Usable area: between safe top and info panel bottom
    const safeT   = G.SAFE_TOP    || 0;
    const safeB   = G.SAFE_BOTTOM || 0;
    const INFO_RESERVED = 58;  // info panel height + gap
    const usableTop = safeT + 8;
    const usableBot = H - safeB - INFO_RESERVED;
    const usableH   = usableBot - usableTop;

    // Responsive sizing
    const titleSize   = Math.round(Math.min(32, Math.max(22, usableH * 0.13)));
    const subtitleFS  = Math.max(10, Math.round(titleSize * 0.46));
    const titleBlockH = titleSize + 4 + subtitleFS;
    const BH          = Math.round(Math.min(44, Math.max(32, usableH * 0.115)));
    const GAP         = Math.round(Math.max(10, usableH * 0.038));
    const TITLE_GAP   = Math.round(Math.max(16, usableH * 0.075));
    const btnGroupH   = 3 * BH + 2 * GAP;
    const totalH      = titleBlockH + TITLE_GAP + btnGroupH;

    // Vertically center the whole content block in usable area
    const contentTop  = usableTop + Math.round((usableH - totalH) / 2);
    const titleY      = contentTop + titleSize / 2;
    const btnStartY   = contentTop + titleBlockH + TITLE_GAP;

    // STORY-00338: calligraphy title
    ctx.save();
    ctx.globalAlpha  = 0.38;
    ctx.font         = `bold ${titleSize}px ${titleFont}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#b090ff';
    ctx.shadowBlur   = 36;
    ctx.fillStyle    = '#e8d5ff';
    ctx.fillText('追星少女', midX, titleY);
    ctx.restore();
    ctx.save();
    ctx.font         = `bold ${titleSize}px ${titleFont}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#b090ff';
    ctx.shadowBlur   = 18;
    ctx.fillStyle    = '#e8d5ff';
    ctx.fillText('追星少女', midX, titleY);
    ctx.restore();
    drawSubtitle(ctx, '探索88星座的奇妙旅程', midX, titleY + titleSize * 0.62 + subtitleFS * 0.5, subtitleFS);

    const BW = rightW;
    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座图鉴', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by   = btnStartY + i * (BH + GAP);
      const rect = _drawMenuButton(ctx, rightX, by, BW, BH, d.label, {
        icon: d.icon, primary: i === 0, fontSize: Math.max(12, Math.round(BH * 0.36)),
      });
      _buttons.push({ ...rect, key: d.key });
    });

    // Achievement button removed — STORY-00295
  } else {
    // ── Portrait layout ───────────────────────────────────────
    // STORY-00341: UI area starts below constellation (H*0.60), content centered within it
    const safeB  = G.SAFE_BOTTOM || 0;
    const uiTop  = H * 0.60;
    const uiBot  = H - safeB - 8;
    const uiH    = uiBot - uiTop;

    const titleSize   = Math.round(Math.min(36, Math.max(24, uiH * 0.165)));
    const subtitleFS  = Math.max(11, Math.round(titleSize * 0.46));
    const titleBlockH = titleSize + 4 + subtitleFS;
    const BW          = W * 0.72;  // wider than before (was 0.60)
    const BH          = Math.round(Math.min(54, Math.max(40, uiH * 0.175)));
    const GAP         = Math.round(Math.max(10, uiH * 0.048));
    const TITLE_GAP   = Math.round(Math.max(12, uiH * 0.065));
    const btnGroupH   = 3 * BH + 2 * GAP;
    const totalH      = titleBlockH + TITLE_GAP + btnGroupH;

    // Vertically center content block in UI area
    const contentTop  = uiTop + Math.round((uiH - totalH) / 2);
    const titleY      = contentTop + titleSize / 2;
    const btnStartY   = contentTop + titleBlockH + TITLE_GAP;
    const BX          = (W - BW) / 2;

    // STORY-00338: calligraphy title
    ctx.save();
    ctx.globalAlpha  = 0.38;
    ctx.font         = `bold ${titleSize}px ${titleFont}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#b090ff';
    ctx.shadowBlur   = 36;
    ctx.fillStyle    = '#e8d5ff';
    ctx.fillText('追星少女', W / 2, titleY);
    ctx.restore();
    ctx.save();
    ctx.font         = `bold ${titleSize}px ${titleFont}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#b090ff';
    ctx.shadowBlur   = 18;
    ctx.fillStyle    = '#e8d5ff';
    ctx.fillText('追星少女', W / 2, titleY);
    ctx.restore();
    drawSubtitle(ctx, '探索88星座的奇妙旅程', W / 2, titleY + titleSize * 0.62 + subtitleFS * 0.5, subtitleFS);

    const defs = [
      { key: 'levels',  label: '挑战关卡', icon: '★' },
      { key: 'gallery', label: '星座图鉴', icon: '◉' },
      { key: 'shop',    label: '道具商店', icon: '◈' },
    ];
    defs.forEach((d, i) => {
      const by   = btnStartY + i * (BH + GAP);
      const rect = _drawMenuButton(ctx, BX, by, BW, BH, d.label, {
        icon: d.icon, primary: i === 0, fontSize: Math.max(13, Math.round(BH * 0.36)),
      });
      _buttons.push({ ...rect, key: d.key });
    });

    // Achievement button removed — STORY-00295
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
  console.log('[menu] touchend#' + Date.now() + ' tx=' + tx.toFixed(1) + ' ty=' + ty.toFixed(1) + ' btns=' + _buttons.length);

  // Mute button tap
  if (_muteBtn && hitTest(_muteBtn, tx, ty)) {
    AudioAdapter.toggleMute(BGM_SRC);
    return;
  }

  for (const btn of _buttons) {
    const hit = hitTest(btn, tx, ty);
    console.log('[menu] btn=' + btn.key + ' x=' + btn.x.toFixed(0) + ' y=' + btn.y.toFixed(0) + ' w=' + btn.w.toFixed(0) + ' h=' + btn.h.toFixed(0) + ' hit=' + hit);
    if (hit) {
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
