// shop.js — Canvas 道具商店（微信小游戏版）
// 展示8种道具，玩家可用金币购买

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── Item definitions — STORY-00296: aligned to web version prices + star_map replaces star_magnet ──
export const ITEMS = [
  { id: 'net_speed',     icon: '⚡', nameZh: '网兜加速',   desc: '激活后15秒网兜速度+50%',       type: '主动', duration: '15秒', cost: 50 },
  { id: 'net_enlarge',  icon: '🪢', nameZh: '网兜扩大',   desc: '激活后15秒网兜口径增大50%',     type: '主动', duration: '15秒', cost: 60 },
  { id: 'space_bomb',   icon: '💣', nameZh: '宇宙炸弹',   desc: '摧毁当前抓住的垃圾并重置网兜',  type: '主动', duration: '即时', cost: 100 },
  { id: 'time_ext',     icon: '⏱', nameZh: '时间延长',   desc: '即时+20秒剩余时间',             type: '主动', duration: '即时', cost: 60 },
  { id: 'shrink_debris',icon: '🔬', nameZh: '缩小垃圾',   desc: '激活后30秒所有垃圾缩小50%',     type: '主动', duration: '30秒', cost: 40 },
  { id: 'star_map',     icon: '🗺', nameZh: '星图揭示',   desc: '激活后60秒显示星座连线提示',    type: '主动', duration: '60秒', cost: 20 },
  { id: 'glove',        icon: '🧤', nameZh: '宇航员手套', desc: '激活后30秒抓垃圾不减速',        type: '主动', duration: '30秒', cost: 70 },
  { id: 'double_coins', icon: '🪙', nameZh: '双倍金币',   desc: '本关金币奖励自动×2（被动）',    type: '被动', duration: '全局', cost: 30 },
];

// ── Module state ──────────────────────────────────────────────
let _navigate    = null;
let _rafId       = null;
let _backRect    = null;
let _buyRects    = [];   // [{rect, itemIdx}]
let _scrollY     = 0;
let _scrollTarget = 0;
let _lastTouchY  = 0;
let _isDragging  = false;
let _totalH      = 0;
let _feedback    = null; // { msg, until } — brief purchase feedback
let _maShanZhengLoaded = false; // SPRINT-51: font load flag

// Layout — 2-column grid (STORY-00309: web parity)
const CARD_H    = 116;  // STORY-00329: was 100 — +16 for description line
const CARD_GAP  = 8;
const PAD_X     = 10;
const COLS      = 2;

// ── Public API ────────────────────────────────────────────────
export function showShop(navigate) {
  _navigate = navigate;
  _cleanup();
  initBgStars(G.SCREEN_W, G.SCREEN_H, 50);
  _computeLayout();

  // SPRINT-51: load Ma Shan Zheng font (match levels/gallery standard)
  if (!_maShanZhengLoaded) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.loadFontFace === 'function') {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _maShanZhengLoaded = true; },
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

export function hideShop() {
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
  _backRect = null;
  _buyRects = [];
  _scrollY  = _scrollTarget = 0;
  _feedback = null;
}

function _computeLayout() {
  const padTop = G.SAFE_TOP + 70;  // below back button + notch
  const rows = Math.ceil(ITEMS.length / COLS);
  _totalH = padTop + rows * (CARD_H + CARD_GAP) + 24 + G.SAFE_BOTTOM;
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  drawSkyBg(ctx, W, H, '#07061c', '#0c0a30', '#060618');
  drawBgStars(ctx, t);

  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  // ── Fixed header ──
  _backRect = drawButton(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 88, 38, '← 返回', {
    fontSize: 14, radius: 10,
    color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
  });

  ctx.save();
  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.font = `bold 22px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = 'rgba(160,120,255,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('道具商店', W / 2, G.SAFE_TOP + 31);
  ctx.restore();

  // Coin balance
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.fillText('🪙 ' + state.coins, W - G.SAFE_RIGHT - 12, G.SAFE_TOP + 29);
  ctx.restore();

  // ── Scrollable item grid ──
  _buyRects = [];

  const padTop = G.SAFE_TOP + 60;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  const safeL = G.SAFE_LEFT || 0;
  const safeR = G.SAFE_RIGHT || 0;
  const gridW = W - safeL - safeR - PAD_X * 2;
  const colW  = (gridW - CARD_GAP) / COLS;

  ITEMS.forEach((item, i) => {
    const col  = i % COLS;
    const row  = Math.floor(i / COLS);
    const cardX = safeL + PAD_X + col * (colW + CARD_GAP);
    const cardY = padTop + row * (CARD_H + CARD_GAP);
    _drawItemCard(ctx, W, item, i, cardX, cardY, colW);
  });

  ctx.restore();

  // ── Feedback toast ──
  if (_feedback && Date.now() < _feedback.expiresAt) {
    const alpha = Math.min(1, (_feedback.expiresAt - Date.now()) / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _feedback.error ? 'rgba(200,60,60,0.92)' : 'rgba(30,200,120,0.92)';
    _roundRect(ctx, W / 2 - 90, H / 2 - 20, 180, 40, 10);
    ctx.fill();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(_feedback.msg, W / 2, H / 2);
    ctx.restore();
  }

  // Global fade overlay (STORY-00282)
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

function _drawItemCard(ctx, W, item, idx, cardX, cardY, cardW) {
  const owned  = state.getItemQty(item.id);
  const canBuy = state.coins >= item.cost;

  // Card bg — deep blue-purple gradient (STORY-00320)
  ctx.save();
  const bgGrd = ctx.createLinearGradient(cardX, cardY, cardX, cardY + CARD_H);
  bgGrd.addColorStop(0, 'rgba(12,8,40,0.92)');
  bgGrd.addColorStop(1, 'rgba(20,14,60,0.85)');
  ctx.fillStyle = bgGrd;
  _roundRect(ctx, cardX, cardY, cardW, CARD_H, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const cx = cardX + cardW / 2;
  const iconCx = cx;
  const iconCy = cardY + 22;

  // Canvas-drawn icon (STORY-00320: no emoji)
  _drawItemIcon(ctx, item.id, iconCx, iconCy, 16);

  // Name
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e0ff';
  ctx.fillText(item.nameZh, cx, cardY + 42);
  ctx.restore();

  // Description (STORY-00329: CR-126)
  if (item.desc) {
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    // Truncate to card width
    let descText = item.desc;
    const maxW = cardW - 16;
    if (ctx.measureText(descText).width > maxW) {
      while (descText.length > 0 && ctx.measureText(descText + '…').width > maxW) {
        descText = descText.slice(0, -1);
      }
      descText += '…';
    }
    ctx.fillText(descText, cx, cardY + 57);
    ctx.restore();
  }

  // 主动/被动 badge (outline style) + duration badge (STORY-00320)
  const badgeY = cardY + 74;
  _drawOutlineBadge(ctx, cx - 22, badgeY, item.type, item.type === '主动' ? '#b088ff' : '#88aaff');
  _drawOutlineBadge(ctx, cx + 18, badgeY, item.duration, '#8899bb');

  // Price + buy button
  const btnH2 = 22;
  const btnX = cardX + 8;
  const btnY = cardY + CARD_H - btnH2 - 6;
  const priceW = 28;

  // Price with coin symbol
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('🪙' + item.cost, btnX + priceW / 2, btnY + btnH2 / 2);
  ctx.restore();

  // Buy button — gradient #5533aa → #8855ee (STORY-00320)
  const buyBtnX = btnX + priceW + 4;
  const buyBtnW = cardW - 16 - priceW - 4;
  const btnRect = drawButton(ctx, buyBtnX, btnY, buyBtnW, btnH2, '购买', {
    fontSize: 11, radius: 6,
    color0: canBuy ? '#5533aa' : 'rgba(60,60,80,0.6)',
    color1: canBuy ? '#8855ee' : 'rgba(40,40,60,0.6)',
  });
  _buyRects.push({ rect: btnRect, itemIdx: idx });

  // Owned badge — top-right corner dot (STORY-00320)
  if (owned > 0) {
    const bx = cardX + cardW - 16;
    const by = cardY + 8;
    ctx.save();
    ctx.fillStyle = '#2a1a5e';
    ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b088ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(owned, bx, by);
    ctx.restore();
  }
}

// Draw canvas icon for each item type (STORY-00320: no emoji)
function _drawItemIcon(ctx, itemId, cx, cy, r) {
  ctx.save();
  // Circular glow background
  const glowGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 4);
  glowGrd.addColorStop(0, 'rgba(160,100,255,0.25)');
  glowGrd.addColorStop(1, 'rgba(80,40,180,0)');
  ctx.fillStyle = glowGrd;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();

  // Background circle
  ctx.fillStyle = 'rgba(60,30,120,0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#d4b8ff';
  ctx.fillStyle   = '#ffd700';
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  const s = r * 0.55; // icon scale within circle

  if (itemId === 'net_speed') {
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy - s);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.1);
    ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.2, cy + s);
    ctx.strokeStyle = '#ffdd44';
    ctx.stroke();
  } else if (itemId === 'net_enlarge') {
    // Expanding net diamond
    ctx.strokeStyle = '#88ccff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx + s * 0.5, cy);
    ctx.lineTo(cx, cy + s * 0.5); ctx.lineTo(cx - s * 0.5, cy); ctx.closePath();
    ctx.stroke();
  } else if (itemId === 'space_bomb') {
    // Circle with X
    ctx.strokeStyle = '#ff6644';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.45, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.45); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.45, cy - s * 0.45);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.45); ctx.stroke();
    // Fuse dot
    ctx.fillStyle = '#ff6644';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.8, s * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (itemId === 'time_ext') {
    // Clock
    ctx.strokeStyle = '#88ffcc';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - s * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.4, cy + s * 0.2); ctx.stroke();
  } else if (itemId === 'shrink_debris') {
    // Shrink arrows inward
    ctx.strokeStyle = '#aaddff';
    const d = s * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx - d * 0.3, cy - d * 0.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx + d * 0.3, cy - d * 0.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - d, cy + d); ctx.lineTo(cx - d * 0.3, cy + d * 0.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + d, cy + d); ctx.lineTo(cx + d * 0.3, cy + d * 0.3); ctx.stroke();
    // Center dot
    ctx.fillStyle = '#aaddff';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (itemId === 'star_map') {
    // Star pattern — 4 connected dots
    ctx.strokeStyle = '#ffeeaa';
    const pts = [
      [cx, cy - s * 0.8], [cx + s * 0.7, cy - s * 0.2],
      [cx + s * 0.4, cy + s * 0.6], [cx - s * 0.4, cy + s * 0.6],
      [cx - s * 0.7, cy - s * 0.2],
    ];
    for (const [px, py] of pts) {
      ctx.fillStyle = '#ffdd88';
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,220,100,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else if (itemId === 'glove') {
    // Glove shape — simplified hand outline
    ctx.strokeStyle = '#ccddff';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.1, s * 0.7, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
    // Fingers (3 bumps on top)
    for (let fi = -1; fi <= 1; fi++) {
      ctx.beginPath();
      ctx.arc(cx + fi * s * 0.3, cy - s * 0.55, s * 0.22, Math.PI, TWO_PI); ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx + s * 0.75, cy - s * 0.1, s * 0.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (itemId === 'double_coins') {
    // Two overlapping coin circles
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.strokeStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(cx - s * 0.25, cy, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.beginPath(); ctx.arc(cx + s * 0.25, cy, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ×2 text
    ctx.font = `bold ${Math.round(s * 0.7)}px sans-serif`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×2', cx, cy);
  }
  ctx.restore();
}

// Draw outline-style pill badge (STORY-00320)
function _drawOutlineBadge(ctx, cx, y, text, strokeColor) {
  if (!text) return;
  ctx.save();
  ctx.font = '9px sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = tw + 8;
  const bh = 13;
  const bx = cx - bw / 2;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 0.8;
  _roundRect(ctx, bx, y, bw, bh, 4);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = strokeColor;
  ctx.fillText(text, cx, y + bh / 2);
  ctx.restore();
}


// ── Touch handling ────────────────────────────────────────────
function _onTouchStart(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  _lastTouchY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
  _isDragging = false;
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const rawY = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)
  const dy = rawY - _lastTouchY;
  _lastTouchY = rawY;
  if (Math.abs(dy) > 3) _isDragging = true;
  const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
  _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget - dy));
}

function _onTouchEnd(e) {
  if (_isDragging) { _isDragging = false; return; }
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;  // fixed: revert incorrect DPR (STORY-00269)
  const ty = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)

  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate('levels');
    return;
  }

  // Check buy buttons (rect y is in content coords; adjust touch ty)
  for (const { rect, itemIdx } of _buyRects) {
    if (hitTest({ x: rect.x, y: rect.y - _scrollY, w: rect.w, h: rect.h }, tx, ty)) {
      _tryBuy(itemIdx);
      return;
    }
  }
}

function _tryBuy(itemIdx) {
  const item = ITEMS[itemIdx];
  if (!item) return;
  if (!state.spendCoins(item.cost)) {
    _feedback = { msg: '金币不足！', error: true, expiresAt: Date.now() + 1200 };
    return;
  }
  state.addItem(item.id, 1);
  _feedback = { msg: '已购买 ' + item.nameZh + '！', expiresAt: Date.now() + 1200 };
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
