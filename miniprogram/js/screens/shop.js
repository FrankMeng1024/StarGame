// shop.js — Canvas 道具商店（微信小游戏版）
// CR-135: 紧凑行列 + 底部弹出详情面板
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

// ── 背景星云 ───────────────────────────────────────────────────
const _NEBULAE = [
  { xr: 0.82, yr: 0.28, rx: 110, ry: 70,  col: '100,70,255',  a: 0.07 },
  { xr: 0.15, yr: 0.75, rx:  90, ry: 60,  col: '40,180,200',  a: 0.055 },
  { xr: 0.88, yr: 0.78, rx: 120, ry: 72,  col: '200,80,150',  a: 0.05 },
];

// ── Layout constants ──────────────────────────────────────────
const ROW_H      = 54;   // height of each compact row
const ROW_GAP    = 6;
const PAD_X      = 14;
const PAD_TOP_EXTRA = 8;
const SHEET_H    = 220;  // bottom sheet panel height

// ── Module state ──────────────────────────────────────────────
let _navigate    = null;
let _rafId       = null;
let _backRect    = null;
let _rowRects    = [];   // [{ rect, itemIdx }] rebuilt each frame
let _sheetBuyRect = null;
let _scrollY     = 0;
let _scrollTarget = 0;
let _lastTouchY  = 0;
let _isDragging  = false;
let _totalH      = 0;
let _feedback    = null;
let _maShanZhengLoaded = false;

// Bottom sheet state
let _sheet = null;  // null | { idx, slideY, targetSlideY }

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

  wx.onTouchStart(_onTouchStart);
  wx.onTouchMove(_onTouchMove);
  wx.onTouchEnd(_onTouchEnd);

  _rafId = requestAnimationFrame(_loop);
}

export function hideShop() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    wx.offTouchStart(_onTouchStart);
    wx.offTouchMove(_onTouchMove);
    wx.offTouchEnd(_onTouchEnd);
  }
  _backRect    = null;
  _sheetBuyRect = null;
  _rowRects    = [];
  _scrollY     = _scrollTarget = 0;
  _feedback    = null;
  _sheet       = null;
}

function _computeLayout() {
  const headerH = (G.SAFE_TOP || 0) + 48;
  const padTop  = headerH + PAD_TOP_EXTRA;
  _totalH = padTop + ITEMS.length * (ROW_H + ROW_GAP) + 16 + (G.SAFE_BOTTOM || 0);
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

  // Scroll spring
  _scrollY += (_scrollTarget - _scrollY) * 0.18;

  const headerH = (G.SAFE_TOP || 0) + 48;

  // ── Scrollable item rows ──
  _rowRects = [];
  const padTop = headerH + PAD_TOP_EXTRA;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();
  ctx.translate(0, -_scrollY);

  const safeL = G.SAFE_LEFT  || 0;
  const safeR = G.SAFE_RIGHT || 0;
  // Align list edges with header button edges (方案A):
  //   rowX    = return button left edge  = safeL + 96 + 10
  //   rowRight = coin button right edge  = W - safeR - 96 - 10
  const rowX    = safeL + 90;
  const rowRight = W - safeR - 88 - 2;
  const rowW    = rowRight - rowX;

  ITEMS.forEach((item, i) => {
    const rowY = padTop + i * (ROW_H + ROW_GAP);
    const isSelected = _sheet && _sheet.idx === i;
    _drawItemRow(ctx, W, item, i, rowX, rowY, rowW, ROW_H, isSelected);
    _rowRects.push({ rect: { x: rowX, y: rowY, w: rowW, h: ROW_H }, itemIdx: i });
  });

  ctx.restore();

  // ── Header (drawn on top) ──
  const hdr = drawHeaderBar(ctx, W, H, '道具商店', {
    safeLeft:   G.SAFE_LEFT  || 0,
    safeTop:    G.SAFE_TOP   || 0,
    safeRight:  G.SAFE_RIGHT || 0,
    fontLoaded: _maShanZhengLoaded,
    rightText:  '🪙 ' + state.coins,
  });
  _backRect = hdr.backRect;

  // ── Bottom sheet animation ──
  if (_sheet) {
    _sheet.slideY += (_sheet.targetSlideY - _sheet.slideY) * 0.16;
    if (_sheet.targetSlideY >= H && _sheet.slideY > H - 4) {
      _sheet = null;
    }
  }

  // ── Bottom sheet drawing ──
  if (_sheet) {
    _drawBottomSheet(ctx, W, H, ITEMS[_sheet.idx], _sheet.slideY);
  }

  // ── Feedback toast ──
  if (_feedback && Date.now() < _feedback.expiresAt) {
    const alpha = Math.min(1, (_feedback.expiresAt - Date.now()) / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _feedback.error ? 'rgba(200,60,60,0.92)' : 'rgba(30,200,120,0.92)';
    _roundRect(ctx, W / 2 - 110, H / 2 - 22, 220, 44, 12);
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

// ── Compact row drawing ───────────────────────────────────────
function _drawItemRow(ctx, W, item, idx, rowX, rowY, rowW, rowH, isSelected) {
  const owned  = state.getItemQty(item.id);
  const canBuy = state.coins >= item.cost;

  // Row background
  ctx.save();
  const bgGrd = ctx.createLinearGradient(rowX, rowY, rowX, rowY + rowH);
  if (isSelected) {
    bgGrd.addColorStop(0, 'rgba(60,30,110,0.95)');
    bgGrd.addColorStop(1, 'rgba(40,20,80,0.92)');
  } else {
    bgGrd.addColorStop(0, 'rgba(12,7,38,0.90)');
    bgGrd.addColorStop(1, 'rgba(20,12,52,0.86)');
  }
  ctx.fillStyle = bgGrd;
  _roundRect(ctx, rowX, rowY, rowW, rowH, 12);
  ctx.fill();
  ctx.strokeStyle = isSelected ? 'rgba(180,120,255,0.55)' : 'rgba(100,80,180,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Left icon circle
  const iconR  = 17;
  const iconCx = rowX + 10 + iconR;
  const iconCy = rowY + rowH / 2;

  ctx.save();
  const haloGrd = ctx.createRadialGradient(iconCx, iconCy, 0, iconCx, iconCy, iconR * 1.6);
  haloGrd.addColorStop(0, 'rgba(140,90,255,0.20)');
  haloGrd.addColorStop(1, 'rgba(80,40,180,0)');
  ctx.fillStyle = haloGrd;
  ctx.beginPath(); ctx.arc(iconCx, iconCy, iconR * 1.6, 0, TWO_PI); ctx.fill();
  ctx.restore();

  ctx.save();
  const circleGrd = ctx.createRadialGradient(iconCx, iconCy - iconR * 0.2, 0, iconCx, iconCy, iconR);
  circleGrd.addColorStop(0, 'rgba(70,40,140,0.88)');
  circleGrd.addColorStop(1, 'rgba(30,16,70,0.78)');
  ctx.fillStyle = circleGrd;
  ctx.beginPath(); ctx.arc(iconCx, iconCy, iconR, 0, TWO_PI); ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,255,0.50)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  _drawItemIcon(ctx, item.id, iconCx, iconCy, iconR);

  // Middle: name + type badge
  const midX = rowX + 10 + iconR * 2 + 12;
  ctx.save();
  ctx.font         = 'bold 14px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = '#ede6ff';
  ctx.shadowColor  = 'rgba(160,120,255,0.25)';
  ctx.shadowBlur   = 3;
  ctx.fillText(item.nameZh, midX, rowY + 11);
  ctx.restore();

  _drawPillBadge(ctx, midX, rowY + rowH - 20, item.type,
    item.type === '主动' ? 'rgba(160,100,255,0.35)' : 'rgba(80,130,220,0.35)', '#c0a0ff');

  // Right: price column (fixed left-aligned split) + arrow
  // Price col starts at fixed offset from right so all rows align
  const PRICE_COL_W = 72;  // width of price+arrow zone
  const priceColX   = rowX + rowW - PRICE_COL_W;

  // Subtle separator line
  ctx.save();
  ctx.strokeStyle = 'rgba(120,90,200,0.22)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(priceColX - 4, rowY + 10);
  ctx.lineTo(priceColX - 4, rowY + rowH - 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = canBuy ? '#ffd700' : 'rgba(180,160,100,0.55)';
  ctx.shadowColor  = 'rgba(255,200,0,0.35)';
  ctx.shadowBlur   = canBuy ? 4 : 0;
  ctx.fillText('🪙 ' + item.cost, priceColX + 4, rowY + rowH / 2 - 6);
  ctx.restore();

  ctx.save();
  ctx.font         = '16px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = 'rgba(180,160,220,0.55)';
  ctx.fillText('›', priceColX + 4, rowY + rowH / 2 + 8);
  ctx.restore();

  // Owned badge
  if (owned > 0) {
    const bx = rowX + rowW - 10;
    const by = rowY + 8;
    ctx.save();
    ctx.fillStyle   = '#2a1a5e';
    ctx.strokeStyle = '#b088ff';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, TWO_PI); ctx.fill(); ctx.stroke();
    ctx.font         = 'bold 9px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd700';
    ctx.fillText(owned, bx, by);
    ctx.restore();
  }
}

// ── Bottom sheet drawing ──────────────────────────────────────
function _drawBottomSheet(ctx, W, H, item, slideY) {
  _sheetBuyRect = null;
  const owned  = state.getItemQty(item.id);
  const canBuy = state.coins >= item.cost;

  // Progress 0→1 as sheet slides up
  const progress = Math.max(0, Math.min(1, (H - slideY) / SHEET_H));

  // Dim overlay
  ctx.save();
  ctx.globalAlpha = progress * 0.55;
  ctx.fillStyle   = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Panel
  const panelY = slideY;
  ctx.save();
  ctx.globalAlpha = progress;

  // Panel background with rounded top corners
  ctx.beginPath();
  const r = 20;
  ctx.moveTo(0 + r, panelY);
  ctx.lineTo(W - r, panelY);
  ctx.quadraticCurveTo(W, panelY, W, panelY + r);
  ctx.lineTo(W, panelY + SHEET_H);
  ctx.lineTo(0, panelY + SHEET_H);
  ctx.lineTo(0, panelY + r);
  ctx.quadraticCurveTo(0, panelY, r, panelY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,4,30,0.97)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,100,255,0.30)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top border glow line
  ctx.fillStyle = 'rgba(180,140,255,0.18)';
  ctx.fillRect(r, panelY, W - r * 2, 1);

  // Drag handle
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  _roundRect(ctx, W / 2 - 20, panelY + 8, 40, 4, 2);
  ctx.fill();

  ctx.restore();

  // Content (only draw when mostly visible)
  if (progress < 0.15) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, (progress - 0.15) / 0.85);

  // Large icon
  const iconR  = 28;
  const iconCx = W / 2;
  const iconCy = panelY + 22 + iconR;

  const haloGrd = ctx.createRadialGradient(iconCx, iconCy, 0, iconCx, iconCy, iconR * 2);
  haloGrd.addColorStop(0, 'rgba(140,90,255,0.22)');
  haloGrd.addColorStop(1, 'rgba(80,40,180,0)');
  ctx.fillStyle = haloGrd;
  ctx.beginPath(); ctx.arc(iconCx, iconCy, iconR * 2, 0, TWO_PI); ctx.fill();

  const circleGrd = ctx.createRadialGradient(iconCx, iconCy - iconR * 0.2, 0, iconCx, iconCy, iconR);
  circleGrd.addColorStop(0, 'rgba(70,40,140,0.90)');
  circleGrd.addColorStop(1, 'rgba(30,16,70,0.82)');
  ctx.fillStyle = circleGrd;
  ctx.beginPath(); ctx.arc(iconCx, iconCy, iconR, 0, TWO_PI); ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,255,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  _drawItemIcon(ctx, item.id, iconCx, iconCy, iconR);

  // Name
  let textY = iconCy + iconR + 12;
  ctx.font         = 'bold 16px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = '#ede6ff';
  ctx.shadowColor  = 'rgba(180,140,255,0.4)';
  ctx.shadowBlur   = 6;
  ctx.fillText(item.nameZh, W / 2, textY);
  textY += 24;

  // Type + duration badges centered
  const typeW    = _measurePillW(ctx, item.type);
  const durW     = _measurePillW(ctx, item.duration);
  const totalBadgeW = typeW + 6 + durW;
  _drawPillBadge(ctx, W / 2 - totalBadgeW / 2, textY,
    item.type, item.type === '主动' ? 'rgba(160,100,255,0.40)' : 'rgba(80,130,220,0.40)', '#c0a0ff');
  _drawPillBadge(ctx, W / 2 - totalBadgeW / 2 + typeW + 6, textY,
    item.duration, 'rgba(60,80,120,0.40)', '#8899cc');
  textY += 22;

  // Description
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = 'rgba(220,210,255,0.72)';
  ctx.shadowBlur   = 0;
  const maxDescW = W - 48;
  let desc = item.desc;
  if (ctx.measureText(desc).width > maxDescW) {
    // Try to split at a natural break point
    const half = Math.ceil(desc.length / 2);
    ctx.fillText(desc.slice(0, half), W / 2, textY);
    ctx.fillText(desc.slice(half), W / 2, textY + 17);
    textY += 17;
  } else {
    ctx.fillText(desc, W / 2, textY);
  }
  textY += 18;

  // Owned count
  if (owned > 0) {
    ctx.font      = '11px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('已拥有 ' + owned + ' 个', W / 2, textY);
    textY += 16;
  }

  ctx.restore();

  // Buy button — align with list/header button boundaries
  const _safeL = G.SAFE_LEFT  || 0;
  const _safeR = G.SAFE_RIGHT || 0;
  const btnX = _safeL + 90;
  const btnW = (W - _safeR - 88 - 2) - btnX;
  const btnH = 40;
  const btnY = panelY + SHEET_H - btnH - 14;
  _sheetBuyRect = { x: btnX, y: btnY, w: btnW, h: btnH };

  ctx.save();
  ctx.globalAlpha = Math.max(0, (progress - 0.15) / 0.85);

  const btnGrd = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  if (canBuy) {
    btnGrd.addColorStop(0, '#6644cc');
    btnGrd.addColorStop(1, '#8855ee');
  } else {
    btnGrd.addColorStop(0, 'rgba(50,40,70,0.72)');
    btnGrd.addColorStop(1, 'rgba(35,28,55,0.72)');
  }
  ctx.fillStyle = btnGrd;
  _roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();
  if (canBuy) {
    ctx.strokeStyle = 'rgba(200,160,255,0.55)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  ctx.font         = 'bold 15px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = canBuy ? '#f0e0ff' : 'rgba(200,180,220,0.45)';
  ctx.shadowColor  = canBuy ? 'rgba(200,160,255,0.4)' : 'none';
  ctx.shadowBlur   = canBuy ? 6 : 0;
  ctx.fillText('购买  🪙 ' + item.cost, btnX + btnW / 2, btnY + btnH / 2);

  ctx.restore();
}

// ── Pill badge helpers ────────────────────────────────────────
function _measurePillW(ctx, text) {
  ctx.font = '9px sans-serif';
  return ctx.measureText(text).width + 10;
}

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

// ── Canvas icon drawing ───────────────────────────────────────
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
  const touch = e.touches[0];
  if (!touch) return;
  _lastTouchY = touch.y;
  _isDragging = false;
}

function _onTouchMove(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const dy = touch.y - _lastTouchY;
  _lastTouchY = touch.y;
  if (Math.abs(dy) > 3) _isDragging = true;
  // Only scroll if no sheet open (or sheet not yet fully open)
  if (!_sheet || _sheet.slideY > G.SCREEN_H - SHEET_H + 20) {
    const maxScroll = Math.max(0, _totalH - G.SCREEN_H);
    _scrollTarget = Math.max(0, Math.min(maxScroll, _scrollTarget - dy));
  }
}

function _onTouchEnd(e) {
  if (_isDragging) { _isDragging = false; return; }
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.x;
  const ty = touch.y;

  // Back button
  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate('menu');
    return;
  }

  // If sheet is open: buy button or dismiss
  if (_sheet && _sheet.slideY < G.SCREEN_H - 10) {
    // Buy button in sheet
    if (_sheetBuyRect && hitTest(_sheetBuyRect, tx, ty)) {
      _tryBuy(_sheet.idx);
      return;
    }
    // Tap above sheet → dismiss
    if (ty < _sheet.slideY - 10) {
      _sheet.targetSlideY = G.SCREEN_H;
      return;
    }
    return;
  }

  // Row tap → open sheet
  for (const { rect, itemIdx } of _rowRects) {
    if (hitTest({ x: rect.x, y: rect.y - _scrollY, w: rect.w, h: rect.h }, tx, ty)) {
      if (_sheet && _sheet.idx === itemIdx) {
        _sheet.targetSlideY = G.SCREEN_H;
      } else {
        _sheet = { idx: itemIdx, slideY: G.SCREEN_H, targetSlideY: G.SCREEN_H - SHEET_H };
      }
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
  _feedback = { msg: '已购买 ' + item.nameZh + '！', expiresAt: Date.now() + 1400 };
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
