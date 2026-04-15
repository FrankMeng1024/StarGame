// shop.js — Canvas 道具商店（微信小游戏版）
// 展示8种道具，玩家可用金币购买

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, hitTest,
} from '../engine/canvas-utils.js';
import state from '../engine/state.js';

// ── Item definitions ──────────────────────────────────────────
export const ITEMS = [
  { id: 'speed',        icon: '⚡', nameZh: '网兜加速',   desc: '本关网兜速度+50%',   cost: 20 },
  { id: 'enlarge',      icon: '🔵', nameZh: '网兜扩大',   desc: '本关网兜半径×1.5',   cost: 25 },
  { id: 'bomb',         icon: '💣', nameZh: '宇宙炸弹',   desc: '清除所有垃圾一次',   cost: 40 },
  { id: 'time_ext',     icon: '⏱', nameZh: '时间延长',   desc: '本关+15秒',          cost: 30 },
  { id: 'shrink',       icon: '🔬', nameZh: '缩小垃圾',   desc: '本关垃圾体积减半',   cost: 35 },
  { id: 'double_coins', icon: '🪙', nameZh: '双倍金币',   desc: '本关金币×2',         cost: 50 },
  { id: 'star_magnet',  icon: '🧲', nameZh: '磁力星引',   desc: '星星主动靠近网兜',   cost: 80 },
  { id: 'glove',        icon: '🧤', nameZh: '宇航员手套', desc: '抓到垃圾不扣时间',     cost: 70 },
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

// Layout
const CARD_H    = 90;
const CARD_GAP  = 8;
const PAD_X     = 14;
const PAD_TOP   = 70;

// ── Public API ────────────────────────────────────────────────
export function showShop(navigate) {
  _navigate = navigate;
  _cleanup();
  initBgStars(G.SCREEN_W, G.SCREEN_H, 50);
  _computeLayout();

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
  _totalH = PAD_TOP + ITEMS.length * (CARD_H + CARD_GAP) + 24;
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
  _backRect = drawButton(ctx, 12, 14, 72, 34, '← 返回', {
    fontSize: 13, radius: 10,
    color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
  });

  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('道具商店', W / 2, 31);
  ctx.restore();

  // Coin balance
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.fillText('🪙 ' + state.coins, W - 12, 31);
  ctx.restore();

  // ── Scrollable item list ──
  _buyRects = [];

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, PAD_TOP - 4, W, H - PAD_TOP + 4);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  ITEMS.forEach((item, i) => {
    const cardY = PAD_TOP + i * (CARD_H + CARD_GAP);
    _drawItemCard(ctx, W, item, i, cardY, now);
  });

  ctx.restore();

  // ── Feedback toast ──
  if (_feedback && now < _feedback.until) {
    const alpha = Math.min(1, (_feedback.until - now) / 400);
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

  _rafId = requestAnimationFrame(_loop);
}

function _drawItemCard(ctx, W, item, idx, cardY, now) {
  const cardX  = PAD_X;
  const cardW  = W - PAD_X * 2;
  const owned  = state.getItemQty(item.id);
  const canBuy = state.coins >= item.cost;

  // Card bg
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = 'rgba(18,18,50,0.92)';
  _roundRect(ctx, cardX, cardY, cardW, CARD_H, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,80,200,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Icon
  ctx.save();
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon, cardX + 42, cardY + CARD_H / 2);
  ctx.restore();

  // Name
  ctx.save();
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e0ff';
  ctx.fillText(item.nameZh, cardX + 78, cardY + 16);
  ctx.restore();

  // Desc
  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(180,170,220,0.8)';
  ctx.fillText(item.desc, cardX + 78, cardY + 38);
  ctx.restore();

  // Owned badge
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = owned > 0 ? '#a0ffa0' : 'rgba(160,150,200,0.5)';
  ctx.fillText('已持有 ' + owned, cardX + 78, cardY + 58);
  ctx.restore();

  // Cost + buy button
  const btnW = 72;
  const btnX = cardX + cardW - btnW - 8;
  const btnY = cardY + CARD_H / 2 - 18;

  ctx.save();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.fillText('🪙 ' + item.cost, btnX - 6, cardY + CARD_H / 2 - 10);
  ctx.restore();

  const btnRect = drawButton(ctx, btnX, btnY + 14, btnW, 30, '购买', {
    fontSize: 13, radius: 8,
    color0: canBuy ? 'rgba(60,160,80,0.85)' : 'rgba(60,60,80,0.6)',
    color1: canBuy ? 'rgba(40,200,100,0.85)' : 'rgba(40,40,60,0.6)',
  });
  _buyRects.push({ rect: btnRect, itemIdx: idx });
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
  if (_isDragging) { _isDragging = false; return; }
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;
  const ty = touch.clientY;

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
    _feedback = { msg: '金币不足！', error: true, until: performance.now() + 1200 };
    return;
  }
  state.addItem(item.id, 1);
  _feedback = { msg: '已购买 ' + item.nameZh + '！', until: performance.now() + 1200 };
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
