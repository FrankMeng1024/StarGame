// shop.js — Canvas 道具商店（微信小游戏版）
// CR-135: 单列大卡片布局，高端深空风格
// CR-136: 动态星云背景
// CR-137: 统一 drawHeaderBar

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawHeaderBar, drawNebulae, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── Item definitions ──────────────────────────────────────────
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

// ── 背景星云（偏右+底部，不遮挡左侧卡片区域）───────────────────
const _NEBULAE = [
  { xr: 0.82, yr: 0.28, rx: 110, ry: 70,  col: '100,70,255',  a: 0.07 },
  { xr: 0.15, yr: 0.75, rx:  90, ry: 60,  col: '40,180,200',  a: 0.055 },
  { xr: 0.88, yr: 0.78, rx: 120, ry: 72,  col: '200,80,150',  a: 0.05 },
];

// ── Module state ──────────────────────────────────────────────
let _navigate    = null;
let _rafId       = null;
let _backRect    = null;
let _buyRects    = [];
let _scrollY     = 0;
let _scrollTarget = 0;
let _lastTouchY  = 0;
let _isDragging  = false;
let _totalH      = 0;
let _feedback    = null;
let _maShanZhengLoaded = false;

// Layout constants — CR-135: single column, larger cards
const CARD_GAP  = 10;
const PAD_X     = 14;
const PAD_TOP_EXTRA = 8;  // breathing room below header divider

// ── Public API ────────────────────────────────────────────────
export function showShop(navigate) {
  _navigate = navigate;
  _cleanup();
  initBgStars(G.SCREEN_W, G.SCREEN_H, Date.now() % 100000);
  _computeLayout();

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

function _cardH() {
  return Math.min(130, Math.max(110, G.SCREEN_H * 0.20));
}

function _computeLayout() {
  const H = G.SCREEN_H;
  const headerH = (G.SAFE_TOP || 0) + 48;
  const padTop = headerH + PAD_TOP_EXTRA;
  const ch = _cardH();
  _totalH = padTop + ITEMS.length * (ch + CARD_GAP) + 16 + (G.SAFE_BOTTOM || 0);
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(ts) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = ts * 0.001;

  // Background
  drawSkyBg(ctx, W, H, '#07061c', '#0c0a30', '#060618');
  drawNebulae(ctx, W, H, _NEBULAE, t);
  drawBgStars(ctx, t);

  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  const headerH = (G.SAFE_TOP || 0) + 48;

  // ── Scrollable item list ──
  _buyRects = [];
  const padTop = headerH + PAD_TOP_EXTRA;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  const safeL = G.SAFE_LEFT || 0;
  const safeR = G.SAFE_RIGHT || 0;
  const cardW = W - safeL - safeR - PAD_X * 2;
  const ch    = _cardH();

  ITEMS.forEach((item, i) => {
    const cardX = safeL + PAD_X;
    const cardY = padTop + i * (ch + CARD_GAP);
    _drawItemCard(ctx, W, item, i, cardX, cardY, cardW, ch, t);
  });

  ctx.restore();

  // ── Header (drawn last = always on top) ──
  const hdr = drawHeaderBar(ctx, W, H, '道具商店', {
    safeLeft:   G.SAFE_LEFT  || 0,
    safeTop:    G.SAFE_TOP   || 0,
    safeRight:  G.SAFE_RIGHT || 0,
    fontLoaded: _maShanZhengLoaded,
    rightText:  '🪙 ' + state.coins,
  });
  _backRect = hdr.backRect;

  // ── Feedback toast ──
  if (_feedback && Date.now() < _feedback.expiresAt) {
    const alpha = Math.min(1, (_feedback.expiresAt - Date.now()) / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _feedback.error ? 'rgba(200,60,60,0.92)' : 'rgba(30,200,120,0.92)';
    _roundRect(ctx, W / 2 - 100, H / 2 - 22, 200, 44, 12);
    ctx.fill();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(_feedback.msg, W / 2, H / 2);
    ctx.restore();
  }

  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

function _drawItemCard(ctx, W, item, idx, cardX, cardY, cardW, cardH, t) {
  const owned  = state.getItemQty(item.id);
  const canBuy = state.coins >= item.cost;

  // ── Card background — deep purple-blue gradient, top highlight ──
  ctx.save();
  const bgGrd = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  bgGrd.addColorStop(0, 'rgba(10,6,36,0.92)');
  bgGrd.addColorStop(1, 'rgba(22,14,58,0.88)');
  ctx.fillStyle = bgGrd;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  // Top 1px highlight line
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(cardX + 14, cardY, cardW - 28, 1);
  ctx.restore();

  // ── Left icon zone ──
  const iconZoneW = cardH;
  const iconCx = cardX + iconZoneW / 2;
  const iconCy = cardY + cardH / 2;
  const iconR  = cardH * 0.28;

  // Glow halo behind icon
  ctx.save();
  const haloGrd = ctx.createRadialGradient(iconCx, iconCy, 0, iconCx, iconCy, iconR * 1.8);
  haloGrd.addColorStop(0, 'rgba(140,90,255,0.18)');
  haloGrd.addColorStop(1, 'rgba(80,40,180,0)');
  ctx.fillStyle = haloGrd;
  ctx.beginPath();
  ctx.arc(iconCx, iconCy, iconR * 1.8, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Icon circle base
  ctx.save();
  const circleGrd = ctx.createRadialGradient(iconCx, iconCy - iconR * 0.2, 0, iconCx, iconCy, iconR);
  circleGrd.addColorStop(0, 'rgba(70,40,140,0.85)');
  circleGrd.addColorStop(1, 'rgba(30,16,70,0.75)');
  ctx.fillStyle = circleGrd;
  ctx.beginPath();
  ctx.arc(iconCx, iconCy, iconR, 0, TWO_PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  _drawItemIcon(ctx, item.id, iconCx, iconCy, iconR);

  // ── Right content zone ──
  const contentX = cardX + iconZoneW + 10;
  const contentW = cardW - iconZoneW - 10 - 8;

  // Item name
  ctx.save();
  ctx.font         = 'bold 14px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = '#e8e0ff';
  ctx.shadowColor  = 'rgba(160,120,255,0.3)';
  ctx.shadowBlur   = 4;
  ctx.fillText(item.nameZh, contentX, cardY + 12);
  ctx.restore();

  // Type + duration badges (inline, small)
  const badgeY = cardY + 30;
  _drawPillBadge(ctx, contentX, badgeY, item.type,     item.type === '主动' ? 'rgba(160,100,255,0.35)' : 'rgba(80,130,220,0.35)', '#c0a0ff');
  _drawPillBadge(ctx, contentX + 44, badgeY, item.duration, 'rgba(60,80,120,0.35)', '#8899cc');

  // Description (up to 2 lines)
  ctx.save();
  ctx.font         = '11px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = 'rgba(255,255,255,0.62)';
  const maxDescW = contentW - 90;  // leave room for price+btn on right
  let descText = item.desc;
  if (ctx.measureText(descText).width > maxDescW * 1.9) {
    // Attempt two-line split at ~halfway
    const half = Math.floor(descText.length / 2);
    const line1 = descText.slice(0, half);
    const line2 = descText.slice(half);
    ctx.fillText(line1, contentX, cardY + 48);
    ctx.fillText(line2, contentX, cardY + 62);
  } else if (ctx.measureText(descText).width > maxDescW) {
    // Single line truncate
    while (descText.length > 0 && ctx.measureText(descText + '…').width > maxDescW * 1.9) {
      descText = descText.slice(0, -1);
    }
    ctx.fillText(descText + '…', contentX, cardY + 48);
  } else {
    ctx.fillText(descText, contentX, cardY + 48);
  }
  ctx.restore();

  // ── Price + Buy button (right-aligned) ──
  const btnW    = 72;
  const btnH    = 28;
  const btnX    = cardX + cardW - btnW - 8;
  const priceY  = cardY + cardH - btnH - 28;
  const btnY2   = cardY + cardH - btnH - 6;

  // Price label
  ctx.save();
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#ffd700';
  ctx.shadowColor  = 'rgba(255,200,0,0.4)';
  ctx.shadowBlur   = 4;
  ctx.fillText('🪙 ' + item.cost, cardX + cardW - 8, priceY + 9);
  ctx.restore();

  // Buy button
  ctx.save();
  const btnGrd = ctx.createLinearGradient(btnX, btnY2, btnX, btnY2 + btnH);
  if (canBuy) {
    btnGrd.addColorStop(0, '#5533bb');
    btnGrd.addColorStop(1, '#7744cc');
  } else {
    btnGrd.addColorStop(0, 'rgba(50,40,70,0.7)');
    btnGrd.addColorStop(1, 'rgba(35,28,55,0.7)');
  }
  ctx.fillStyle = btnGrd;
  _roundRect(ctx, btnX, btnY2, btnW, btnH, 8);
  ctx.fill();
  if (canBuy) {
    ctx.strokeStyle = 'rgba(180,140,255,0.5)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }
  ctx.font         = 'bold 12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = canBuy ? '#f0e0ff' : 'rgba(200,180,220,0.45)';
  ctx.fillText('购买', btnX + btnW / 2, btnY2 + btnH / 2);
  ctx.restore();

  _buyRects.push({ rect: { x: btnX, y: btnY2, w: btnW, h: btnH }, itemIdx: idx });

  // Owned count badge
  if (owned > 0) {
    const bx = cardX + cardW - 12;
    const by = cardY + 10;
    ctx.save();
    ctx.fillStyle   = '#2a1a5e';
    ctx.strokeStyle = '#b088ff';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(bx, by, 9, 0, TWO_PI); ctx.fill(); ctx.stroke();
    ctx.font         = 'bold 9px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd700';
    ctx.fillText(owned, bx, by);
    ctx.restore();
  }
}

// Pill badge helper
function _drawPillBadge(ctx, x, y, text, bgColor, textColor) {
  if (!text) return;
  ctx.save();
  ctx.font = '9px sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = tw + 10;
  const bh = 14;
  ctx.fillStyle = bgColor;
  _roundRect(ctx, x, y, bw, bh, 5);
  ctx.fill();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = textColor;
  ctx.fillText(text, x + bw / 2, y + bh / 2);
  ctx.restore();
}

// Canvas icon drawing (same logic as before, scaled to new iconR)
function _drawItemIcon(ctx, itemId, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = '#d4b8ff';
  ctx.fillStyle   = '#ffd700';
  ctx.lineWidth   = Math.max(1.2, r * 0.08);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  const s = r * 0.55;

  if (itemId === 'net_speed') {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy - s);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.1);
    ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.2, cy + s);
    ctx.strokeStyle = '#ffdd44';
    ctx.stroke();
  } else if (itemId === 'net_enlarge') {
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
    ctx.strokeStyle = '#ff6644';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.8, 0, TWO_PI); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s*0.45, cy - s*0.45); ctx.lineTo(cx + s*0.45, cy + s*0.45); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s*0.45, cy - s*0.45); ctx.lineTo(cx - s*0.45, cy + s*0.45); ctx.stroke();
    ctx.fillStyle = '#ff6644';
    ctx.beginPath(); ctx.arc(cx, cy - s*0.8, s*0.2, 0, TWO_PI); ctx.fill();
  } else if (itemId === 'time_ext') {
    ctx.strokeStyle = '#88ffcc';
    ctx.beginPath(); ctx.arc(cx, cy, s*0.85, 0, TWO_PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - s*0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s*0.4, cy + s*0.2); ctx.stroke();
  } else if (itemId === 'shrink_debris') {
    ctx.strokeStyle = '#aaddff';
    const d = s * 0.7;
    ctx.beginPath(); ctx.moveTo(cx-d,cy-d); ctx.lineTo(cx-d*0.3,cy-d*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+d,cy-d); ctx.lineTo(cx+d*0.3,cy-d*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-d,cy+d); ctx.lineTo(cx-d*0.3,cy+d*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+d,cy+d); ctx.lineTo(cx+d*0.3,cy+d*0.3); ctx.stroke();
    ctx.fillStyle = '#aaddff';
    ctx.beginPath(); ctx.arc(cx, cy, s*0.2, 0, TWO_PI); ctx.fill();
  } else if (itemId === 'star_map') {
    ctx.strokeStyle = '#ffeeaa';
    const pts = [
      [cx, cy - s*0.8], [cx + s*0.7, cy - s*0.2],
      [cx + s*0.4, cy + s*0.6], [cx - s*0.4, cy + s*0.6],
      [cx - s*0.7, cy - s*0.2],
    ];
    for (const [px, py] of pts) {
      ctx.fillStyle = '#ffdd88';
      ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, r*0.07), 0, TWO_PI); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,220,100,0.4)';
    ctx.lineWidth   = Math.max(0.8, r * 0.05);
    ctx.stroke();
  } else if (itemId === 'glove') {
    ctx.strokeStyle = '#ccddff';
    ctx.beginPath();
    ctx.arc(cx, cy + s*0.1, s*0.7, Math.PI*0.05, Math.PI*0.95); ctx.stroke();
    for (let fi = -1; fi <= 1; fi++) {
      ctx.beginPath();
      ctx.arc(cx + fi*s*0.3, cy - s*0.55, s*0.22, Math.PI, TWO_PI); ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx + s*0.75, cy - s*0.1, s*0.2, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  } else if (itemId === 'double_coins') {
    ctx.fillStyle   = 'rgba(255,215,0,0.15)';
    ctx.strokeStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(cx - s*0.25, cy, s*0.6, 0, TWO_PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle   = 'rgba(255,215,0,0.2)';
    ctx.beginPath(); ctx.arc(cx + s*0.25, cy, s*0.6, 0, TWO_PI); ctx.fill(); ctx.stroke();
    ctx.font         = `bold ${Math.round(s * 0.7)}px sans-serif`;
    ctx.fillStyle    = '#ffd700';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×2', cx, cy);
  }
  ctx.restore();
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

// ── Helper ────────────────────────────────────────────────────
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
