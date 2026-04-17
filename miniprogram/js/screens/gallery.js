// gallery.js — Canvas 星座展厅（微信小游戏版）
// 两级界面：列表（卡片网格）→ 详情（单星座介绍）

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, hitTest,
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

// Layout
const COLS    = 3;
const PAD_X   = 12;
const GAP     = 8;

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
}

function _computeLayout() {
  const SL     = (G.SAFE_LEFT  || 0) + PAD_X;
  const SR     = (G.SAFE_RIGHT || 0) + PAD_X;
  const usableW = G.SCREEN_W - SL - SR;
  const PAD_TOP = G.SAFE_TOP + 76;  // below back button + notch
  _cardRects = [];
  const CARD_W = Math.floor((usableW - GAP * (COLS - 1)) / COLS);
  const CARD_H = CARD_W + 24;
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
  ctx.fillText('星座展厅', W / 2, G.SAFE_TOP + 31);
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
  _roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = unlocked ? 'rgba(120,100,220,0.7)' : 'rgba(60,60,100,0.3)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  // Icon
  ctx.save();
  ctx.globalAlpha = unlocked ? 0.9 : 0.25;
  ctx.font = `${Math.round(w * 0.38)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.icon || '✨', x + w / 2, y + h * 0.40);
  ctx.restore();

  // Name
  ctx.save();
  ctx.font = `bold ${w > 90 ? 13 : 11}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? '#e0d8ff' : 'rgba(100,100,140,0.5)';
  ctx.fillText(c.nameZh, x + w / 2, y + h * 0.72);
  ctx.restore();

  // Locked indicator
  if (!unlocked) {
    ctx.save();
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.4;
    ctx.fillText('🔒', x + w / 2, y + h * 0.88);
    ctx.restore();
  } else {
    // Stars
    const score = state.getScore(idx);
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.starGold;
    const stars = score && score.stars > 0
      ? '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars)
      : '☆☆☆';
    ctx.fillText(stars, x + w / 2, y + h * 0.88);
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

  // Fixed top bar
  _detailBackRect = drawButton(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 88, 38, '← 返回', {
    fontSize: 14, radius: 10,
    color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
  });
  // Show prev only if there's a previous unlocked constellation
  const hasPrev = Array.from({ length: _detailIdx }, (_, i) => i).some(i => state.isUnlocked(i));
  _detailPrevRect = hasPrev
    ? drawButton(ctx, W / 2 - 120, G.SAFE_TOP + 14, 50, 34, '上一个', {
        fontSize: 11, radius: 8,
        color0: 'rgba(40,60,120,0.7)', color1: 'rgba(30,80,160,0.7)',
      })
    : null;
  // Show next only if there's a next unlocked constellation
  const hasNext = Array.from({ length: CONSTELLATIONS.length - _detailIdx - 1 }, (_, i) => _detailIdx + 1 + i).some(i => state.isUnlocked(i));
  _detailNextRect = hasNext
    ? drawButton(ctx, W / 2 + 70, G.SAFE_TOP + 14, 50, 34, '下一个', {
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
  ctx.fillText((_detailIdx + 1) + ' / ' + CONSTELLATIONS.length, W / 2, G.SAFE_TOP + 31);
  ctx.restore();

  // Scrollable content area
  const CLIP_TOP = G.SAFE_TOP + 58;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CLIP_TOP, W, H - CLIP_TOP);
  ctx.clip();
  ctx.translate(0, -_detailScrollY + CLIP_TOP);

  let oy = 14; // offset y (within scrollable area, relative to CLIP_TOP)

  // Card background
  const cardX = 14;
  const cardW = W - 28;
  const unlocked = state.isUnlocked(_detailIdx);

  // ── Icon (large) ──
  ctx.save();
  ctx.font = '52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = unlocked ? 0.9 : 0.3;
  ctx.fillText(c.icon || '✨', W / 2, oy + 34);
  ctx.restore();
  oy += 78;

  // ── Name ──
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = unlocked ? '#f0eaff' : 'rgba(150,140,180,0.6)';
  ctx.fillText(c.nameZh, W / 2, oy);
  oy += 28;

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(160,150,200,0.8)';
  ctx.fillText(c.nameEn, W / 2, oy);
  oy += 28;
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
      ctx.fillText(info.label + ' ' + info.value, cardX + 8, oy);
      oy += 22;
      ctx.restore();
    }
    oy += 10;

    // ── Star chart (STORY-00251) ─────────────────────────────
    if (c.stars && c.stars.length > 0) {
      const CHART_SIZE = Math.min(cardW - 24, 200);
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
      ctx.restore();

      oy += CHART_SIZE + 12;
    }

    // ── Photo carousel ──
    const photos = c.photos || (c.photo ? [c.photo] : []);
    if (_carouselForIdx !== _detailIdx) {
      _carouselForIdx = _detailIdx;
      _carouselImgs = [];
      photos.forEach((url, i) => _loadPhotoAtPos(url, i, _detailIdx));
    }
    const PHOTO_H = 160;
    const photoX = cardX + 8;
    const photoW = cardW - 16;
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
    } else if (slot.error) {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(160,150,200,0.7)';
      ctx.fillText('暂无图片', photoX + photoW / 2, oy + PHOTO_H / 2);
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
    ctx.moveTo(cardX + 8, oy);
    ctx.lineTo(cardX + cardW - 8, oy);
    ctx.stroke();
    ctx.restore();
    oy += 14;

    // ── Lore ──
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(210,205,240,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = _wrapText(ctx, c.lore || '', cardW - 16);
    for (const line of lines) {
      ctx.fillText(line, cardX + 8, oy);
      oy += 18;
    }
    ctx.restore();
    oy += 24;
  }

  _detailTotalH = oy;

  ctx.restore();
}

// ── Photo loader ──────────────────────────────────────────────
function _loadPhotoAtPos(url, pos, constellationIdx) {
  if (!url) {
    _carouselImgs[pos] = { img: null, loaded: false, error: true };
    return;
  }
  _carouselImgs[pos] = { img: null, loaded: false, error: false };
  try {
    const img = wx.createImage();
    img.onload  = () => {
      if (_carouselForIdx === constellationIdx) {
        _carouselImgs[pos] = { img, loaded: true, error: false };
      }
    };
    img.onerror = () => {
      if (_carouselForIdx === constellationIdx) {
        _carouselImgs[pos] = { img: null, loaded: false, error: true };
      }
    };
    img.src = url;
  } catch (e) {
    _carouselImgs[pos] = { img: null, loaded: false, error: true };
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
    _lastTouchY = touch.clientY * G.DPR;  // fixed: DPR correction (STORY-00266)
    _isDragging = false;
  } else {
    _detailLastTY  = touch.clientY * G.DPR;  // fixed: DPR correction (STORY-00266)
    _detailDragging = false;
  }
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;

  if (_view === 'list') {
    const rawY = touch.clientY * G.DPR;  // fixed: DPR correction (STORY-00266)
    const dy = rawY - _lastTouchY;
    _lastTouchY = rawY;
    if (Math.abs(dy) > 3) _isDragging = true;
    const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget - dy));
  } else {
    const rawY = touch.clientY * G.DPR;  // fixed: DPR correction (STORY-00266)
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
  const tx = touch.clientX * G.DPR;  // fixed: DPR correction (STORY-00266)
  const ty = touch.clientY * G.DPR;  // fixed: DPR correction (STORY-00266)

  if (_view === 'list') {
    if (_isDragging) { _isDragging = false; return; }

    if (_backRect && hitTest(_backRect, tx, ty)) {
      if (_navigate) _navigate('levels');
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
    const scrolledTY = ty + _detailScrollY - (G.SAFE_TOP + 58);
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
