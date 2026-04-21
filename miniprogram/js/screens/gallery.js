// gallery.js — Canvas 星座图鉴（微信小游戏版）
// STORY-00350: 星系节点图鉴 — 六边形蜂巢布局，底部抽屉详情，与选关界面视觉统一

import { G } from '../engine/globals.js';
import {
  COLORS, drawFadeOverlay, tickFade, hitTest,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── 星系分组（与关卡界面完全对应） ──────────────────────────────
const _GROUPS = [
  { name: '冬季星空', color: '#88ccff', glow: 'rgba(80,160,255,',  levels: [0, 1, 4, 5, 6, 7]   },
  { name: '夏季黄道', color: '#ffcc66', glow: 'rgba(255,180,60,',  levels: [2, 3, 8, 9, 10, 11]  },
  { name: '秋日星原', color: '#cc99ff', glow: 'rgba(180,100,255,', levels: [12, 13, 14, 15, 16, 17] },
  { name: '北天极圈', color: '#66ffcc', glow: 'rgba(60,220,160,',  levels: [18, 19, 20, 21, 22, 23] },
  { name: '南天深空', color: '#ff8888', glow: 'rgba(255,80,80,',   levels: [24, 25, 26, 27, 28, 29] },
];

// 六边形蜂巢布局（6节点）— 2列3行，偏移排列
// 相对于节点区中心的比例偏移
const _HEX_POS = [
  { xr: -0.30, yr: -0.35 },  // 0: 左上
  { xr:  0.30, yr: -0.35 },  // 1: 右上
  { xr: -0.48, yr:  0.00 },  // 2: 左中
  { xr:  0.00, yr:  0.00 },  // 3: 中心
  { xr:  0.48, yr:  0.00 },  // 4: 右中
  { xr:  0.00, yr:  0.38 },  // 5: 下中
];

// 节点间装饰连线（蜂巢风格）
const _HEX_EDGES = [[0,1],[0,2],[0,3],[1,3],[1,4],[2,3],[3,4],[3,5],[2,5],[4,5]];

const _NODE_R = 36;

// 背景星云
const _NEBULAE = [
  { xr: 0.18, yr: 0.32, rx: 130, ry: 80,  col: '100,70,255',  a: 0.07 },
  { xr: 0.80, yr: 0.60, rx: 110, ry: 68,  col: '40,180,200',  a: 0.06 },
  { xr: 0.50, yr: 0.90, rx: 140, ry: 82,  col: '200,80,150',  a: 0.05 },
];

// ── 模块状态 ──────────────────────────────────────────────────
let _navigate     = null;
let _rafId        = null;
let _currentGroup = 0;
let _slideDir     = 0;
let _slideProgress = 1;
let _nodeRects    = [];   // [{cx, cy, r, idx}]
let _bgStars      = [];
let _backRect     = null;
let _prevRect     = null;
let _nextRect     = null;
let _isDragging   = false;
let _touchStartX  = 0;
let _touchStartY  = 0;

// 底部抽屉详情
let _drawer       = null;   // null | { idx, phase, scrollY, scrollTarget }
let _drawerRects  = {};     // 抽屉内按钮区域
let _drawerLastTY = 0;
let _drawerDragging = false;
let _drawerTotalH = 0;

// 照片轮播
let _carouselPos   = 0;
let _carouselForIdx = -1;
let _carouselImgs  = [];
let _carouselPrevRect = null;
let _carouselNextRect = null;

// 字体
let _msz = false;

// ── Public API ────────────────────────────────────────────────
export function showGallery(navigate) {
  _navigate = navigate;
  _cleanup();
  _currentGroup = 0;
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
  _nodeRects   = [];
  _bgStars     = [];
  _backRect    = null;
  _prevRect    = null;
  _nextRect    = null;
  _drawer      = null;
  _drawerRects = {};
  _carouselPos = 0;
  _carouselForIdx = -1;
  _carouselImgs = [];
  _carouselPrevRect = null;
  _carouselNextRect = null;
  _isDragging  = false;
  _slideProgress = 1;
}

function _computeLayout() {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;

  // 节点区：标题下到底部组指示器上方
  const areaTop    = G.SAFE_TOP + 72;
  const areaBottom = H - G.SAFE_BOTTOM - 44;
  const areaCX     = W / 2;
  const areaCY     = (areaTop + areaBottom) / 2;
  const areaW      = W * 0.86;
  const areaH      = areaBottom - areaTop;

  _nodeRects = _HEX_POS.map((pos, slot) => {
    const idx = _GROUPS[_currentGroup].levels[slot];
    return {
      cx: areaCX + pos.xr * areaW,
      cy: areaCY + pos.yr * areaH,
      r:  _NODE_R,
      idx,
      slot,
    };
  });

  if (_bgStars.length === 0) {
    _bgStars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.9 + 0.2,
      a: Math.random() * 0.55 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.8 + 0.8,
    }));
  }
}

// ── RAF loop ──────────────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // 切换动画
  if (_slideProgress < 1) _slideProgress = Math.min(1, _slideProgress + 0.07);
  // 抽屉动画
  if (_drawer) {
    _drawer.phase = Math.min(1, _drawer.phase + 0.06);
    _drawer.scrollY += (_drawer.scrollTarget - _drawer.scrollY) * 0.20;
  }

  // ── 背景 ─────────────────────────────────────────────────
  ctx.fillStyle = '#05081c';
  ctx.fillRect(0, 0, W, H);
  _drawNebulaBg(ctx, W, H, t);

  for (const s of _bgStars) {
    const tw = 0.6 + 0.4 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#d4e4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 固定 Header ──────────────────────────────────────────
  _backRect = _ghostBtn(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 80, 32, '← 返回');

  const titleFont = _msz ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.save();
  ctx.font = `bold 22px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.shadowColor = 'rgba(255,200,80,0.55)';
  ctx.shadowBlur  = 10;
  ctx.fillText('星座图鉴', W / 2, G.SAFE_TOP + 30);
  ctx.restore();

  // 已发现计数
  const discovered = CONSTELLATIONS.filter((_, i) => state.isUnlocked(i)).length;
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,200,255,0.65)';
  ctx.fillText(`${discovered}/${CONSTELLATIONS.length} 已解锁`, W - G.SAFE_RIGHT - 12, G.SAFE_TOP + 26);
  ctx.restore();

  // ── 星系名 + 切换箭头 ────────────────────────────────────
  const group  = _GROUPS[_currentGroup];
  const groupY = G.SAFE_TOP + 58;
  const canPrev = _currentGroup > 0;
  const canNext = _currentGroup < _GROUPS.length - 1;
  _prevRect = _arrowBtn(ctx, G.SAFE_LEFT + 10, groupY - 14, 28, 28, '‹', canPrev);
  _nextRect = _arrowBtn(ctx, W - G.SAFE_RIGHT - 38, groupY - 14, 28, 28, '›', canNext);

  ctx.save();
  ctx.font = `bold 15px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = group.color;
  ctx.shadowColor = group.glow + '0.6)';
  ctx.shadowBlur  = 8;
  ctx.fillText(group.name, W / 2, groupY);
  ctx.restore();

  // ── 节点区（clip + 切换动画） ────────────────────────────
  const padTop    = G.SAFE_TOP + 72;
  const padBottom = H - G.SAFE_BOTTOM - 44;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, padBottom - padTop);
  ctx.clip();

  const slideX = _slideDir * W * (1 - _easeOut(_slideProgress));
  ctx.save();
  ctx.translate(slideX, 0);

  // 蜂巢连线
  _drawHexEdges(ctx, t);

  // 节点
  for (const node of _nodeRects) {
    _drawNode(ctx, node, t);
  }
  ctx.restore();
  ctx.restore();

  // ── 组指示器 ─────────────────────────────────────────────
  _drawGroupIndicator(ctx, W, H);

  // ── 底部抽屉 ─────────────────────────────────────────────
  if (_drawer) {
    _drawDrawer(ctx, W, H, t);
  }

  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);
  _rafId = requestAnimationFrame(_loop);
}

// ── 背景星云 ──────────────────────────────────────────────────
function _drawNebulaBg(ctx, W, H, t) {
  const drift = Math.sin(t * 0.14) * 7;
  for (const n of _NEBULAE) {
    const nx = n.xr * W + drift * 0.4;
    const ny = n.yr * H + drift * 0.25;
    ctx.save();
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(nx, ny * n.rx / n.ry, 0, nx, ny * n.rx / n.ry, n.rx);
    g.addColorStop(0, `rgba(${n.col},${n.a})`);
    g.addColorStop(1, `rgba(${n.col},0)`);
    ctx.beginPath();
    ctx.arc(nx, ny * n.rx / n.ry, n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

// ── 蜂巢连线 ──────────────────────────────────────────────────
function _drawHexEdges(ctx, t) {
  const group = _GROUPS[_currentGroup];
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.lineDashOffset = -(t * 5) % 9;
  ctx.lineWidth = 0.7;
  for (const [a, b] of _HEX_EDGES) {
    const na = _nodeRects[a];
    const nb = _nodeRects[b];
    if (!na || !nb) continue;
    const bothUnlocked = state.isUnlocked(na.idx) && state.isUnlocked(nb.idx);
    ctx.globalAlpha = bothUnlocked ? 0.22 : 0.06;
    ctx.strokeStyle = bothUnlocked ? group.color : '#445588';
    ctx.beginPath();
    ctx.moveTo(na.cx, na.cy);
    ctx.lineTo(nb.cx, nb.cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── 节点绘制 ──────────────────────────────────────────────────
function _drawNode(ctx, node, t) {
  const { cx, cy, r, idx, slot } = node;
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);
  const explored = score && score.stars > 0;  // 曾经通关（即"探索过"）
  const isActive = _drawer && _drawer.idx === idx;  // 当前选中
  const group    = _GROUPS[_currentGroup];

  ctx.save();
  ctx.globalAlpha = unlocked ? 1.0 : 0.28;

  // ── 外发光 ───────────────────────────────────────────────
  if (unlocked) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + slot * 0.6);
    const glowR = r * (isActive ? 2.8 : (explored ? 2.4 : 2.0));
    const ga    = isActive ? 0.22 + pulse * 0.12 : (explored ? 0.14 + pulse * 0.06 : 0.08 + pulse * 0.04);
    const grd   = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, glowR);
    grd.addColorStop(0, group.glow + String(ga) + ')');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, TWO_PI);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // ── 节点主体 ─────────────────────────────────────────────
  const bodyGrd = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.22, r * 0.05, cx, cy, r);
  if (unlocked) {
    if (isActive) {
      bodyGrd.addColorStop(0, 'rgba(55,70,170,0.98)');
      bodyGrd.addColorStop(0.6, 'rgba(30,45,130,0.96)');
      bodyGrd.addColorStop(1, 'rgba(12,20,70,0.93)');
    } else if (explored) {
      bodyGrd.addColorStop(0, 'rgba(40,55,140,0.96)');
      bodyGrd.addColorStop(0.6, 'rgba(22,35,105,0.94)');
      bodyGrd.addColorStop(1, 'rgba(8,14,55,0.91)');
    } else {
      bodyGrd.addColorStop(0, 'rgba(35,50,120,0.94)');
      bodyGrd.addColorStop(0.6, 'rgba(18,28,90,0.92)');
      bodyGrd.addColorStop(1, 'rgba(6,10,45,0.89)');
    }
  } else {
    bodyGrd.addColorStop(0, 'rgba(18,20,45,0.80)');
    bodyGrd.addColorStop(1, 'rgba(6,8,26,0.70)');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TWO_PI);
  ctx.fillStyle = bodyGrd;
  ctx.fill();

  // ── 边框 ─────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TWO_PI);
  if (unlocked) {
    const ba    = 0.50 + Math.sin(t * 1.0 + slot * 0.5) * 0.15;
    const alpha = Math.round(ba * 255).toString(16).padStart(2, '0');
    ctx.strokeStyle = isActive ? COLORS.starGold + 'dd' : (group.color + alpha);
    ctx.lineWidth   = isActive ? 2.2 : (explored ? 1.6 : 1.0);
  } else {
    ctx.strokeStyle = 'rgba(45,50,90,0.28)';
    ctx.lineWidth   = 0.7;
  }
  ctx.stroke();

  // ── 内容 ─────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, TWO_PI);
  ctx.clip();

  if (unlocked) {
    // Mini 星座图
    if (c.stars && c.stars.length > 0) {
      const size = (r - 4) * 1.55;
      const pts  = c.stars.map(s => ({
        x: cx + (s.x - 0.5) * size,
        y: cy + (s.y - 0.5) * size,
      }));
      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.strokeStyle = group.color + 'bb';
      ctx.lineWidth   = 0.7;
      ctx.lineCap     = 'round';
      for (const [a, b] of (c.lines || [])) {
        if (!pts[a] || !pts[b]) continue;
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.88;
      for (let i = 0; i < pts.length; i++) {
        const sr = (i === 0 && pts.length > 4) ? 2.0 : 1.2;
        ctx.fillStyle = typeToColor(c.stars[i].type);
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, sr, 0, TWO_PI);
        ctx.fill();
      }
      ctx.restore();
    }
  } else {
    // 锁
    ctx.globalAlpha = 0.5;
    ctx.font = `${r * 0.80}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', cx, cy + r * 0.05);
  }
  ctx.restore();
  ctx.restore();

  // ── 节点外标签 ───────────────────────────────────────────
  const labelAlpha = unlocked ? 0.92 : 0.28;
  ctx.save();
  ctx.globalAlpha = labelAlpha;

  // Emoji icon（小，右上角角徽）
  if (unlocked && c.icon) {
    const badgeSize = 13;
    const bx = cx + r * 0.62;
    const by = cy - r * 0.62;
    ctx.font = `${badgeSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.fillText(c.icon, bx, by); } catch (e) {}
  }

  // 中文名
  ctx.font = `bold 11px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = unlocked ? (isActive ? COLORS.starGold : group.color) : 'rgba(70,75,120,0.6)';
  ctx.shadowColor = unlocked ? group.color : 'transparent';
  ctx.shadowBlur  = 3;
  ctx.fillText(c.nameZh, cx, cy + r + 5);

  // 探索状态标记（已通关=★, 仅解锁=○）
  if (unlocked) {
    const starred = explored ? '★' : '○';
    ctx.font = `10px sans-serif`;
    ctx.fillStyle = explored ? COLORS.starGold : 'rgba(160,150,210,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText(starred, cx, cy + r + 18);
  }
  ctx.restore();

  // ── 脉冲外环（当前选中） ──────────────────────────────────
  if (isActive && _drawer) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.8);
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.strokeStyle = COLORS.starGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6 + pulse * 4, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }
}

// ── 组指示器 ──────────────────────────────────────────────────
function _drawGroupIndicator(ctx, W, H) {
  const n     = _GROUPS.length;
  const dotR  = 5;
  const gap   = 18;
  const totalW = n * dotR * 2 + (n - 1) * (gap - dotR * 2);
  const startX = (W - totalW) / 2 + dotR;
  const dotY   = H - G.SAFE_BOTTOM - 18;

  for (let i = 0; i < n; i++) {
    const dx     = startX + i * gap;
    const active = i === _currentGroup;
    const done   = _GROUPS[i].levels.every(idx => state.isUnlocked(idx));

    ctx.save();
    if (active) { ctx.shadowColor = _GROUPS[i].color; ctx.shadowBlur = 8; }
    ctx.globalAlpha = active ? 1.0 : 0.50;
    ctx.beginPath();
    ctx.arc(dx, dotY, active ? dotR + 2 : dotR, 0, TWO_PI);
    ctx.fillStyle = _GROUPS[i].color;
    ctx.fill();
    if (done && !active) {
      ctx.globalAlpha = 0.7;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#05081c';
      ctx.fillText('✓', dx, dotY);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = _GROUPS[_currentGroup].color;
  ctx.globalAlpha = 0.7;
  ctx.fillText(`${_currentGroup + 1}/${n}  ${_GROUPS[_currentGroup].name}`, W / 2, H - G.SAFE_BOTTOM - 30);
  ctx.restore();
}

// ── 底部抽屉 ──────────────────────────────────────────────────
// 从底部滑入，覆盖屏幕下半（约70%）
function _drawDrawer(ctx, W, H, t) {
  if (!_drawer) return;
  const c   = CONSTELLATIONS[_drawer.idx];
  const grpIdx = _GROUPS.findIndex(g => g.levels.includes(_drawer.idx));
  const grp = _GROUPS[Math.max(0, grpIdx)];

  const DRAWER_H = H * 0.72;
  const phase    = _easeOut(_drawer.phase);
  const drawerY  = H - DRAWER_H * phase;

  // 遮罩
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.55 * phase})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 抽屉背景
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,42,0.97)';
  _roundRect(ctx, 0, drawerY, W, DRAWER_H + 20, 18);
  ctx.fill();
  // 顶部彩色线
  ctx.strokeStyle = grp.color + '66';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, drawerY + 1);
  ctx.lineTo(W - 20, drawerY + 1);
  ctx.stroke();
  ctx.restore();

  // 拖动手柄
  ctx.save();
  ctx.fillStyle = 'rgba(140,150,220,0.35)';
  _roundRect(ctx, W / 2 - 22, drawerY + 7, 44, 4, 2);
  ctx.fill();
  ctx.restore();

  // 关闭按钮
  _drawerRects.close = _ghostBtn(ctx, W - G.SAFE_RIGHT - 50, drawerY + 12, 40, 28, '✕ 关');

  // ── 可滚动内容区 ───────────────────────────────────────────
  const CLIP_TOP  = drawerY + 46;
  const CLIP_H    = DRAWER_H - 46 - (G.SAFE_BOTTOM || 0) - 8;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CLIP_TOP, W, CLIP_H);
  ctx.clip();
  ctx.translate(0, -_drawer.scrollY + CLIP_TOP);

  const SL   = (G.SAFE_LEFT || 0) + 18;
  const SR   = (G.SAFE_RIGHT || 0) + 18;
  const CW   = W - SL - SR;
  let   oy   = 10;

  const titleFont = _msz ? "'Ma Shan Zheng', serif" : 'serif';

  // 星座名 + 英文名
  ctx.save();
  ctx.font = `bold 26px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grp.color;
  ctx.shadowColor = grp.color;
  ctx.shadowBlur  = 12;
  ctx.fillText(c.nameZh, W / 2, oy + 14);
  ctx.restore();
  oy += 32;

  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(160,155,200,0.75)';
  ctx.fillText(c.nameEn + (c.icon ? '  ' + c.icon : '') + '  ·  ' + grp.name, W / 2, oy);
  ctx.restore();
  oy += 22;

  // 信息pills
  const infos = [
    c.region        ? `📍 ${c.region}` : null,
    c.bestViewMonth ? `🗓 ${c.bestViewMonth}` : null,
    c.mainStars     ? `⭐ ${c.mainStars}` : null,
  ].filter(Boolean);

  if (infos.length > 0) {
    oy += 4;
    const pillH = 22;
    let px = SL;
    for (const info of infos) {
      ctx.save();
      ctx.font = '11px sans-serif';
      const tw = ctx.measureText(info).width + 16;
      ctx.fillStyle = 'rgba(60,70,140,0.55)';
      _roundRect(ctx, px, oy, tw, pillH, 11);
      ctx.fill();
      ctx.strokeStyle = grp.color + '44';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200,200,240,0.85)';
      ctx.fillText(info, px + 8, oy + pillH / 2);
      ctx.restore();
      px += tw + 8;
      if (px > W - SR - 80) { px = SL; oy += pillH + 5; }
    }
    oy += pillH + 10;
  }

  // ── 大星图 ─────────────────────────────────────────────────
  if (c.stars && c.stars.length > 0) {
    const CHART_SIZE = Math.min(CW * 0.70, 180);
    const chartX     = SL + (CW - CHART_SIZE) / 2;
    const chartY     = oy;
    const PAD        = 20;
    const AREA       = CHART_SIZE - PAD * 2;

    // 圆形背景
    const bgG = ctx.createRadialGradient(
      chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, 0,
      chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, CHART_SIZE / 2
    );
    bgG.addColorStop(0, 'rgba(16,20,55,0.96)');
    bgG.addColorStop(1, 'rgba(6,8,28,0.88)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, CHART_SIZE / 2, 0, TWO_PI);
    ctx.fillStyle = bgG;
    ctx.fill();
    ctx.strokeStyle = grp.color + '55';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(chartX + CHART_SIZE / 2, chartY + CHART_SIZE / 2, CHART_SIZE / 2 - 2, 0, TWO_PI);
    ctx.clip();

    const mapped = c.stars.map(s => ({
      x: chartX + PAD + s.x * AREA,
      y: chartY + PAD + s.y * AREA,
      r: Math.min(magToRadius(s.mag) * 1.4, 7),
      color: typeToColor(s.type),
      name: s.name,
      mag: s.mag,
    }));

    // 连线
    ctx.strokeStyle = grp.color + 'cc';
    ctx.lineWidth   = 1.4;
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

    // 星点
    for (const s of mapped) {
      const grd2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
      grd2.addColorStop(0, s.color);
      grd2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.fillStyle = grd2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.5, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }

    // 星名标注（最亮5颗）
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
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
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
      ctx.beginPath(); ctx.moveTo(bs.x, bs.y); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.textAlign  = lx >= cx2 ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(bs.name, lx + (lx >= cx2 ? 2 : -2), ly);
    }
    ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();
    oy += CHART_SIZE + 14;
  }

  // ── 照片轮播 ──────────────────────────────────────────────
  const photos = c.photos || (c.photo ? [c.photo] : []);
  if (_carouselForIdx !== _drawer.idx) {
    _carouselForIdx = _drawer.idx;
    _carouselImgs   = [];
    _carouselPos    = 0;
    photos.forEach((url, i) => _loadPhoto(url, i, _drawer.idx));
  }

  if (photos.length > 0) {
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.starGold;
    ctx.fillText('天文摄影 · ASTROPHOTOGRAPHY', SL, oy + 8);
    ctx.restore();
    oy += 20;
  }

  const PHOTO_H = 150;
  const slot    = _carouselImgs[_carouselPos] || { img: null, loaded: false, error: false };
  ctx.save();
  ctx.fillStyle = 'rgba(25,20,55,0.75)';
  _roundRect(ctx, SL, oy, CW, PHOTO_H, 8);
  ctx.fill();
  _roundRect(ctx, SL, oy, CW, PHOTO_H, 8);
  ctx.clip();
  if (slot.loaded && slot.img) {
    // object-fit:contain — 保持图片宽高比居中显示
    const iw = slot.img.width  || CW;
    const ih = slot.img.height || PHOTO_H;
    const scale = Math.min(CW / iw, PHOTO_H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = SL + (CW - dw) / 2;
    const dy = oy + (PHOTO_H - dh) / 2;
    ctx.drawImage(slot.img, dx, dy, dw, dh);
  } else if (slot.error || photos.length === 0) {
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(160,150,200,0.4)';
    ctx.fillText('📷', SL + CW / 2, oy + PHOTO_H / 2 - 12);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(140,130,180,0.55)';
    ctx.fillText('暂无图片', SL + CW / 2, oy + PHOTO_H / 2 + 12);
  } else {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,140,190,0.65)';
    ctx.fillText('加载中...', SL + CW / 2, oy + PHOTO_H / 2);
  }
  ctx.restore();

  if (photos.length > 1) {
    const BW = 30, BH = 40, BY = oy + (PHOTO_H - BH) / 2;
    const drawBtn2 = (bx, label, active2) => {
      ctx.save();
      ctx.globalAlpha = active2 ? 0.80 : 0.22;
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
    _carouselPrevRect = drawBtn2(SL + 3, '‹', _carouselPos > 0);
    _carouselNextRect = drawBtn2(SL + CW - BW - 3, '›', _carouselPos < photos.length - 1);
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(210,205,255,0.8)';
    ctx.fillText(`${_carouselPos + 1}/${photos.length}`, SL + CW / 2, oy + PHOTO_H - 9);
    ctx.restore();
  } else {
    _carouselPrevRect = null;
    _carouselNextRect = null;
  }
  oy += PHOTO_H + 14;

  // ── 分割线 + lore ──────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = grp.color + '30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SL, oy); ctx.lineTo(SL + CW, oy);
  ctx.stroke();
  ctx.restore();
  oy += 12;

  ctx.save();
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(205,200,240,0.88)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = _wrapText(ctx, c.lore || '', CW);
  for (const line of lines) {
    ctx.fillText(line, SL, oy);
    oy += 18;
  }
  ctx.restore();
  oy += 20;

  _drawerTotalH      = oy;
  const maxScroll    = Math.max(0, _drawerTotalH - CLIP_H);
  _drawer.scrollTarget = Math.max(0, Math.min(maxScroll, _drawer.scrollTarget));

  ctx.restore();
}

// ── 幽灵按钮 ──────────────────────────────────────────────────
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

function _arrowBtn(ctx, x, y, w, h, label, enabled) {
  ctx.save();
  ctx.globalAlpha = enabled ? 0.85 : 0.25;
  ctx.fillStyle = 'rgba(60,70,140,0.6)';
  ctx.strokeStyle = enabled ? 'rgba(140,160,255,0.5)' : 'rgba(80,80,120,0.3)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = enabled ? '#aabbff' : '#555580';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
  return { x, y, w, h };
}

// ── 照片加载 ──────────────────────────────────────────────────
// STORY-00351: 直接用 img.src 赋值，不走 wx.downloadFile（需要域名白名单）
// img.src 赋值在开发模式关闭域名校验后即可访问任意 HTTPS URL
function _loadPhoto(url, pos, conIdx) {
  if (!url) { _carouselImgs[pos] = { img: null, loaded: false, error: true }; return; }
  _carouselImgs[pos] = { img: null, loaded: false, error: false };
  try {
    const img   = wx.createImage();
    const timer = setTimeout(() => {
      if (_carouselImgs[pos] && !_carouselImgs[pos].loaded)
        _carouselImgs[pos] = { img: null, loaded: false, error: true };
    }, 10000);
    img.onload  = () => { clearTimeout(timer); if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img, loaded: true, error: false }; };
    img.onerror = () => { clearTimeout(timer); if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true }; };
    img.src = url;
  } catch (e) {
    if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true };
  }
}

// ── 文字自动换行 ───────────────────────────────────────────────
function _wrapText(ctx, text, maxWidth) {
  const paras = text.split('\n');
  const lines = [];
  for (const para of paras) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = ch; }
      else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

// ── 辅助 ──────────────────────────────────────────────────────
function _easeOut(t) { return 1 - Math.pow(1 - t, 3); }

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

function _switchGroup(newGroup, dir) {
  if (newGroup < 0 || newGroup >= _GROUPS.length) return;
  if (newGroup === _currentGroup) return;
  _currentGroup  = newGroup;
  _slideDir      = dir;
  _slideProgress = 0;
  _drawer        = null;
  _carouselForIdx = -1;
  _carouselImgs   = [];
  _computeLayout();
}

// ── Touch handling ─────────────────────────────────────────────
let _touchStartX2 = 0;

function _onTouchStart(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  _touchStartX2 = touch.clientX;
  _touchStartX  = touch.clientX;
  _touchStartY  = touch.clientY;
  _drawerLastTY = touch.clientY;
  _drawerDragging = false;
  _isDragging   = false;
}

function _onTouchMove(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const dy = touch.clientY - _drawerLastTY;
  _drawerLastTY = touch.clientY;
  const dx = touch.clientX - _touchStartX2;

  if (_drawer) {
    if (Math.abs(dy) > 2) _drawerDragging = true;
    if (_drawer) {
      const DRAWER_H = G.SCREEN_H * 0.72;
      const CLIP_H   = DRAWER_H - 46 - (G.SAFE_BOTTOM || 0) - 8;
      const maxScroll = Math.max(0, _drawerTotalH - CLIP_H);
      _drawer.scrollTarget = Math.max(0, Math.min(maxScroll, _drawer.scrollTarget - dy));
    }
  } else {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) _isDragging = true;
  }
}

function _onTouchEnd(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;
  const ty = touch.clientY;
  const dx = tx - _touchStartX2;

  // ── 抽屉开启状态 ──────────────────────────────────────────
  if (_drawer) {
    if (_drawerDragging) {
      // 向下大幅滑动 → 关闭抽屉
      if (ty - _touchStartY > 60) {
        _drawer = null;
        _carouselForIdx = -1;
        _carouselImgs   = [];
      }
      _drawerDragging = false;
      return;
    }

    // 关闭按钮
    if (_drawerRects.close && hitTest(_drawerRects.close, tx, ty)) {
      _drawer = null;
      _carouselForIdx = -1;
      _carouselImgs   = [];
      return;
    }

    // 照片轮播按钮（需要补偿scroll）
    const DRAWER_H = G.SCREEN_H * 0.72;
    const drawerY  = G.SCREEN_H - DRAWER_H * _easeOut(_drawer.phase);
    const CLIP_TOP = drawerY + 46;
    const sty = ty + _drawer.scrollY - CLIP_TOP;
    if (_carouselPrevRect && hitTest(_carouselPrevRect, tx, sty) && _carouselPos > 0) {
      _carouselPos--;
      return;
    }
    if (_carouselNextRect && hitTest(_carouselNextRect, tx, sty)) {
      const photos = CONSTELLATIONS[_drawer.idx].photos
        || (CONSTELLATIONS[_drawer.idx].photo ? [CONSTELLATIONS[_drawer.idx].photo] : []);
      if (_carouselPos < photos.length - 1) _carouselPos++;
      return;
    }

    // 点击抽屉外区域 → 关闭
    if (ty < drawerY) {
      _drawer = null;
      _carouselForIdx = -1;
      _carouselImgs   = [];
    }
    return;
  }

  // ── 左右滑动切换星系 ──────────────────────────────────────
  if (_isDragging) {
    _isDragging = false;
    if (Math.abs(dx) > 50) {
      if (dx < 0) _switchGroup(_currentGroup + 1, -1);
      else        _switchGroup(_currentGroup - 1,  1);
    }
    return;
  }

  // ── 固定按钮 ─────────────────────────────────────────────
  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate('menu');
    return;
  }
  if (_prevRect && hitTest(_prevRect, tx, ty) && _currentGroup > 0) {
    _switchGroup(_currentGroup - 1, 1);
    return;
  }
  if (_nextRect && hitTest(_nextRect, tx, ty) && _currentGroup < _GROUPS.length - 1) {
    _switchGroup(_currentGroup + 1, -1);
    return;
  }

  // ── 节点点击 → 打开抽屉 ──────────────────────────────────
  for (const node of _nodeRects) {
    if (Math.hypot(tx - node.cx, ty - node.cy) <= node.r + 12) {
      if (!state.isUnlocked(node.idx)) {
        try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
        return;
      }
      // 同一节点再次点击 → 关闭抽屉
      if (_drawer && _drawer.idx === node.idx) {
        _drawer = null;
        _carouselForIdx = -1;
        _carouselImgs   = [];
        return;
      }
      _drawer = { idx: node.idx, phase: 0, scrollY: 0, scrollTarget: 0 };
      _carouselForIdx = -1;
      _carouselImgs   = [];
      _carouselPos    = 0;
      return;
    }
  }
}
