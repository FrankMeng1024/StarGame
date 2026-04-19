// levels.js — Canvas 选关屏幕（微信小游戏版）
// 替代原版 DOM screen-levels，纯 Canvas 2D 绘制

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawCard, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import { ITEMS } from './shop.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate     = null;
let _rafId        = null;
let _cardRects    = [];   // [{x,y,w,h,idx}]
let _backRect     = null;
let _shopRect     = null;  // STORY-00282: shop shortcut
let _scrollY      = 0;
let _scrollTarget = 0;
let _lastTouchY   = 0;
let _isDragging   = false;
let _totalH       = 0;
let _scrollVelocity = 0;  // for momentum scrolling
let _lastTouchTime  = 0;

// Layout constants (computed at showLevels time, not module load)
const PAD_X   = 12;
const GAP     = 8;

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
  const isLandscape = G.SCREEN_W > G.SCREEN_H;
  const COLS   = isLandscape ? 6 : 5;  // STORY-00288: landscape 5→6 (reverts STORY-00281 change, user wants smaller cards)
  const SL     = G.SAFE_LEFT  + PAD_X;  // safe left inset
  const SR     = G.SAFE_RIGHT + PAD_X;  // safe right inset
  const usableW = G.SCREEN_W - SL - SR;
  const PAD_TOP = G.SAFE_TOP + 56;  // below back button + notch
  _cardRects = [];
  const CARD_W = Math.floor((usableW - (COLS - 1) * GAP) / COLS);
  const CARD_H = CARD_W;  // square cards
  const rows = Math.ceil(CONSTELLATIONS.length / COLS);
  _totalH = PAD_TOP + rows * (CARD_H + GAP) + 16 + G.SAFE_BOTTOM;

  CONSTELLATIONS.forEach((c, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x   = SL + col * (CARD_W + GAP);
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

  // Smooth scroll with momentum
  if (!_isDragging) {
    _scrollTarget += _scrollVelocity;
    _scrollVelocity *= 0.88;  // friction
    const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget));
  }
  _scrollY += (_scrollTarget - _scrollY) * 0.22;

  // Background
  const scene = _getSceneBg();
  drawSkyBg(ctx, W, H, scene.sky0, scene.sky1, scene.sky2);
  drawBgStars(ctx, t);

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

  // Title
  ctx.save();
  ctx.font        = 'bold 18px sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle   = COLORS.text;
  ctx.fillText('选择关卡', W / 2, G.SAFE_TOP + 29);
  ctx.restore();

  // ── Scrollable card area ──────────────────────────────────
  const padTop = G.SAFE_TOP + 56;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  for (const cr of _cardRects) {
    _drawCard(ctx, cr, t);
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

function _drawCard(ctx, cr, t) {
  const { x, y, w, h, idx } = cr;
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);

  // Card background
  const bgAlpha = unlocked ? 0.88 : 0.45;
  ctx.save();
  ctx.globalAlpha = bgAlpha;
  ctx.fillStyle   = unlocked ? COLORS.cardBg : 'rgba(20,20,40,0.7)';
  _roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.restore();

  // Border: gradient for unlocked (gold→purple), flat for locked (STORY-00281)
  ctx.save();
  if (unlocked) {
    const borderGrd = ctx.createLinearGradient(x, y, x, y + h);
    borderGrd.addColorStop(0, 'rgba(255,200,50,0.70)');
    borderGrd.addColorStop(1, 'rgba(120,50,200,0.50)');
    ctx.strokeStyle = borderGrd;
    ctx.lineWidth   = 1.2;
  } else {
    ctx.strokeStyle = 'rgba(80,80,120,0.3)';
    ctx.lineWidth   = 1;
  }
  _roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.restore();

  // Constellation abbreviation (STORY-00288: first 2 chars of nameZh — more reliable than emoji)
  const conAbbr = (c.nameZh || c.name || '').substring(0, 2);
  if (unlocked && conAbbr) {
    ctx.save();
    ctx.font         = `${Math.round(w * 0.18)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = 0.70;
    ctx.fillStyle    = 'rgba(200,180,255,1)';
    ctx.fillText(conAbbr, x + w / 2, y + h * 0.24);
    ctx.restore();
  }

  // Level number — smaller (STORY-00281: 0.40 → 0.28) or lock icon
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  if (unlocked) {
    ctx.font      = `bold ${Math.round(w * 0.28)}px sans-serif`;
    ctx.fillStyle = COLORS.starGold;
    ctx.globalAlpha = 0.95;
    // STORY-00288: adjusted y positions; Arch review: corrected to spec (h*0.45/0.40)
    ctx.fillText(String(idx + 1), x + w / 2, y + h * (conAbbr ? 0.45 : 0.40));
  } else {
    ctx.font      = `${Math.round(w * 0.38)}px sans-serif`;
    ctx.globalAlpha = 0.35;
    ctx.fillText('🔒', x + w / 2, y + h * 0.42);
  }
  ctx.restore();

  // Name
  const nameFontSize = Math.max(7, Math.min(9, Math.round(w * 0.14)));  // STORY-00288: smaller (was max(8,min(10,w*0.16)))
  ctx.save();
  ctx.font         = `bold ${nameFontSize}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = unlocked ? COLORS.text : 'rgba(120,120,160,0.5)';
  ctx.fillText(c.nameZh || c.name, x + w / 2, y + h * 0.70);  // STORY-00288: was h*0.72
  ctx.restore();

  // Difficulty dots — smaller max radius (STORY-00281: max 2.5 was 3)
  const diff   = Math.max(1, Math.min(5, c.difficulty || 1));
  const dotR   = Math.max(2, Math.min(2.5, w * 0.03));
  const dotGap = dotR * 2.6;
  const dotY   = y + h * 0.87;
  const dotStartX = x + w / 2 - (4 * dotGap) / 2;
  for (let di = 0; di < 5; di++) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(dotStartX + di * dotGap, dotY, dotR, 0, Math.PI * 2);
    if (di < diff) {
      ctx.fillStyle = unlocked ? '#ffd700' : 'rgba(200,170,0,0.45)';
    } else {
      ctx.fillStyle = unlocked ? 'rgba(180,180,220,0.25)' : 'rgba(100,100,140,0.2)';
    }
    ctx.fill();
    ctx.restore();
  }

  // Score stars — bottom-right corner badge (STORY-00281: was center-bottom row)
  if (unlocked && score && score.stars > 0) {
    ctx.save();
    ctx.font        = `${Math.max(8, Math.round(w * 0.12))}px sans-serif`;
    ctx.textAlign   = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle   = COLORS.starGold;
    const stars = '★'.repeat(score.stars);
    ctx.fillText(stars, x + w - 3, y + h - 2);
    ctx.restore();
  }
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
  const FOOTER_H = 60;   // bottom buttons area
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

  // Title
  ctx.save();
  ctx.font         = 'bold 17px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text;
  ctx.fillText('选择使用道具', W / 2, cardY + 30);
  ctx.restore();

  // Sub-title
  ctx.save();
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text2;
  ctx.fillText('（本关结束后自动消耗）', W / 2, cardY + 54);
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

    // Icon + name + desc
    ctx.save();
    ctx.font         = '22px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cardX + 18, rowY + rowH * 0.5 - 4);
    ctx.restore();

    ctx.save();
    ctx.font         = 'bold 14px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLORS.text;
    ctx.fillText(it.nameZh + '  ×' + qty, cardX + 50, rowY + 8);
    ctx.restore();

    ctx.save();
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLORS.text2;
    ctx.fillText(it.desc, cardX + 50, rowY + 28);
    ctx.restore();

    // Toggle button — record in content-space (before scroll offset removed)
    const btnW = 58, btnH = 30;
    const btnX = cardX + cardW - 18 - btnW;
    const btnY = rowY + (rowH - 5 - btnH) / 2;
    const btn = drawButton(ctx, btnX, btnY, btnW, btnH, toggled ? '✓ 已选' : '使用', {
      fontSize: 12,
      radius: 8,
      color0: toggled ? 'rgba(30,140,70,0.85)' : 'rgba(60,90,160,0.85)',
      color1: toggled ? 'rgba(20,180,80,0.85)' : 'rgba(50,110,200,0.85)',
    });
    // Store btn in content-space y (caller adjusts for scroll)
    _overlayBtnRects.push({ id: it.id, rect: btn });
  });

  ctx.restore();

  // Bottom buttons: 跳过 + 确定出发 (outside clip, always visible)
  const btnY2  = cardY + cardH - 52;
  const btnW2  = (cardW - 36) / 2;
  _overlaySkip    = drawButton(ctx, cardX + 10,               btnY2, btnW2, 40, '跳过', {
    fontSize: 14, radius: 10,
    color0: 'rgba(60,60,100,0.75)', color1: 'rgba(80,80,130,0.75)',
  });
  _overlayConfirm = drawButton(ctx, cardX + cardW - 10 - btnW2, btnY2, btnW2, 40, '确定出发 →', {
    fontSize: 14, radius: 10,
    color0: 'rgba(30,130,60,0.85)', color1: 'rgba(20,180,80,0.85)',
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

  // Card tap (adjust for scroll)
  const ayy = ty + _scrollY;  // scroll-adjusted y
  for (const cr of _cardRects) {
    if (tx >= cr.x && tx <= cr.x + cr.w && ayy >= cr.y && ayy <= cr.y + cr.h) {
      if (!state.isUnlocked(cr.idx)) return;
      state.currentLevel = cr.idx;
      console.log('navigate:game idx=' + cr.idx);

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
