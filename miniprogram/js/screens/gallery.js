// gallery.js — Canvas 星座展厅（微信小游戏版）
// 两级界面：列表（卡片网格）→ 详情（单星座介绍）

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate    = null;
let _rafId       = null;
let _view        = 'list';  // 'list' | 'detail'
let _detailIdx   = 0;

// List view state
let _cardRects   = [];
let _backRect    = null;
let _scrollY     = 0;
let _scrollTarget = 0;
let _lastTouchY  = 0;
let _isDragging  = false;
let _totalH      = 0;

// Detail view state
let _detailBackRect = null;
let _detailPrevRect = null;
let _detailNextRect = null;
let _detailScrollY  = 0;
let _detailScrollTarget = 0;
let _detailTotalH   = 0;
let _detailDragging = false;
let _detailLastTY   = 0;

// Photo carousel state (per-detail view)
let _carouselPos    = 0;     // current carousel index 0..N-1
let _carouselForIdx = -1;    // which constellation this carousel is for
let _carouselImgs   = [];    // array of { img, loaded, error } per photo slot
let _carouselPrevRect = null;
let _carouselNextRect = null;
let _detailBottomBackRect = null;  // STORY-00319: scrollable bottom return button

// Layout
const COLS    = 5;  // STORY-00318 (CR-115): was 4 — 5 cols in landscape for more cards per row
const PAD_X   = 12;
const GAP     = 6;  // STORY-00318: was 8

// ── Public API ────────────────────────────────────────────────
export function showGallery(navigate) {
  _navigate = navigate;
  _cleanup();
  _view = 'list';
  initBgStars(G.SCREEN_W, G.SCREEN_H, 60);
  _computeLayout();

  G.CANVAS.addEventListener('touchstart', _onTouchStart);
  G.CANVAS.addEventListener('touchmove',  _onTouchMove);
  G.CANVAS.addEventListener('touchend',   _onTouchEnd);

  _rafId = requestAnimationFrame(_loop);
}

export function hideGallery() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart', _onTouchStart);
    G.CANVAS.removeEventListener('touchmove',  _onTouchMove);
    G.CANVAS.removeEventListener('touchend',   _onTouchEnd);
  }
  _cardRects = [];
  _backRect  = null;
  _scrollY   = _scrollTarget = 0;
  _detailScrollY = _detailScrollTarget = 0;
  _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
  _carouselPrevRect = null; _carouselNextRect = null;
  _detailBottomBackRect = null;
}

function _computeLayout() {
  const SL     = (G.SAFE_LEFT  || 0) + PAD_X;
  const SR     = (G.SAFE_RIGHT || 0) + PAD_X;
  const usableW = G.SCREEN_W - SL - SR;
  const PAD_TOP = G.SAFE_TOP + 76;  // below back button + notch
  _cardRects = [];
  const CARD_W = Math.floor((usableW - GAP * (COLS - 1)) / COLS);
  const CARD_H = CARD_W + 16;  // STORY-00318: was +24 — more square/compact
  const rows   = Math.ceil(CONSTELLATIONS.length / COLS);
  _totalH      = PAD_TOP + rows * (CARD_H + GAP) + 24 + G.SAFE_BOTTOM;

  CONSTELLATIONS.forEach((c, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x   = SL + col * (CARD_W + GAP);
    const y   = PAD_TOP + row * (CARD_H + GAP);
    _cardRects.push({ x, y, w: CARD_W, h: CARD_H, idx });
  });
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  drawSkyBg(ctx, W, H, '#06071a', '#0a0e2e', '#060918');
  drawBgStars(ctx, t);

  if (_view === 'list') {
    _drawList(ctx, W, H, t);
  } else {
    _drawDetail(ctx, W, H, t);
  }

  // Global fade overlay (STORY-00282)
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

// ── List view ─────────────────────────────────────────────────
function _drawList(ctx, W, H, t) {
  // Smooth scroll
  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  // Back button (fixed)
  _backRect = drawButton(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 88, 38, '← 返回', {
    fontSize: 14, radius: 10,
    color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
  });

  // Title
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('星座图鉴', W / 2, G.SAFE_TOP + 31);
  ctx.restore();

  // Coin display
  ctx.save();
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.fillText('🪙 ' + state.coins, W - G.SAFE_RIGHT - 12, G.SAFE_TOP + 29);
  ctx.restore();

  // Scrollable grid
  const padTop = G.SAFE_TOP + 76;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop - 4, W, H - padTop + 4);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  for (const cr of _cardRects) {
    _drawGalleryCard(ctx, cr, t);
  }
  ctx.restore();
}

function _drawGalleryCard(ctx, cr, t) {
  const { x, y, w, h, idx } = cr;
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);

  // Card background
  ctx.save();
  ctx.globalAlpha = unlocked ? 0.88 : 0.40;
  ctx.fillStyle   = unlocked ? 'rgba(20,24,60,0.9)' : 'rgba(15,15,35,0.7)';
  _roundRect(ctx, x, y, w, h, 10);  // STORY-00318: radius 10 (was 8)
  ctx.fill();
  ctx.strokeStyle = unlocked ? 'rgba(120,100,220,0.7)' : 'rgba(60,60,100,0.3)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  if (!unlocked) {
    // Locked: show "？" centered
    ctx.save();
    ctx.font = `bold ${Math.round(w * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#8888aa';
    ctx.fillText('？', x + w / 2, y + h * 0.48);
    ctx.restore();
  } else {
    // STORY-00330 (CR-127): show emoji icon above 2-char name
    // Emoji icon at upper portion of card
    const iconSize = Math.min(18, Math.round(w * 0.30));
    ctx.save();
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.icon || '', x + w / 2, y + h * 0.35);
    ctx.restore();

    // 2-char name below emoji
    const shortName = (c.nameZh || '').slice(0, 2);
    ctx.save();
    ctx.font = `bold ${Math.round(w * 0.26)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8b8ff';
    ctx.shadowColor = 'rgba(180,140,255,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(shortName, x + w / 2, y + h * 0.65);
    ctx.restore();

    // Star rating at bottom
    const score = state.getScore(idx);
    ctx.save();
    ctx.font = `${w > 80 ? 11 : 9}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.starGold;
    const stars = score && score.stars > 0
      ? '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars)
      : '☆☆☆';
    ctx.fillText(stars, x + w / 2, y + h * 0.80);
    ctx.restore();
  }
}

// ── Detail view ───────────────────────────────────────────────
function _computeDetailHeight(ctx, W, c) {
  // Approximate total content height for detail scroll
  const contentW = W - 32;
  // Lore text line count estimate
  const fontSize = 13;
  ctx.font = `${fontSize}px sans-serif`;
  const loreLines = _wrapText(ctx, c.lore || '', contentW).length;
  return 200 + 180 + loreLines * (fontSize + 4) + 80; // +180 for photo area + carousel controls
}

function _drawDetail(ctx, W, H, t) {
  _detailScrollY += (_detailScrollTarget - _detailScrollY) * 0.18;

  const c = CONSTELLATIONS[_detailIdx];
  const SL = (G.SAFE_LEFT  || 0) + 12;  // STORY-00319 (CR-116): safe area left margin
  const SR = (G.SAFE_RIGHT || 0) + 12;  // STORY-00319: safe area right margin

  // Fixed top bar — STORY-00319: use SAFE_LEFT/SAFE_TOP/SAFE_RIGHT for notch safety
  _detailBackRect = drawButton(ctx, (G.SAFE_LEFT || 0) + 12, (G.SAFE_TOP || 0) + 10, 88, 38, '← 返回', {
    fontSize: 14, radius: 10,
    color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
  });
  // Show prev only if there's a previous unlocked constellation
  const hasPrev = Array.from({ length: _detailIdx }, (_, i) => i).some(i => state.isUnlocked(i));
  _detailPrevRect = hasPrev
    ? drawButton(ctx, W / 2 - 120, (G.SAFE_TOP || 0) + 14, 50, 34, '上一个', {
        fontSize: 11, radius: 8,
        color0: 'rgba(40,60,120,0.7)', color1: 'rgba(30,80,160,0.7)',
      })
    : null;
  // Show next only if there's a next unlocked constellation — STORY-00319: right-align using SAFE_RIGHT
  const hasNext = Array.from({ length: CONSTELLATIONS.length - _detailIdx - 1 }, (_, i) => _detailIdx + 1 + i).some(i => state.isUnlocked(i));
  _detailNextRect = hasNext
    ? drawButton(ctx, W - (G.SAFE_RIGHT || 0) - 62, (G.SAFE_TOP || 0) + 14, 50, 34, '下一个', {
        fontSize: 11, radius: 8,
        color0: 'rgba(40,60,120,0.7)', color1: 'rgba(30,80,160,0.7)',
      })
    : null;

  // Counter
  ctx.save();
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,170,220,0.9)';
  ctx.fillText((_detailIdx + 1) + ' / ' + CONSTELLATIONS.length, W / 2, (G.SAFE_TOP || 0) + 31);
  ctx.restore();

  // Scrollable content area — STORY-00319: clip within safe area
  const CLIP_TOP = (G.SAFE_TOP || 0) + 58;
  ctx.save();
  ctx.beginPath();
  ctx.rect(SL - 12, CLIP_TOP, W - SL + 12 - SR + 12, H - CLIP_TOP);
  ctx.clip();
  ctx.translate(0, -_detailScrollY + CLIP_TOP);

  let oy = 14; // offset y (within scrollable area, relative to CLIP_TOP)

  // Card geometry — STORY-00319: use safe area margins
  const cardX = SL;
  const cardW = W - SL - SR;
  const unlocked = state.isUnlocked(_detailIdx);

  // ── Name + Icon row (compact) — STORY-00319: icon inline with name, no large separate block
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? '#f0eaff' : 'rgba(150,140,180,0.6)';
  ctx.fillText(c.nameZh, W / 2, oy + 14);
  oy += 30;

  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(160,150,200,0.8)';
  ctx.fillText(c.nameEn, W / 2, oy);
  oy += 24;
  ctx.restore();

  if (!unlocked) {
    ctx.save();
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,140,180,0.7)';
    ctx.fillText('🔒 完成关卡后解锁', W / 2, oy + 16);
    ctx.restore();
    oy += 50;
  } else {
    // ── Info pills ──
    const infos = [
      { label: '📍', value: c.region || '—' },
      { label: '🗓', value: '最佳观测：' + (c.bestViewMonth || '—') },
      { label: '⭐', value: c.mainStars || '—' },
    ];
    for (const info of infos) {
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200,195,240,0.85)';
      ctx.fillText(info.label + ' ' + info.value, cardX, oy);
      oy += 22;
      ctx.restore();
    }
    oy += 8;

    // ── Star chart — STORY-00319: kept, 55% card width max 170px
    if (c.stars && c.stars.length > 0) {
      const CHART_SIZE = Math.min(cardW * 0.55, 170);
      const chartX = cardX + (cardW - CHART_SIZE) / 2;
      const chartY = oy;
      const PAD = 18;
      const AREA = CHART_SIZE - PAD * 2;

      // Background circle
      ctx.save();
      ctx.fillStyle = 'rgba(10,10,30,0.75)';
      ctx.strokeStyle = 'rgba(100,90,180,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, CHART_SIZE / 2, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, CHART_SIZE / 2 - 2, 0, TWO_PI);
      ctx.clip();

      // Map star positions
      const mappedStars = c.stars.map(s => ({
        x: chartX + PAD + s.x * AREA,
        y: chartY + PAD + s.y * AREA,
        r: Math.min(magToRadius(s.mag), 6),
        color: typeToColor(s.type),
      }));

      // Draw constellation lines
      ctx.strokeStyle = 'rgba(255,215,0,0.55)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(255,215,0,0.3)';
      ctx.shadowBlur = 3;
      for (const [a, b] of (c.lines || [])) {
        if (!mappedStars[a] || !mappedStars[b]) continue;
        ctx.beginPath();
        ctx.moveTo(mappedStars[a].x, mappedStars[a].y);
        ctx.lineTo(mappedStars[b].x, mappedStars[b].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Draw stars with glow
      for (const s of mappedStars) {
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
        grd.addColorStop(0, s.color);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
        ctx.fill();
      }

      // STORY-00331 (CR-128): Star name labels for bright stars (mag≤2.5)
      const chartCx = chartX + CHART_SIZE / 2;
      const chartCy = chartY + CHART_SIZE / 2;
      // Sort by magnitude (brightest first), take up to 5
      const brightStars = c.stars
        .map((s, i) => ({ ...s, mapped: mappedStars[i] }))
        .filter(s => s.mag <= 2.5 && s.mapped)
        .sort((a, b) => a.mag - b.mag)
        .slice(0, 5);

      const labelPositions = []; // for anti-overlap
      ctx.save();
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.strokeStyle = 'rgba(255,255,255,0.50)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);

      for (const bs of brightStars) {
        const mx = bs.mapped.x;
        const my = bs.mapped.y;
        // Direction: angle from chart center to star + 45° offset
        const baseAngle = Math.atan2(my - chartCy, mx - chartCx);
        const labelAngle = baseAngle + Math.PI / 4;
        const lineLen = 8;
        const lx = mx + Math.cos(labelAngle) * lineLen;
        const ly = my + Math.sin(labelAngle) * lineLen;

        // Anti-overlap: check against already placed labels
        let finalLy = ly;
        for (const pos of labelPositions) {
          if (Math.abs(lx - pos.x) < 28 && Math.abs(finalLy - pos.y) < 12) {
            finalLy -= 10;
          }
        }
        labelPositions.push({ x: lx, y: finalLy });

        // Draw dashed pointer line
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(lx, finalLy);
        ctx.stroke();

        // Draw label text
        ctx.textAlign = lx >= chartCx ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(bs.name, lx + (lx >= chartCx ? 2 : -2), finalLy);
      }
      ctx.setLineDash([]);
      ctx.restore();

      ctx.restore();

      oy += CHART_SIZE + 12;
    }

    // ── Photo carousel — STORY-00319 (CR-116): height 180px, fallback "📷 暂无图片" ──
    // STORY-00332 (CR-129): section header + wx.downloadFile loading
    const photos = c.photos || (c.photo ? [c.photo] : []);
    if (_carouselForIdx !== _detailIdx) {
      _carouselForIdx = _detailIdx;
      _carouselImgs = [];
      photos.forEach((url, i) => _loadPhotoAtPos(url, i, _detailIdx));
    }

    // Section header "天文摄影 · ASTROPHOTOGRAPHY"
    if (photos.length > 0) {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('天文摄影 · ASTROPHOTOGRAPHY', cardX, oy + 8);
      ctx.restore();
      oy += 22;
    }

    const PHOTO_H = 180;  // STORY-00319: was 160 — taller for better photo framing
    const photoX = cardX;
    const photoW = cardW;
    const slot = _carouselImgs[_carouselPos] || { img: null, loaded: false, error: false };

    ctx.save();
    // Photo background
    ctx.fillStyle = 'rgba(30,25,60,0.7)';
    _roundRect(ctx, photoX, oy, photoW, PHOTO_H, 8);
    ctx.fill();
    // Clip for image/text
    _roundRect(ctx, photoX, oy, photoW, PHOTO_H, 8);
    ctx.clip();
    if (slot.loaded && slot.img) {
      ctx.drawImage(slot.img, photoX, oy, photoW, PHOTO_H);
    } else if (slot.error || photos.length === 0) {
      // STORY-00319: no photos or failed load — "📷 暂无图片" placeholder
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(180,170,220,0.5)';
      ctx.fillText('📷', photoX + photoW / 2, oy + PHOTO_H / 2 - 16);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(160,150,200,0.65)';
      ctx.fillText('暂无图片', photoX + photoW / 2, oy + PHOTO_H / 2 + 14);
    } else {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(160,150,200,0.7)';
      ctx.fillText('加载中...', photoX + photoW / 2, oy + PHOTO_H / 2);
    }
    ctx.restore();

    // Carousel navigation buttons (‹ and ›) overlaid on photo
    if (photos.length > 1) {
      const BTN_W = 32;
      const BTN_H = 44;
      const BTN_Y = oy + (PHOTO_H - BTN_H) / 2;
      // Prev button ‹
      ctx.save();
      ctx.globalAlpha = _carouselPos > 0 ? 0.85 : 0.25;
      ctx.fillStyle = 'rgba(20,15,50,0.75)';
      _roundRect(ctx, photoX + 4, BTN_Y, BTN_W, BTN_H, 6);
      ctx.fill();
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d0c8ff';
      ctx.fillText('‹', photoX + 4 + BTN_W / 2, BTN_Y + BTN_H / 2);
      ctx.restore();
      _carouselPrevRect = { x: photoX + 4, y: BTN_Y, w: BTN_W, h: BTN_H };

      // Next button ›
      ctx.save();
      ctx.globalAlpha = _carouselPos < photos.length - 1 ? 0.85 : 0.25;
      ctx.fillStyle = 'rgba(20,15,50,0.75)';
      _roundRect(ctx, photoX + photoW - BTN_W - 4, BTN_Y, BTN_W, BTN_H, 6);
      ctx.fill();
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d0c8ff';
      ctx.fillText('›', photoX + photoW - BTN_W - 4 + BTN_W / 2, BTN_Y + BTN_H / 2);
      ctx.restore();
      _carouselNextRect = { x: photoX + photoW - BTN_W - 4, y: BTN_Y, w: BTN_W, h: BTN_H };

      // Index indicator (N/total)
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(220,215,255,0.9)';
      ctx.fillText((_carouselPos + 1) + '/' + photos.length, photoX + photoW / 2, oy + PHOTO_H - 10);
      ctx.restore();
    } else {
      _carouselPrevRect = null;
      _carouselNextRect = null;
    }
    oy += PHOTO_H + 10;

    // ── Divider ──
    ctx.save();
    ctx.strokeStyle = 'rgba(120,100,200,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, oy);
    ctx.lineTo(cardX + cardW, oy);
    ctx.stroke();
    ctx.restore();
    oy += 14;

    // ── Lore ──
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(210,205,240,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = _wrapText(ctx, c.lore || '', cardW);
    for (const line of lines) {
      ctx.fillText(line, cardX, oy);
      oy += 18;
    }
    ctx.restore();
    oy += 20;
  }

  // ── Bottom return button — STORY-00319: always at bottom, above SAFE_BOTTOM ──
  const btnH = 38;
  _detailBottomBackRect = { x: cardX + cardW / 2 - 60, y: oy, w: 120, h: btnH };
  drawButton(ctx, cardX + cardW / 2 - 60, oy, 120, btnH, '← 返回列表', {
    fontSize: 13, radius: 10,
    color0: 'rgba(60,50,120,0.85)', color1: 'rgba(40,35,90,0.85)',
  });
  oy += btnH + (G.SAFE_BOTTOM || 0) + 20;

  _detailTotalH = oy;

  ctx.restore();
}

// ── Photo loader ──────────────────────────────────────────────
// STORY-00332 (CR-129): Use wx.downloadFile() then wx.createImage() with local path.
// wx.createImage() with direct external URLs requires the domain in the "download domain"
// whitelist (WeChat developer console). wx.downloadFile() is the correct pattern for
// loading external images in mini games.
function _loadPhotoAtPos(url, pos, constellationIdx) {
  if (!url) {
    _carouselImgs[pos] = { img: null, loaded: false, error: true };
    return;
  }
  _carouselImgs[pos] = { img: null, loaded: false, error: false };
  try {
    // First attempt: wx.downloadFile to get a local temp file path
    wx.downloadFile({
      url,
      success(res) {
        if (_carouselForIdx !== constellationIdx) return;
        if (res.statusCode === 200) {
          const img = wx.createImage();
          const timer = setTimeout(() => {
            if (_carouselImgs[pos] && !_carouselImgs[pos].loaded) {
              _carouselImgs[pos] = { img: null, loaded: false, error: true };
            }
          }, 5000);
          img.onload = () => {
            clearTimeout(timer);
            if (_carouselForIdx === constellationIdx) {
              _carouselImgs[pos] = { img, loaded: true, error: false };
            }
          };
          img.onerror = () => {
            clearTimeout(timer);
            console.warn('[gallery] img.onerror for local path:', res.tempFilePath);
            if (_carouselForIdx === constellationIdx) {
              _carouselImgs[pos] = { img: null, loaded: false, error: true };
            }
          };
          img.src = res.tempFilePath;
        } else {
          console.warn('[gallery] downloadFile bad status:', res.statusCode, url);
          if (_carouselForIdx === constellationIdx) {
            _carouselImgs[pos] = { img: null, loaded: false, error: true };
          }
        }
      },
      fail(err) {
        console.warn('[gallery] downloadFile fail:', err.errMsg, url);
        // Fallback: try direct wx.createImage() with original URL
        _loadPhotoFallback(url, pos, constellationIdx);
      },
    });
  } catch (e) {
    _loadPhotoFallback(url, pos, constellationIdx);
  }
}

function _loadPhotoFallback(url, pos, constellationIdx) {
  try {
    const img = wx.createImage();
    const timer = setTimeout(() => {
      if (_carouselImgs[pos] && !_carouselImgs[pos].loaded) {
        _carouselImgs[pos] = { img: null, loaded: false, error: true };
      }
    }, 8000);
    img.onload = () => {
      clearTimeout(timer);
      if (_carouselForIdx === constellationIdx) {
        _carouselImgs[pos] = { img, loaded: true, error: false };
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      console.warn('[gallery] fallback onerror:', url);
      if (_carouselForIdx === constellationIdx) {
        _carouselImgs[pos] = { img: null, loaded: false, error: true };
      }
    };
    img.src = url;
  } catch (e) {
    if (_carouselForIdx === constellationIdx) {
      _carouselImgs[pos] = { img: null, loaded: false, error: true };
    }
  }
}

// ── Text wrap helper ──────────────────────────────────────────
function _wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// ── Touch handling ────────────────────────────────────────────
function _onTouchStart(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  if (_view === 'list') {
    _lastTouchY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
    _isDragging = false;
  } else {
    _detailLastTY  = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
    _detailDragging = false;
  }
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;

  if (_view === 'list') {
    const rawY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
    const dy = rawY - _lastTouchY;
    _lastTouchY = rawY;
    if (Math.abs(dy) > 3) _isDragging = true;
    const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget - dy));
  } else {
    const rawY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
    const dy = rawY - _detailLastTY;
    _detailLastTY = rawY;
    if (Math.abs(dy) > 3) _detailDragging = true;
    const maxScroll = Math.max(0, _detailTotalH - G.SCREEN_H + G.SAFE_TOP + 58 + G.SAFE_BOTTOM);
    _detailScrollTarget = Math.max(0, Math.min(maxScroll, _detailScrollTarget - dy));
  }
}

function _onTouchEnd(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;  // fixed: revert incorrect DPR (STORY-00269)
  const ty = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)

  if (_view === 'list') {
    if (_isDragging) { _isDragging = false; return; }

    if (_backRect && hitTest(_backRect, tx, ty)) {
      if (_navigate) _navigate('menu');  // STORY-00302: was 'levels' — gallery back should go to menu
      return;
    }
    const ayy = ty + _scrollY;
    for (const cr of _cardRects) {
      if (tx >= cr.x && tx <= cr.x + cr.w && ayy >= cr.y && ayy <= cr.y + cr.h) {
        if (!state.isUnlocked(cr.idx)) {
          try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
          return;
        }
        _detailIdx = cr.idx;
        _detailScrollY = _detailScrollTarget = 0;
        _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
        _view = 'detail';
        return;
      }
    }
  } else {
    if (_detailDragging) { _detailDragging = false; return; }

    if (_detailBackRect && hitTest(_detailBackRect, tx, ty)) {
      _view = 'list';
      return;
    }
    if (_detailPrevRect && hitTest(_detailPrevRect, tx, ty)) {
      // Find previous unlocked constellation
      for (let i = _detailIdx - 1; i >= 0; i--) {
        if (state.isUnlocked(i)) {
          _detailIdx = i;
          _detailScrollY = _detailScrollTarget = 0;
          _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
          break;
        }
      }
      return;
    }
    if (_detailNextRect && hitTest(_detailNextRect, tx, ty)) {
      // Find next unlocked constellation
      for (let i = _detailIdx + 1; i < CONSTELLATIONS.length; i++) {
        if (state.isUnlocked(i)) {
          _detailIdx = i;
          _detailScrollY = _detailScrollTarget = 0;
          _carouselPos = 0; _carouselForIdx = -1; _carouselImgs = [];
          break;
        }
      }
      return;
    }
    // Carousel navigation (adjust for scroll offset)
    const CLIP_TOP = (G.SAFE_TOP || 0) + 58;
    const scrolledTY = ty + _detailScrollY - CLIP_TOP;
    if (_carouselPrevRect && hitTest({ x: _carouselPrevRect.x, y: _carouselPrevRect.y, w: _carouselPrevRect.w, h: _carouselPrevRect.h }, tx, scrolledTY)) {
      const c = CONSTELLATIONS[_detailIdx];
      const photos = c.photos || (c.photo ? [c.photo] : []);
      if (_carouselPos > 0) { _carouselPos--; }
      return;
    }
    if (_carouselNextRect && hitTest({ x: _carouselNextRect.x, y: _carouselNextRect.y, w: _carouselNextRect.w, h: _carouselNextRect.h }, tx, scrolledTY)) {
      const c = CONSTELLATIONS[_detailIdx];
      const photos = c.photos || (c.photo ? [c.photo] : []);
      if (_carouselPos < photos.length - 1) { _carouselPos++; }
      return;
    }
    // Bottom return button (STORY-00319: scroll-adjusted hit test)
    if (_detailBottomBackRect && hitTest({ x: _detailBottomBackRect.x, y: _detailBottomBackRect.y, w: _detailBottomBackRect.w, h: _detailBottomBackRect.h }, tx, scrolledTY)) {
      _view = 'list';
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
