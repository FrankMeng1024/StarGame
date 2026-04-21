// gallery.js — Canvas 星座图鉴（微信小游戏版）
// STORY-00349: 星系分组图鉴 — 与关卡选关风格统一，5组 × 6星座

import { G } from '../engine/globals.js';
import {
  COLORS, drawFadeOverlay, tickFade, hitTest,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// 与关卡选关的 _GROUPS 完全对应
const _GROUPS = [
  { name: '冬季星空', color: '#88ccff', glow: 'rgba(80,160,255,', levels: [0, 1, 4, 5, 6, 7] },
  { name: '夏季黄道', color: '#ffcc66', glow: 'rgba(255,180,60,',  levels: [2, 3, 8, 9, 10, 11] },
  { name: '秋日星原', color: '#cc99ff', glow: 'rgba(180,100,255,', levels: [12, 13, 14, 15, 16, 17] },
  { name: '北天极圈', color: '#66ffcc', glow: 'rgba(60,220,160,',  levels: [18, 19, 20, 21, 22, 23] },
  { name: '南天深空', color: '#ff8888', glow: 'rgba(255,80,80,',   levels: [24, 25, 26, 27, 28, 29] },
];

// ── Module state ──────────────────────────────────────────────
let _navigate    = null;
let _rafId       = null;
let _view        = 'list';   // 'list' | 'detail'
let _detailIdx   = 0;

// List view
let _backRect    = null;
let _scrollY     = 0;
let _scrollTarget = 0;
let _lastTouchY  = 0;
let _isDragging  = false;
let _totalH      = 0;
let _cardRects   = [];  // [{x,y,w,h,idx}]
let _bgStars     = [];

// Detail view
let _detailBackRect      = null;
let _detailPrevRect      = null;
let _detailNextRect      = null;
let _detailScrollY       = 0;
let _detailScrollTarget  = 0;
let _detailTotalH        = 0;
let _detailDragging      = false;
let _detailLastTY        = 0;
let _detailBottomBackRect = null;

// Photo carousel
let _carouselPos   = 0;
let _carouselForIdx = -1;
let _carouselImgs  = [];
let _carouselPrevRect = null;
let _carouselNextRect = null;

// Ma Shan Zheng font
let _msz = false;

// Background nebulae (list view)
const _NEBULAE = [
  { xr: 0.18, yr: 0.35, rx: 110, ry: 65, col: '100,70,255',  a: 0.06 },
  { xr: 0.82, yr: 0.65, rx: 100, ry: 60, col: '40,180,200',  a: 0.05 },
  { xr: 0.50, yr: 0.90, rx: 120, ry: 70, col: '200,80,150',  a: 0.04 },
];

// ── Public API ────────────────────────────────────────────────
export function showGallery(navigate) {
  _navigate = navigate;
  _cleanup();
  _view = 'list';
  _computeLayout();

  if (!_msz) {
    try {
      if (typeof wx !== 'undefined' && wx.loadFontFace) {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _msz = true; },
          fail: () => {},
        });
      }
    } catch (e) {}
  }

  G.CANVAS.addEventListener('touchstart', _onTouchStart);
  G.CANVAS.addEventListener('touchmove',  _onTouchMove);
  G.CANVAS.addEventListener('touchend',   _onTouchEnd);
  _rafId = requestAnimationFrame(_loop);
}

export function hideGallery() { _cleanup(); }

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart', _onTouchStart);
    G.CANVAS.removeEventListener('touchmove',  _onTouchMove);
    G.CANVAS.removeEventListener('touchend',   _onTouchEnd);
  }
  _cardRects = []; _backRect = null;
  _bgStars   = [];
  _scrollY   = _scrollTarget = 0;
  _detailScrollY = _detailScrollTarget = 0;
  _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
  _carouselPrevRect = null; _carouselNextRect = null;
  _detailBottomBackRect = null;
  _isDragging = false; _detailDragging = false;
}

function _computeLayout() {
  const W  = G.SCREEN_W;
  const H  = G.SCREEN_H;
  const SL = (G.SAFE_LEFT  || 0) + 12;
  const SR = (G.SAFE_RIGHT || 0) + 12;
  const usableW = W - SL - SR;

  // 3列网格（每组6个 = 2行3列）
  const COLS  = 3;
  const GAP_X = 10;
  const GAP_Y = 8;
  const CARD_W = Math.floor((usableW - GAP_X * (COLS - 1)) / COLS);
  const CARD_H = CARD_W + 20;  // CR-127: 增高20px容纳emoji图标

  // 每组：组标题26px + 卡片区域(2行) + 组间距
  const GROUP_HEADER = 26;
  const GROUP_ROW_H  = CARD_H;
  const GROUP_H      = GROUP_HEADER + 2 * GROUP_ROW_H + GAP_Y + 12;

  const PAD_TOP = (G.SAFE_TOP || 0) + 60;

  _cardRects = [];
  let gy = PAD_TOP;

  for (const grp of _GROUPS) {
    gy += GROUP_HEADER + 4;
    for (let slot = 0; slot < grp.levels.length; slot++) {
      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const x   = SL + col * (CARD_W + GAP_X);
      const y   = gy + row * (GROUP_ROW_H + GAP_Y);
      _cardRects.push({ x, y, w: CARD_W, h: CARD_H, idx: grp.levels[slot] });
    }
    gy += 2 * GROUP_ROW_H + GAP_Y + 16;
  }

  _totalH = gy + (G.SAFE_BOTTOM || 0) + 16;

  // Background stars (once)
  if (_bgStars.length === 0) {
    _bgStars = Array.from({ length: 100 }, () => ({
      x: Math.random() * W,
      y: Math.random() * Math.max(_totalH, H),
      r: Math.random() * 0.9 + 0.2,
      a: Math.random() * 0.5 + 0.1,
      phase: Math.random() * Math.PI * 2,
      spd: Math.random() * 1.5 + 0.6,
    }));
  }
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // Deep space background
  ctx.fillStyle = '#05081c';
  ctx.fillRect(0, 0, W, H);

  if (_view === 'list') {
    _drawListBg(ctx, W, H, t);
    _drawList(ctx, W, H, t);
  } else {
    _drawDetailBg(ctx, W, H, t);
    _drawDetail(ctx, W, H, t);
  }

  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);
  _rafId = requestAnimationFrame(_loop);
}

// ── List view background ──────────────────────────────────────
function _drawListBg(ctx, W, H, t) {
  // Nebulae (fixed, no scroll)
  const drift = Math.sin(t * 0.12) * 6;
  for (const n of _NEBULAE) {
    const nx = n.xr * W + drift * 0.4;
    const ny = n.yr * H + drift * 0.2;
    ctx.save();
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(nx, ny * n.rx / n.ry, 0, nx, ny * n.rx / n.ry, n.rx);
    g.addColorStop(0, `rgba(${n.col}${n.a})`);
    g.addColorStop(1, `rgba(${n.col}0)`);
    ctx.beginPath();
    ctx.arc(nx, ny * n.rx / n.ry, n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  // Background stars (parallax)
  for (const s of _bgStars) {
    const sy = s.y - _scrollY * 0.12;
    if (sy < -2 || sy > H + 2) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * s.spd + s.phase);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#d4e4ff';
    ctx.beginPath();
    ctx.arc(s.x, sy, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── List view ─────────────────────────────────────────────────
function _drawList(ctx, W, H, t) {
  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  // Fixed header
  _backRect = _ghostBtn(ctx, (G.SAFE_LEFT || 0) + 12, (G.SAFE_TOP || 0) + 10, 80, 30, '← 返回');

  const titleFont = _msz ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.save();
  ctx.font = `bold 20px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.shadowColor = 'rgba(255,200,80,0.55)';
  ctx.shadowBlur  = 8;
  ctx.fillText('星座图鉴', W / 2, (G.SAFE_TOP || 0) + 26);
  ctx.restore();

  // Discovered count
  const discovered = CONSTELLATIONS.filter((_, i) => state.isUnlocked(i)).length;
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,200,255,0.65)';
  ctx.fillText(`已发现 ${discovered} / ${CONSTELLATIONS.length}`, W - (G.SAFE_RIGHT || 0) - 12, (G.SAFE_TOP || 0) + 26);
  ctx.restore();

  // Scrollable content
  const padTop = (G.SAFE_TOP || 0) + 50;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  const SL  = (G.SAFE_LEFT || 0) + 12;
  const SR  = (G.SAFE_RIGHT || 0) + 12;
  const usW = W - SL - SR;

  let gy = padTop;

  for (let gi = 0; gi < _GROUPS.length; gi++) {
    const grp = _GROUPS[gi];

    // Group header line
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = grp.color;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(SL, gy + 10);
    ctx.lineTo(SL + 80, gy + 10);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `bold 12px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grp.color;
    ctx.globalAlpha = 0.85;
    ctx.fillText(grp.name, SL + 88, gy + 10);
    ctx.restore();

    // Unlocked count for this group
    const grpDone = grp.levels.filter(i => state.isUnlocked(i)).length;
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grp.color;
    ctx.globalAlpha = 0.55;
    ctx.fillText(`${grpDone}/6`, W - SR, gy + 10);
    ctx.restore();

    gy += 22;

    // Cards for this group (2 rows × 3 cols)
    const COLS   = 3;
    const GAP_X  = 10;
    const GAP_Y  = 8;
    const CARD_W = Math.floor((usW - GAP_X * (COLS - 1)) / COLS);
    const CARD_H = CARD_W + 20;  // CR-127: 与_computeLayout一致

    for (let slot = 0; slot < grp.levels.length; slot++) {
      const idx  = grp.levels[slot];
      const col  = slot % COLS;
      const row  = Math.floor(slot / COLS);
      const cx   = SL + col * (CARD_W + GAP_X);
      const cy   = gy + row * (CARD_H + GAP_Y);
      _drawGalleryCard(ctx, cx, cy, CARD_W, CARD_H, idx, grp, t);
    }

    gy += 2 * CARD_H + GAP_Y + 18;
  }

  ctx.restore();
}

function _drawGalleryCard(ctx, x, y, w, h, idx, grp, t) {
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);

  // Card background
  ctx.save();
  if (unlocked) {
    ctx.fillStyle = 'rgba(18,22,55,0.92)';
    ctx.strokeStyle = grp.color + '55';
    ctx.lineWidth = 1.2;
  } else {
    ctx.fillStyle = 'rgba(12,14,35,0.75)';
    ctx.strokeStyle = 'rgba(60,65,100,0.30)';
    ctx.lineWidth = 0.7;
  }
  _roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (!unlocked) {
    // Silhouette ?
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.font = `bold ${Math.round(w * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grp.color;
    ctx.fillText('？', x + w / 2, y + h * 0.48);
    ctx.restore();
  } else {
    // Mini constellation diagram
    const PAD = 8;
    const AREA = w - PAD * 2;
    if (c.stars && c.stars.length > 0 && c.lines && c.lines.length > 0) {
      ctx.save();
      ctx.beginPath();
      _roundRect(ctx, x + 4, y + 4, w - 8, h - 26, 7);
      ctx.clip();

      // Constellation lines
      ctx.strokeStyle = grp.color + 'aa';
      ctx.lineWidth = 0.9;
      ctx.globalAlpha = 0.7;
      for (const [a, b] of c.lines) {
        const sa = c.stars[a], sb = c.stars[b];
        if (!sa || !sb) continue;
        ctx.beginPath();
        ctx.moveTo(x + PAD + sa.x * AREA, y + PAD + sa.y * AREA * 0.78);
        ctx.lineTo(x + PAD + sb.x * AREA, y + PAD + sb.y * AREA * 0.78);
        ctx.stroke();
      }
      // Stars
      ctx.globalAlpha = 0.95;
      for (const s of c.stars) {
        const sr = Math.min(magToRadius(s.mag), 3.5);
        const sx = x + PAD + s.x * AREA;
        const sy = y + PAD + s.y * AREA * 0.78;
        ctx.fillStyle = typeToColor(s.type);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, TWO_PI);
        ctx.fill();
      }
      ctx.restore();
    }

    // CR-127: Emoji icon above name
    if (c.icon) {
      const emojiSize = Math.min(18, Math.round(w * 0.30));
      ctx.save();
      ctx.font = `${emojiSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = 0.92;
      // fallback: if emoji fails on Android, use first 2 chars of nameZh
      try { ctx.fillText(c.icon, x + w / 2, y + h - 22); }
      catch (e) { ctx.fillText((c.nameZh || '').slice(0, 2), x + w / 2, y + h - 22); }
      ctx.restore();
    }

    // Name at bottom
    const shortName = (c.nameZh || '').slice(0, 3);
    ctx.save();
    ctx.font = `bold ${Math.round(w * 0.20)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = grp.color;
    ctx.shadowColor = grp.color;
    ctx.shadowBlur  = 4;
    ctx.fillText(shortName, x + w / 2, y + h - 10);
    ctx.restore();

    // Stars rating
    const earned = score && score.stars > 0 ? score.stars : 0;
    ctx.save();
    ctx.font = `${Math.max(8, w * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = earned > 0 ? COLORS.starGold : 'rgba(140,130,180,0.5)';
    ctx.fillText('★'.repeat(earned) + '☆'.repeat(3 - earned), x + w / 2, y + h - 1);
    ctx.restore();
  }
}

// ── Detail view background ────────────────────────────────────
function _drawDetailBg(ctx, W, H, t) {
  const drift = Math.sin(t * 0.1) * 5;
  for (const n of _NEBULAE) {
    const nx = n.xr * W + drift * 0.3;
    const ny = n.yr * H + drift * 0.2;
    ctx.save();
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(nx, ny * n.rx / n.ry, 0, nx, ny * n.rx / n.ry, n.rx);
    g.addColorStop(0, `rgba(${n.col}${n.a * 0.7})`);
    g.addColorStop(1, `rgba(${n.col}0)`);
    ctx.beginPath();
    ctx.arc(nx, ny * n.rx / n.ry, n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  // Sparse stars
  for (const s of _bgStars.slice(0, 50)) {
    const tw = 0.6 + 0.4 * Math.sin(t * s.spd + s.phase);
    ctx.globalAlpha = s.a * tw * 0.7;
    ctx.fillStyle = '#d4e4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Detail view ───────────────────────────────────────────────
function _drawDetail(ctx, W, H, t) {
  _detailScrollY += (_detailScrollTarget - _detailScrollY) * 0.18;

  const c  = CONSTELLATIONS[_detailIdx];
  const SL = (G.SAFE_LEFT  || 0) + 14;
  const SR = (G.SAFE_RIGHT || 0) + 14;

  // Find which group this constellation belongs to
  const grpIdx = _GROUPS.findIndex(g => g.levels.includes(_detailIdx));
  const grp    = _GROUPS[Math.max(0, grpIdx)];

  // Fixed top bar
  _detailBackRect = _ghostBtn(ctx, (G.SAFE_LEFT || 0) + 10, (G.SAFE_TOP || 0) + 8, 80, 30, '← 返回');

  // Prev/Next (navigate among ALL constellations — unlocked only)
  const hasPrev = Array.from({ length: _detailIdx }, (_, i) => i).some(i => state.isUnlocked(i));
  const hasNext = Array.from({ length: CONSTELLATIONS.length - _detailIdx - 1 }, (_, i) => _detailIdx + 1 + i).some(i => state.isUnlocked(i));

  _detailPrevRect = hasPrev
    ? _ghostBtn(ctx, W / 2 - 100, (G.SAFE_TOP || 0) + 11, 44, 26, '‹ 上一')
    : null;
  _detailNextRect = hasNext
    ? _ghostBtn(ctx, W / 2 + 56, (G.SAFE_TOP || 0) + 11, 44, 26, '下一 ›')
    : null;

  // Counter
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(160,175,220,0.7)';
  ctx.fillText(`${_detailIdx + 1} / ${CONSTELLATIONS.length}`, W / 2, (G.SAFE_TOP || 0) + 24);
  ctx.restore();

  // Scrollable content
  const CLIP_TOP = (G.SAFE_TOP || 0) + 46;
  ctx.save();
  ctx.beginPath();
  ctx.rect(SL - 14, CLIP_TOP, W - SL + 14 - SR + 14, H - CLIP_TOP);
  ctx.clip();
  ctx.translate(0, -_detailScrollY + CLIP_TOP);

  let oy = 14;
  const cardX = SL;
  const cardW = W - SL - SR;
  const unlocked = state.isUnlocked(_detailIdx);

  // ── Constellation name + group badge ──────────────────────
  ctx.save();
  const titleFont2 = _msz ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.font = `bold 24px ${titleFont2}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? grp.color : 'rgba(120,120,160,0.6)';
  ctx.shadowColor = grp.color;
  ctx.shadowBlur  = unlocked ? 10 : 0;
  ctx.fillText(c.nameZh, W / 2, oy + 14);
  ctx.restore();
  oy += 32;

  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(160,155,200,0.75)';
  ctx.fillText(c.nameEn + '  ·  ' + grp.name, W / 2, oy);
  ctx.restore();
  oy += 24;

  if (!unlocked) {
    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(140,130,180,0.65)';
    ctx.fillText('🔒 完成对应关卡后解锁', W / 2, oy + 16);
    ctx.restore();
    oy += 50;
  } else {
    // ── Large star chart ───────────────────────────────────
    if (c.stars && c.stars.length > 0) {
      const CHART_SIZE = Math.min(cardW * 0.72, 200);
      const chartX = cardX + (cardW - CHART_SIZE) / 2;
      const chartY = oy;
      const PAD    = 20;
      const AREA   = CHART_SIZE - PAD * 2;

      // Background circle with gradient
      const bgG = ctx.createRadialGradient(chartX + CHART_SIZE/2, chartY + CHART_SIZE/2, 0, chartX + CHART_SIZE/2, chartY + CHART_SIZE/2, CHART_SIZE/2);
      bgG.addColorStop(0, 'rgba(14,16,45,0.95)');
      bgG.addColorStop(1, 'rgba(6,8,24,0.85)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(chartX + CHART_SIZE/2, chartY + CHART_SIZE/2, CHART_SIZE/2, 0, TWO_PI);
      ctx.fillStyle = bgG;
      ctx.fill();
      ctx.strokeStyle = grp.color + '44';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(chartX + CHART_SIZE/2, chartY + CHART_SIZE/2, CHART_SIZE/2 - 2, 0, TWO_PI);
      ctx.clip();

      const mapped = c.stars.map(s => ({
        x: chartX + PAD + s.x * AREA,
        y: chartY + PAD + s.y * AREA,
        r: Math.min(magToRadius(s.mag) * 1.4, 7),
        color: typeToColor(s.type),
        name: s.name,
        mag: s.mag,
      }));

      // Lines
      ctx.strokeStyle = grp.color + 'bb';
      ctx.lineWidth = 1.3;
      ctx.shadowColor = grp.color;
      ctx.shadowBlur  = 3;
      for (const [a, b] of (c.lines || [])) {
        if (!mapped[a] || !mapped[b]) continue;
        ctx.beginPath();
        ctx.moveTo(mapped[a].x, mapped[a].y);
        ctx.lineTo(mapped[b].x, mapped[b].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Stars
      for (const s of mapped) {
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
        grd.addColorStop(0, s.color);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.5, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
        ctx.fill();
      }

      // Star name labels (brightest)
      const cx2 = chartX + CHART_SIZE / 2;
      const cy2 = chartY + CHART_SIZE / 2;
      const bright = mapped
        .map((s, i) => ({ ...s, mag: c.stars[i].mag }))
        .filter(s => s.mag <= 2.5 && s.name)
        .sort((a, b) => a.mag - b.mag)
        .slice(0, 5);

      const placed = [];
      ctx.save();
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 2]);
      for (const bs of bright) {
        const ang = Math.atan2(bs.y - cy2, bs.x - cx2) + Math.PI / 4;
        const ll  = 9;
        const lx  = bs.x + Math.cos(ang) * ll;
        let   ly  = bs.y + Math.sin(ang) * ll;
        for (const p of placed) {
          if (Math.abs(lx - p.x) < 28 && Math.abs(ly - p.y) < 11) ly -= 10;
        }
        placed.push({ x: lx, y: ly });
        ctx.beginPath();
        ctx.moveTo(bs.x, bs.y);
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.textAlign = lx >= cx2 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(bs.name, lx + (lx >= cx2 ? 2 : -2), ly);
      }
      ctx.setLineDash([]);
      ctx.restore();
      ctx.restore();

      oy += CHART_SIZE + 14;
    }

    // ── Info pills ─────────────────────────────────────────
    const infos = [
      c.region ? `📍 ${c.region}` : null,
      c.bestViewMonth ? `🗓 最佳观测：${c.bestViewMonth}` : null,
      c.mainStars ? `⭐ ${c.mainStars}` : null,
    ].filter(Boolean);

    for (const info of infos) {
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200,195,240,0.85)';
      ctx.fillText(info, cardX, oy);
      ctx.restore();
      oy += 22;
    }
    if (infos.length) oy += 4;

    // ── Photo carousel ─────────────────────────────────────
    const photos = c.photos || (c.photo ? [c.photo] : []);
    if (_carouselForIdx !== _detailIdx) {
      _carouselForIdx = _detailIdx;
      _carouselImgs = [];
      photos.forEach((url, i) => _loadPhotoAtPos(url, i, _detailIdx));
    }

    if (photos.length > 0) {
      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.starGold;
      ctx.fillText('天文摄影 · ASTROPHOTOGRAPHY', cardX, oy + 8);
      ctx.restore();
      oy += 20;
    }

    const PHOTO_H = 160;
    const slot    = _carouselImgs[_carouselPos] || { img: null, loaded: false, error: false };
    ctx.save();
    ctx.fillStyle = 'rgba(25,20,55,0.75)';
    _roundRect(ctx, cardX, oy, cardW, PHOTO_H, 8);
    ctx.fill();
    _roundRect(ctx, cardX, oy, cardW, PHOTO_H, 8);
    ctx.clip();
    if (slot.loaded && slot.img) {
      ctx.drawImage(slot.img, cardX, oy, cardW, PHOTO_H);
    } else if (slot.error || photos.length === 0) {
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(160,150,200,0.4)';
      ctx.fillText('📷', cardX + cardW / 2, oy + PHOTO_H / 2 - 12);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(140,130,180,0.55)';
      ctx.fillText('暂无图片', cardX + cardW / 2, oy + PHOTO_H / 2 + 12);
    } else {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(150,140,190,0.65)';
      ctx.fillText('加载中...', cardX + cardW / 2, oy + PHOTO_H / 2);
    }
    ctx.restore();

    if (photos.length > 1) {
      const BW = 30, BH = 40, BY = oy + (PHOTO_H - BH) / 2;
      const drawCarBtn = (bx, label, active) => {
        ctx.save();
        ctx.globalAlpha = active ? 0.82 : 0.22;
        ctx.fillStyle = 'rgba(10,8,30,0.75)';
        _roundRect(ctx, bx, BY, BW, BH, 6);
        ctx.fill();
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c8d4ff';
        ctx.fillText(label, bx + BW / 2, BY + BH / 2);
        ctx.restore();
        return { x: bx, y: BY, w: BW, h: BH };
      };
      _carouselPrevRect = drawCarBtn(cardX + 3,             '‹', _carouselPos > 0);
      _carouselNextRect = drawCarBtn(cardX + cardW - BW - 3, '›', _carouselPos < photos.length - 1);
      ctx.save();
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(210,205,255,0.8)';
      ctx.fillText(`${_carouselPos + 1}/${photos.length}`, cardX + cardW / 2, oy + PHOTO_H - 9);
      ctx.restore();
    } else {
      _carouselPrevRect = null;
      _carouselNextRect = null;
    }
    oy += PHOTO_H + 12;

    // ── Divider ────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = grp.color + '30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, oy);
    ctx.lineTo(cardX + cardW, oy);
    ctx.stroke();
    ctx.restore();
    oy += 12;

    // ── Lore ───────────────────────────────────────────────
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(205,200,240,0.88)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = _wrapText(ctx, c.lore || '', cardW);
    for (const line of lines) {
      ctx.fillText(line, cardX, oy);
      oy += 18;
    }
    ctx.restore();
    oy += 16;
  }

  // Bottom back button
  _detailBottomBackRect = { x: cardX + cardW / 2 - 55, y: oy, w: 110, h: 34 };
  _ghostBtn(ctx, cardX + cardW / 2 - 55, oy, 110, 34, '← 返回列表');
  oy += 34 + (G.SAFE_BOTTOM || 0) + 20;
  _detailTotalH = oy;

  ctx.restore();
}

// ── Ghost button (deep space style) ──────────────────────────
function _ghostBtn(ctx, x, y, w, h, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(18,26,72,0.50)';
  _roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,255,0.28)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(175,195,255,0.80)';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
  return { x, y, w, h };
}

// ── Photo loader ──────────────────────────────────────────────
function _loadPhotoAtPos(url, pos, constellationIdx) {
  if (!url) { _carouselImgs[pos] = { img: null, loaded: false, error: true }; return; }
  _carouselImgs[pos] = { img: null, loaded: false, error: false };
  try {
    wx.downloadFile({
      url,
      success(res) {
        if (_carouselForIdx !== constellationIdx) return;
        if (res.statusCode === 200) {
          const img = wx.createImage();
          const timer = setTimeout(() => {
            if (_carouselImgs[pos] && !_carouselImgs[pos].loaded)
              _carouselImgs[pos] = { img: null, loaded: false, error: true };
          }, 5000);
          img.onload = () => { clearTimeout(timer); if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img, loaded: true, error: false }; };
          img.onerror = () => { clearTimeout(timer); if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true }; };
          img.src = res.tempFilePath;
        } else {
          if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true };
        }
      },
      fail() { _loadPhotoFallback(url, pos, constellationIdx); },
    });
  } catch (e) { _loadPhotoFallback(url, pos, constellationIdx); }
}

function _loadPhotoFallback(url, pos, constellationIdx) {
  try {
    const img = wx.createImage();
    const timer = setTimeout(() => { if (_carouselImgs[pos] && !_carouselImgs[pos].loaded) _carouselImgs[pos] = { img: null, loaded: false, error: true }; }, 8000);
    img.onload = () => { clearTimeout(timer); if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img, loaded: true, error: false }; };
    img.onerror = () => { clearTimeout(timer); if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true }; };
    img.src = url;
  } catch (e) { if (_carouselForIdx === constellationIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true }; }
}

// ── Text wrap ─────────────────────────────────────────────────
function _wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = char; }
      else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

// ── Touch handling ────────────────────────────────────────────
function _onTouchStart(e) {
  const touch = e.changedTouches[0]; if (!touch) return;
  if (_view === 'list') { _lastTouchY = touch.clientY; _isDragging = false; }
  else { _detailLastTY = touch.clientY; _detailDragging = false; }
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0]; if (!touch) return;
  if (_view === 'list') {
    const dy = touch.clientY - _lastTouchY; _lastTouchY = touch.clientY;
    if (Math.abs(dy) > 3) _isDragging = true;
    const maxS = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxS, _scrollTarget - dy));
  } else {
    const dy = touch.clientY - _detailLastTY; _detailLastTY = touch.clientY;
    if (Math.abs(dy) > 3) _detailDragging = true;
    const maxS = Math.max(0, _detailTotalH - G.SCREEN_H + (G.SAFE_TOP || 0) + 46 + (G.SAFE_BOTTOM || 0));
    _detailScrollTarget = Math.max(0, Math.min(maxS, _detailScrollTarget - dy));
  }
}

function _onTouchEnd(e) {
  const touch = e.changedTouches[0]; if (!touch) return;
  const tx = touch.clientX, ty = touch.clientY;

  if (_view === 'list') {
    if (_isDragging) { _isDragging = false; return; }
    if (_backRect && hitTest(_backRect, tx, ty)) { if (_navigate) _navigate('menu'); return; }
    const ayy = ty + _scrollY;
    for (const cr of _cardRects) {
      if (tx >= cr.x && tx <= cr.x + cr.w && ayy >= cr.y && ayy <= cr.y + cr.h) {
        if (!state.isUnlocked(cr.idx)) { try { wx.vibrateShort({ type: 'light' }); } catch (e) {} return; }
        _detailIdx = cr.idx;
        _detailScrollY = _detailScrollTarget = 0;
        _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
        _view = 'detail'; return;
      }
    }
  } else {
    if (_detailDragging) { _detailDragging = false; return; }
    if (_detailBackRect && hitTest(_detailBackRect, tx, ty)) { _view = 'list'; return; }
    if (_detailPrevRect && hitTest(_detailPrevRect, tx, ty)) {
      for (let i = _detailIdx - 1; i >= 0; i--) {
        if (state.isUnlocked(i)) { _detailIdx = i; _detailScrollY = _detailScrollTarget = 0; _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = []; break; }
      }
      return;
    }
    if (_detailNextRect && hitTest(_detailNextRect, tx, ty)) {
      for (let i = _detailIdx + 1; i < CONSTELLATIONS.length; i++) {
        if (state.isUnlocked(i)) { _detailIdx = i; _detailScrollY = _detailScrollTarget = 0; _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = []; break; }
      }
      return;
    }
    const CLIP_TOP = (G.SAFE_TOP || 0) + 46;
    const sty = ty + _detailScrollY - CLIP_TOP;
    if (_carouselPrevRect && hitTest(_carouselPrevRect, tx, sty) && _carouselPos > 0) { _carouselPos--; return; }
    if (_carouselNextRect && hitTest(_carouselNextRect, tx, sty)) {
      const photos = CONSTELLATIONS[_detailIdx].photos || (CONSTELLATIONS[_detailIdx].photo ? [CONSTELLATIONS[_detailIdx].photo] : []);
      if (_carouselPos < photos.length - 1) { _carouselPos++; } return;
    }
    if (_detailBottomBackRect && hitTest({ x: _detailBottomBackRect.x, y: _detailBottomBackRect.y, w: _detailBottomBackRect.w, h: _detailBottomBackRect.h }, tx, sty)) { _view = 'list'; return; }
  }
}

// ── Helper ────────────────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
