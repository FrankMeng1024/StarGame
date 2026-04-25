// levels.js — Canvas 选关屏幕（微信小游戏版）
// STORY-00348: 星系分组选关 — 30个关卡分5组，每组6个，逐组解锁

import { G, onTouch, offTouch } from '../engine/globals.js';
import {
  COLORS,
  drawButton, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { ITEMS } from './shop.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── 星系分组定义 ───────────────────────────────────────────────
// 5组 × 6个关卡，每组完成（全部通关）才解锁下一组
const _GROUPS = [
  {
    name: '冬季星空',
    color: '#88ccff',
    glowColor: 'rgba(80,160,255,0.18)',
    levels: [0, 1, 4, 5, 6, 7],   // 猎户/大熊/白羊/金牛/双子/巨蟹
  },
  {
    name: '夏季黄道',
    color: '#ffcc66',
    glowColor: 'rgba(255,180,60,0.18)',
    levels: [2, 3, 8, 9, 10, 11], // 天蝎/狮子/处女/天秤/射手/摩羯
  },
  {
    name: '秋日星原',
    color: '#cc99ff',
    glowColor: 'rgba(180,100,255,0.18)',
    levels: [12, 13, 14, 15, 16, 17], // 水瓶/双鱼/仙后/英仙/天鹰/天鹅
  },
  {
    name: '北天极圈',
    color: '#66ffcc',
    glowColor: 'rgba(60,220,160,0.18)',
    levels: [18, 19, 20, 21, 22, 23], // 天琴/南十字/小熊/牧夫/御夫/飞马
  },
  {
    name: '南天深空',
    color: '#ff8888',
    glowColor: 'rgba(255,80,80,0.18)',
    levels: [24, 25, 26, 27, 28, 29], // 海豚/南鱼/天龙/蛇夫/半人马/猎犬
  },
];

// 6节点的布局位置（比例坐标，相对于节点区域中心）
// 排成2行3列，间距充足
const _NODE_POSITIONS = [
  // row0
  { xr: -0.340, yr: -0.28 },
  { xr:  0.000, yr: -0.28 },
  { xr:  0.340, yr: -0.28 },
  // row1
  { xr: -0.340, yr:  0.28 },
  { xr:  0.000, yr:  0.28 },
  { xr:  0.340, yr:  0.28 },
];

const _NODE_R = 30;  // 节点半径（比原来14-22px大得多）

// ── 背景星云 ──────────────────────────────────────────────────
const _NEBULAE = [
  { xr: 0.22, yr: 0.32, rx: 130, ry: 80,  col: '100,70,255',  a: 0.07 },
  { xr: 0.78, yr: 0.62, rx: 110, ry: 65,  col: '40,180,200',  a: 0.06 },
  { xr: 0.50, yr: 0.88, rx: 140, ry: 80,  col: '200,80,150',  a: 0.05 },
];

// ── 模块状态 ──────────────────────────────────────────────────
let _navigate      = null;
let _rafId         = null;
let _backRect      = null;
let _shopRect      = null;

let _nodeRects     = [];   // [{cx, cy, r, levelIdx}] per-group
let _currentGroup  = 0;    // 当前显示的星系组索引
let _groupAnim     = 0;    // 当前group动画时间偏移（用于进入动画）
// ── Spring lerp 切换动画（与图鉴界面完全一致） ──────────────────
let _slideX        = 0;    // 当前节点区域 X 偏移（实际渲染值）
let _slideTargetX  = 0;    // 目标 X 偏移
let _pendingGroup  = 0;    // 动画目标对应的组（动画完成后 commit）
let _pendingNodes  = null; // 目标组的节点布局（动画中同屏渲染）
let _bgStars       = [];

// STORY-00342: Ma Shan Zheng font
let _maShanZhengLoaded = false;

// ── Item selection overlay ────────────────────────────────────
let _overlayActive       = false;
let _overlayToggled      = new Set();
let _overlayBtnRects     = [];
let _overlayConfirm      = null;
let _overlaySkip         = null;
let _overlayScrollY      = 0;
let _overlayScrollTarget = 0;
let _overlayTotalRowsH   = 0;
let _overlayRowsClipY    = 0;
let _overlayRowsClipH    = 0;
let _isDragging          = false;
let _lastTouchY          = 0;

// ── Public API ────────────────────────────────────────────────
export function showLevels(navigate) {
  _navigate = navigate;
  _cleanup();

  // 确定当前应该显示哪个星系：找第一个未完成的组
  _currentGroup = _getActiveGroup();
  _pendingGroup = _currentGroup;

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

  onTouch('start', _onTouchStart);
  onTouch('move',  _onTouchMove);
  onTouch('end',   _onTouchEnd);

  _rafId = requestAnimationFrame(_loop);
}

export function hideLevels() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    offTouch('start', _onTouchStart);
    offTouch('move',  _onTouchMove);
    offTouch('end',   _onTouchEnd);
  }
  _nodeRects    = [];
  _bgStars      = [];
  _backRect     = null;
  _shopRect     = null;
  _slideX       = 0;
  _slideTargetX = 0;
  _pendingGroup = 0;
  _currentGroup = 0;
  _pendingNodes = null;
  _overlayActive = false;
  _overlayToggled.clear();
  _overlayBtnRects = [];
  _overlayConfirm = null;
  _overlaySkip    = null;
  _overlayScrollY = _overlayScrollTarget = 0;
  _overlayTotalRowsH = 0;
  _isDragging = false;
}

// 找第一个未完成/未完全锁定的组
function _getActiveGroup() {
  for (let g = 0; g < _GROUPS.length; g++) {
    if (_isGroupUnlocked(g) && !_isGroupCompleted(g)) return g;
  }
  // 全完成了就显示最后一组
  return _GROUPS.length - 1;
}

// 第g组是否已解锁（第0组始终解锁；后续组需要前一组完成）
function _isGroupUnlocked(g) {
  if (g === 0) return true;
  return _isGroupCompleted(g - 1);
}

// 第g组是否全部完成（组内所有关卡都已通关，即isUnlocked意味着第一关解锁，但完成=有分数）
function _isGroupCompleted(g) {
  return _GROUPS[g].levels.every(idx => {
    const sc = state.getScore(idx);
    return sc && sc.stars > 0;
  });
}

function _computeLayout() {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;

  // 节点区域：标题下方到底部留出组指示器空间
  const nodeAreaTop    = G.SAFE_TOP + 60;
  const nodeAreaBottom = H - G.SAFE_BOTTOM - 28;  // 留28px给底部组指示器（去掉1/5文字后空间够用）
  const nodeAreaCX     = W / 2;
  const nodeAreaCY     = (nodeAreaTop + nodeAreaBottom) / 2;
  const nodeAreaW      = W * 0.82;
  const nodeAreaH      = nodeAreaBottom - nodeAreaTop;

  _nodeRects = _NODE_POSITIONS.map((pos, slot) => {
    const levelIdx = _GROUPS[_currentGroup].levels[slot];
    return {
      cx: nodeAreaCX + pos.xr * nodeAreaW,
      cy: nodeAreaCY + pos.yr * nodeAreaH,
      r:  _NODE_R,
      levelIdx,
      slot,
    };
  });

  // 背景星点（生成一次）
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

function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // ── Spring lerp 切换动画 ─────────────────────────────────
  _slideX += (_slideTargetX - _slideX) * 0.18;
  if (!_isDragging && Math.abs(_slideX - _slideTargetX) < 0.5) {
    if (_pendingGroup !== _currentGroup) {
      _currentGroup = _pendingGroup;
      if (_pendingNodes) {
        _nodeRects    = _pendingNodes;
        _pendingNodes = null;
      }
    }
    _slideX       = 0;
    _slideTargetX = 0;
  }

  // ── 背景 ──────────────────────────────────────────────────
  ctx.fillStyle = '#05081c';
  ctx.fillRect(0, 0, W, H);

  // 星云光晕
  _drawNebulaBg(ctx, W, H, t);

  // 背景星点
  for (const s of _bgStars) {
    const tw = 0.6 + 0.4 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#d4e4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 固定Header ────────────────────────────────────────────
  _backRect = _drawBackBtn(ctx, G.SAFE_LEFT + 90, G.SAFE_TOP + 10, 80, 32);
  _shopRect = _drawShopBtn(ctx, W - G.SAFE_RIGHT - 90 - 68, G.SAFE_TOP + 10, 68, 32);

  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.save();
  ctx.font = `bold 22px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.starGold;
  ctx.shadowColor = 'rgba(255,200,80,0.55)';
  ctx.shadowBlur  = 10;
  ctx.fillText('选择关卡', W / 2, G.SAFE_TOP + 30);
  ctx.restore();

  // STORY-00412: Progress text "进度: X/30 星座" — count started constellations
  {
    let started = 0;
    for (let ci = 0; ci < 30; ci++) {
      const sc = state.getScore(ci);
      if (sc && sc.stars > 0) started++;
    }
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,220,100,0.8)';
    ctx.fillText(`进度: ${started}/30 星座`, W - 10, G.SAFE_TOP + 30);
    ctx.restore();
  }

  // ── 星系名称（随滑动淡入淡出） ───────────────────────────────
  const group = _GROUPS[_currentGroup];
  const penGroup = _GROUPS[_pendingGroup];
  const groupY = G.SAFE_TOP + 58;

  // 星系名 crossfade
  const nameAlpha = Math.max(0, 1 - Math.abs(_slideX) / (W * 0.35));
  const pendingAlpha = Math.min(1, Math.abs(_slideX) / (W * 0.35));
  if (nameAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = nameAlpha;
    ctx.font = `bold 15px ${titleFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = group.color;
    ctx.shadowColor = group.glowColor.replace('0.18', '0.6');
    ctx.shadowBlur  = 8;
    ctx.fillText(group.name, W / 2, groupY);
    ctx.restore();
  }
  if (pendingAlpha > 0.01 && _pendingGroup !== _currentGroup) {
    ctx.save();
    ctx.globalAlpha = pendingAlpha;
    ctx.font = `bold 15px ${titleFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = penGroup.color;
    ctx.shadowColor = penGroup.glowColor.replace('0.18', '0.6');
    ctx.shadowBlur  = 8;
    ctx.fillText(penGroup.name, W / 2, groupY);
    ctx.restore();
  }

  // ── 节点区域（clip + spring slideX，与图鉴完全一致） ─────────
  const padTop = G.SAFE_TOP + 72;
  const padBottom = H - G.SAFE_BOTTOM - 28;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, padBottom - padTop);
  ctx.clip();

  // 当前组节点（偏移 _slideX，随滑动淡出）
  const slideRatio = Math.min(1, Math.abs(_slideX) / W);
  ctx.save();
  ctx.translate(_slideX, 0);
  ctx.globalAlpha = Math.max(0, 1 - slideRatio * 0.5);
  _drawGroupConnections(ctx, t);
  for (const node of _nodeRects) {
    _drawNode(ctx, node, t, _currentGroup);
  }
  ctx.restore();

  // 目标组节点（同屏对面，随滑动淡入）
  if (_pendingNodes && _pendingGroup !== _currentGroup) {
    const pdir = _pendingGroup > _currentGroup ? -1 : 1;
    ctx.save();
    ctx.translate(_slideX + pdir * -W, 0);
    ctx.globalAlpha = Math.min(1, slideRatio * 1.2);
    _drawGroupConnectionsFor(ctx, t, _pendingNodes);
    for (const node of _pendingNodes) {
      _drawNode(ctx, node, t, _pendingGroup);
    }
    ctx.restore();
  }

  // 完成徽章（仅当前组，不随切换动画）
  const groupDone = _isGroupCompleted(_currentGroup);
  if (groupDone) {
    _drawCompleteBadge(ctx, W, padTop, padBottom, t);
  }

  ctx.restore();

  // ── 底部组指示器 ──────────────────────────────────────────
  _drawGroupIndicator(ctx, W, H);

  // ── 道具选择遮罩 ──────────────────────────────────────────
  if (_overlayActive) {
    _drawItemOverlay(ctx, W, H);
  }

  // 全局淡入淡出
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

// ── 渲染辅助 ──────────────────────────────────────────────────

function _easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function _drawNebulaBg(ctx, W, H, t) {
  const drift = Math.sin(t * 0.15) * 8;
  for (const n of _NEBULAE) {
    const nx = n.xr * W + drift * 0.5;
    const ny = n.yr * H + drift * 0.3;
    ctx.save();
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(nx, ny * (n.rx / n.ry), 0, nx, ny * (n.rx / n.ry), n.rx);
    g.addColorStop(0, `rgba(${n.col},${n.a})`);
    g.addColorStop(1, `rgba(${n.col},0)`);
    ctx.beginPath();
    ctx.arc(nx, ny * (n.rx / n.ry), n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

// 透明边框幽灵按钮（融入深空背景，不抢眼）
function _drawGhostBtn(ctx, x, y, w, h, label) {
  ctx.save();
  // 极淡背景
  ctx.fillStyle = 'rgba(20,30,80,0.45)';
  _roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  // 细边框
  ctx.strokeStyle = 'rgba(120,150,255,0.30)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // 文字
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,200,255,0.75)';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
  return { x, y, w, h };
}

// 返回按钮 — 星座连线风：左侧两点连线 + 「返回」
function _drawBackBtn(ctx, x, y, w, h) {
  ctx.save();
  const cy = y + h / 2;
  const cx = x + w / 2;

  // 渐变文字：白→蓝
  const tg = ctx.createLinearGradient(x, cy, x + w, cy);
  tg.addColorStop(0, 'rgba(255,255,255,0.92)');
  tg.addColorStop(1, 'rgba(140,180,255,0.85)');
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tg;
  ctx.shadowColor = 'rgba(160,200,255,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText('← 返回', cx, cy - 1);

  // 底部渐变线
  ctx.shadowBlur = 0;
  const lg = ctx.createLinearGradient(x, 0, x + w, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0)');
  lg.addColorStop(0.3, 'rgba(140,180,255,0.7)');
  lg.addColorStop(1, 'rgba(100,140,255,0.2)');
  ctx.strokeStyle = lg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 1);
  ctx.lineTo(x + w, y + h - 1);
  ctx.stroke();

  ctx.restore();
  return { x, y, w, h };
}

// 商店按钮 — 方案G：渐变文字+底部金色线
function _drawShopBtn(ctx, x, y, w, h) {
  ctx.save();
  const cy = y + h / 2;
  const cx = x + w / 2;

  // 渐变文字：金→橙
  const tg = ctx.createLinearGradient(x, cy, x + w, cy);
  tg.addColorStop(0, 'rgba(255,220,80,0.95)');
  tg.addColorStop(1, 'rgba(255,160,60,0.85)');
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tg;
  ctx.shadowColor = 'rgba(255,180,60,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText('✦ 道具', cx, cy - 1);

  // 底部渐变线
  ctx.shadowBlur = 0;
  const lg = ctx.createLinearGradient(x, 0, x + w, 0);
  lg.addColorStop(0, 'rgba(255,200,60,0.2)');
  lg.addColorStop(0.7, 'rgba(255,160,40,0.7)');
  lg.addColorStop(1, 'rgba(255,220,80,0)');
  ctx.strokeStyle = lg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 1);
  ctx.lineTo(x + w, y + h - 1);
  ctx.stroke();

  ctx.restore();
  return { x, y, w, h };
}

function _drawGroupConnections(ctx, t) {
  _drawGroupConnectionsFor(ctx, t, _nodeRects);
}

function _drawGroupConnectionsFor(ctx, t, nodes) {
  // 6节点之间画几条装饰线（不是全连接，只画邻近的）
  const pairs = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5]];
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#8899cc';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 8]);
  const dashOff = t * 6;
  ctx.lineDashOffset = -dashOff;
  for (const [a, b] of pairs) {
    if (a >= nodes.length || b >= nodes.length) continue;
    const na = nodes[a];
    const nb = nodes[b];
    ctx.beginPath();
    ctx.moveTo(na.cx, na.cy);
    ctx.lineTo(nb.cx, nb.cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function _drawNode(ctx, node, t, groupIdx) {
  const { cx, cy, r, levelIdx, slot } = node;
  const c        = CONSTELLATIONS[levelIdx];
  const unlocked = state.isUnlocked(levelIdx);
  const score    = state.getScore(levelIdx);
  const isNewest = _isNewestUnlocked(levelIdx);
  const alpha    = unlocked ? 1.0 : 0.28;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 外发光（已解锁）
  if (unlocked) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + slot * 0.7);
    const glowR = r * (isNewest ? (2.0 + pulse * 0.5) : 2.2);
    const ga = isNewest ? (0.16 + pulse * 0.10) : 0.10;
    const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, glowR);
    const group = _GROUPS[groupIdx];
    g.addColorStop(0, group.glowColor.replace('0.18', String(ga)));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // 节点主体渐变
  const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
  if (unlocked) {
    grad.addColorStop(0, 'rgba(45,60,140,0.97)');
    grad.addColorStop(0.6, 'rgba(22,32,100,0.95)');
    grad.addColorStop(1, 'rgba(8,12,50,0.92)');
  } else {
    grad.addColorStop(0, 'rgba(20,22,50,0.80)');
    grad.addColorStop(1, 'rgba(8,10,28,0.70)');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TWO_PI);
  ctx.fillStyle = grad;
  ctx.fill();

  // 边框
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TWO_PI);
  if (unlocked) {
    const ba = 0.50 + Math.sin(t * 1.0 + slot * 0.5) * 0.12;
    const group = _GROUPS[groupIdx];
    // 将颜色字符串转为rgba
    ctx.strokeStyle = group.color + Math.round(ba * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = isNewest ? 1.8 : 1.2;
  } else {
    ctx.strokeStyle = 'rgba(50,55,100,0.30)';
    ctx.lineWidth = 0.7;
  }
  ctx.stroke();

  // 内容（星座图 or 锁）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, TWO_PI);
  ctx.clip();
  if (unlocked) {
    _drawMiniConstellation(ctx, c, cx, cy, r - 1, 1.0);
  } else {
    ctx.globalAlpha = 0.45;
    ctx.font = `${r * 0.85}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', cx, cy + r * 0.05);
  }
  ctx.restore();
  ctx.restore();

  // 标签（节点外，全透明度）
  const labelAlpha = unlocked ? 0.90 : 0.30;
  ctx.save();
  ctx.globalAlpha = labelAlpha;
  ctx.font = `bold 11px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = unlocked ? '#c8d8ff' : 'rgba(80,85,130,0.6)';
  ctx.fillText(c.nameZh || c.nameEn, cx, cy + r + 5);
  if (unlocked) {
    const earned = (score && score.stars > 0) ? score.stars : 0;
    const starStr = '★'.repeat(earned) + '☆'.repeat(3 - earned);
    ctx.font = `10px sans-serif`;
    ctx.fillStyle = earned > 0 ? COLORS.starGold : 'rgba(160,140,220,0.55)';
    ctx.fillText(starStr, cx, cy + r + 18);
  }
  ctx.restore();

  // 最新可玩节点的脉冲外环
  if (isNewest) {
    const pulse2 = 0.5 + 0.5 * Math.sin(t * 2.5);
    ctx.save();
    ctx.globalAlpha = 0.25 * pulse2;
    ctx.strokeStyle = _GROUPS[groupIdx].color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5 + pulse2 * 4, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }

  // CR-138: 已完成节点 — 金色外环 + 4颗小装饰星
  const isCompleted = score && score.stars > 0;
  if (isCompleted) {
    ctx.save();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, TWO_PI);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 4颗装饰星点，距圆心 r+10，45°/135°/225°/315°
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI / 2) + Math.PI / 4;
      const sx = cx + Math.cos(ang) * (r + 10);
      const sy = cy + Math.sin(ang) * (r + 10);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  // STORY-00412: Fully mastered (3-star) node — gold outer glow ring (radius+6)
  if (score && score.stars >= 3) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,215,0,0.40)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }
}

// 是否是最新解锁（即：已解锁，但此关组内前一个刚完成，或者是第一关）
function _isNewestUnlocked(levelIdx) {
  if (!state.isUnlocked(levelIdx)) return false;
  const sc = state.getScore(levelIdx);
  if (sc && sc.stars > 0) return false;  // 已完成，不算"最新"
  return true;  // 解锁但未完成
}

function _drawMiniConstellation(ctx, c, cx, cy, r, alpha) {
  const size = r * 1.65;
  const pts = c.stars.map(s => ({
    x: cx + (s.x - 0.5) * size,
    y: cy + (s.y - 0.5) * size,
  }));
  ctx.save();
  ctx.globalAlpha = alpha * 0.60;
  ctx.strokeStyle = '#b8d0ff';
  ctx.lineWidth = 0.65;
  ctx.lineCap = 'round';
  for (const [a, b] of c.lines) {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#ddeeff';
  for (let i = 0; i < pts.length; i++) {
    const sr = (i === 0 && pts.length > 4) ? 1.8 : 1.1;
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, sr, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function _drawCompleteBadge(ctx, W, padTop, padBottom, t) {
  const pulse = 0.8 + 0.2 * Math.sin(t * 2);
  const cx = W / 2;
  const cy = (padTop + padBottom) / 2;
  ctx.save();
  ctx.globalAlpha = 0.18 * pulse;
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', cx, cy);
  ctx.restore();
}

function _drawGroupIndicator(ctx, W, H) {
  const n     = _GROUPS.length;
  const dotR  = 5;
  const gap   = 18;
  const totalW = n * dotR * 2 + (n - 1) * (gap - dotR * 2);
  const startX = (W - totalW) / 2 + dotR;
  const dotY   = H - G.SAFE_BOTTOM - 18;

  for (let i = 0; i < n; i++) {
    const dx = startX + i * gap;
    const unlocked = _isGroupUnlocked(i);
    const completed = _isGroupCompleted(i);
    const active    = (i === _currentGroup && i === _pendingGroup)
                    || (i === _pendingGroup && _pendingGroup !== _currentGroup);

    ctx.save();
    if (active) {
      ctx.shadowColor = _GROUPS[i].color;
      ctx.shadowBlur  = 8;
    }
    ctx.globalAlpha = active ? 1.0 : (unlocked ? 0.55 : 0.22);
    ctx.beginPath();
    ctx.arc(dx, dotY, active ? dotR + 2 : dotR, 0, TWO_PI);
    ctx.fillStyle = completed ? _GROUPS[i].color : (active ? _GROUPS[i].color : 'rgba(120,130,180,0.8)');
    ctx.fill();
    if (completed && !active) {
      ctx.globalAlpha = 0.7;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#05081c';
      ctx.fillText('✓', dx, dotY);
    }
    ctx.restore();
  }

}

// ── 切换星系（spring lerp，与图鉴一致） ──────────────────────────
function _switchGroup(newGroup) {
  if (newGroup < 0 || newGroup >= _GROUPS.length) return;
  if (newGroup === _currentGroup) return;

  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const nodeAreaTop    = G.SAFE_TOP + 60;
  const nodeAreaBottom = H - G.SAFE_BOTTOM - 28;
  const nodeAreaCX     = W / 2;
  const nodeAreaCY     = (nodeAreaTop + nodeAreaBottom) / 2;
  const nodeAreaW      = W * 0.82;
  const nodeAreaH      = nodeAreaBottom - nodeAreaTop;

  if (_pendingGroup !== newGroup || !_pendingNodes) {
    _pendingNodes = _NODE_POSITIONS.map((pos, slot) => ({
      cx: nodeAreaCX + pos.xr * nodeAreaW,
      cy: nodeAreaCY + pos.yr * nodeAreaH,
      r:  _NODE_R,
      levelIdx: _GROUPS[newGroup].levels[slot],
      slot,
    }));
  }

  const dir = newGroup > _currentGroup ? -1 : 1;
  _pendingGroup  = newGroup;
  _slideTargetX  = dir * W;
}

// ── Item selection overlay ────────────────────────────────────
function _drawItemOverlay(ctx, W, H) {
  _overlayScrollY += (_overlayScrollTarget - _overlayScrollY) * 0.22;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const ownedItems = ITEMS.filter(it => state.getItemQty(it.id) > 0);
  const cardW = Math.min(W - 40, 340);
  const rowH  = 60;
  const HEADER_H = 70;
  const FOOTER_H = 64;
  const naturalContentH = HEADER_H + ownedItems.length * rowH + FOOTER_H;
  const maxCardH = H - G.SAFE_TOP - G.SAFE_BOTTOM - 16;
  const cardH = Math.min(naturalContentH, maxCardH);
  const cardX = (W - cardW) / 2;
  const cardY = Math.max(G.SAFE_TOP + 8, (H - cardH) / 2);

  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.97)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = 'rgba(150,120,255,0.6)';
  ctx.shadowBlur  = 8;
  ctx.fillText('选择使用道具', W / 2, cardY + 30);
  ctx.restore();

  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text2;
  ctx.fillText('本关结束后自动消耗，可多选', W / 2, cardY + 54);
  ctx.restore();

  const rowsAreaTop  = cardY + HEADER_H;
  const rowsAreaH    = cardH - HEADER_H - FOOTER_H;
  _overlayTotalRowsH = ownedItems.length * rowH;
  _overlayRowsClipY  = rowsAreaTop;
  _overlayRowsClipH  = rowsAreaH;
  const maxRowScroll = Math.max(0, _overlayTotalRowsH - rowsAreaH);
  _overlayScrollTarget = Math.max(0, Math.min(maxRowScroll, _overlayScrollTarget));

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

    ctx.save();
    ctx.fillStyle = toggled ? 'rgba(60,180,100,0.18)' : 'rgba(255,255,255,0.04)';
    _roundRect(ctx, cardX + 10, rowY, cardW - 20, rowH - 5, 8);
    ctx.fill();
    if (toggled) {
      ctx.strokeStyle = 'rgba(60,220,100,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cardX + 14, rowY + rowH * 0.5 - 3);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(it.nameZh + '  ×' + qty, cardX + 48, rowY + 8);
    ctx.restore();

    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text2;
    ctx.fillText(it.desc, cardX + 48, rowY + 28);
    ctx.restore();

    const btnW = 62, btnH = 32;
    const btnX = cardX + cardW - 18 - btnW;
    const btnY = rowY + (rowH - 5 - btnH) / 2;
    const btn = drawButton(ctx, btnX, btnY, btnW, btnH, toggled ? '✓ 已选' : '使用', {
      fontSize: 12, radius: 8,
      color0: toggled ? 'rgba(30,140,70,0.9)' : 'rgba(80,60,160,0.85)',
      color1: toggled ? 'rgba(20,180,80,0.9)' : 'rgba(60,90,200,0.85)',
    });
    _overlayBtnRects.push({ id: it.id, rect: btn });
  });

  ctx.restore();

  const btnY2  = cardY + cardH - 54;
  const btnW2  = (cardW - 36) / 2;
  _overlaySkip    = drawButton(ctx, cardX + 10, btnY2, btnW2, 44, '跳过', {
    fontSize: 15, radius: 10,
    color0: 'rgba(60,60,100,0.80)', color1: 'rgba(80,80,140,0.80)',
  });
  _overlayConfirm = drawButton(ctx, cardX + cardW - 10 - btnW2, btnY2, btnW2, 44, '确定出发 →', {
    fontSize: 15, radius: 10,
    color0: 'rgba(30,130,60,0.90)', color1: 'rgba(20,180,80,0.90)',
  });
}

// ── Touch handling ────────────────────────────────────────────
let _touchStartX = 0;
let _touchStartY = 0;
let _touchStartTime = 0;

function _onTouchStart(e) {
  const touch = e.touches[0];
  if (!touch) return;
  _touchStartX    = touch.x;
  _touchStartY    = touch.y;
  _lastTouchY     = touch.y;
  _touchStartTime = Date.now();
  _isDragging     = false;
}

function _onTouchMove(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const dy = touch.y - _lastTouchY;
  _lastTouchY = touch.y;

  if (_overlayActive) {
    if (Math.abs(dy) > 2) _isDragging = true;
    const maxScroll = Math.max(0, _overlayTotalRowsH - _overlayRowsClipH);
    _overlayScrollTarget = Math.max(0, Math.min(maxScroll, _overlayScrollTarget - dy));
  } else {
    const dx = touch.x - _touchStartX;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) _isDragging = true;

    if (_isDragging && Math.abs(dx) > Math.abs(touch.y - _touchStartY)) {
      const W = G.SCREEN_W;
      const canLeft  = _currentGroup < _GROUPS.length - 1;
      const canRight = _currentGroup > 0;
      let rawDx = dx;
      if ((rawDx < 0 && !canLeft) || (rawDx > 0 && !canRight)) {
        rawDx *= 0.25; // 边界阻尼
      }
      _slideX       = rawDx;
      _slideTargetX = rawDx;

      // 预加载目标组节点
      const targetGroup = rawDx < 0 ? _currentGroup + 1 : _currentGroup - 1;
      if (targetGroup >= 0 && targetGroup < _GROUPS.length && targetGroup !== _pendingGroup) {
        const H2 = G.SCREEN_H;
        const nodeAreaTop    = G.SAFE_TOP + 60;
        const nodeAreaBottom = H2 - G.SAFE_BOTTOM - 28;
        const nodeAreaCX     = W / 2;
        const nodeAreaCY     = (nodeAreaTop + nodeAreaBottom) / 2;
        const nodeAreaW      = W * 0.82;
        const nodeAreaH      = nodeAreaBottom - nodeAreaTop;
        _pendingGroup = targetGroup;
        _pendingNodes = _NODE_POSITIONS.map((pos, slot) => ({
          cx: nodeAreaCX + pos.xr * nodeAreaW,
          cy: nodeAreaCY + pos.yr * nodeAreaH,
          r:  _NODE_R,
          levelIdx: _GROUPS[targetGroup].levels[slot],
          slot,
        }));
      }
    }
  }
}

function _onTouchEnd(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.x;
  const ty = touch.y;
  console.log('[levels] touch tx=' + tx + ' ty=' + ty);
  const dx = tx - _touchStartX;

  // ── 遮罩触摸 ─────────────────────────────────────────────
  if (_overlayActive) {
    if (_isDragging) { _isDragging = false; return; }

    const scrolledTY = ty + _overlayScrollY;
    for (const { id, rect } of _overlayBtnRects) {
      if (hitTest(rect, tx, scrolledTY)) {
        if (_overlayToggled.has(id)) _overlayToggled.delete(id);
        else _overlayToggled.add(id);
        return;
      }
    }
    if (_overlaySkip && hitTest(_overlaySkip, tx, ty)) {
      state.selectedItems = [];
      _overlayActive = false;
      _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game');
      return;
    }
    if (_overlayConfirm && hitTest(_overlayConfirm, tx, ty)) {
      state.selectedItems = [..._overlayToggled];
      _overlayActive = false;
      _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game');
      return;
    }
    _overlayActive = false;
    _overlayScrollY = _overlayScrollTarget = 0;
    return;
  }

  // ── 左右滑动切换星系 ──────────────────────────────────────
  const W = G.SCREEN_W;
  const dt = Math.max(1, Date.now() - _touchStartTime);
  const velocity = dx / dt; // px/ms
  const isFastSwipe = Math.abs(velocity) > 0.3 && Math.abs(dx) > 20;

  if (_isDragging || isFastSwipe) {
    _isDragging = false;
    const COMMIT_THRESHOLD = W * 0.28;
    if (Math.abs(_slideX) >= COMMIT_THRESHOLD || isFastSwipe) {
      const goDir = velocity < 0 ? 1 : -1;
      if (goDir > 0 && _currentGroup < _GROUPS.length - 1) {
        _switchGroup(_currentGroup + 1);
      } else if (goDir < 0 && _currentGroup > 0) {
        _switchGroup(_currentGroup - 1);
      } else {
        _slideTargetX = 0;
        _pendingGroup = _currentGroup;
        _pendingNodes = null;
      }
    } else {
      // 未达阈值 → 弹回原位
      _slideTargetX = 0;
      _pendingGroup = _currentGroup;
      _pendingNodes = null;
    }
    return;
  }

  // ── 固定按钮 ─────────────────────────────────────────────
  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate('menu');
    return;
  }
  if (_shopRect && hitTest(_shopRect, tx, ty)) {
    if (_navigate) _navigate('shop', { from: 'levels' });
    return;
  }

  // 左右切换箭头
  // ── 节点点击 ─────────────────────────────────────────────
  for (const node of _nodeRects) {
    if (Math.hypot(tx - node.cx, ty - node.cy) <= node.r + 10) {
      if (!state.isUnlocked(node.levelIdx)) return;
      state.currentLevel = node.levelIdx;

      const hasItems = ITEMS.some(it => state.getItemQty(it.id) > 0);
      if (hasItems) {
        _overlayActive = true;
        _overlayToggled.clear();
        _overlayBtnRects = [];
        _overlayScrollY = _overlayScrollTarget = 0;
        return;
      }
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
