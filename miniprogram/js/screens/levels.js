// levels.js — Canvas 选关屏幕（微信小游戏版）
// STORY-00346 Sprint-C: 螺旋星系臂布局 — 不受前两个sprint约束，纯视觉优化
// 视觉目标：银河双臂结构 + 深度视差 + AAA行星质感 + 动态粒子场

import { G } from '../engine/globals.js';
import {
  COLORS,
  drawButton, hitTest, drawFadeOverlay, tickFade,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { ITEMS } from './shop.js';
import state from '../engine/state.js';

const TWO_PI = Math.PI * 2;

// ── 螺旋臂节点坐标（世界空间，双螺旋：A臂+B臂各15节点）──────
// 每个节点: [xRatio of arm, radialDist from center, armSide]
// A臂：从中心向右上展开（0°→180°，按阿基米德螺旋）
// B臂：A臂旋转180°（对称）
function _buildSpiralLayout() {
  const nodes = [];
  const total = 30;
  for (let i = 0; i < total; i++) {
    const arm  = i % 2;          // 0=A臂, 1=B臂
    const seq  = Math.floor(i / 2);   // 0-14，从内到外
    // 阿基米德螺旋：r = a + b*θ
    const theta = seq * 0.45 + arm * Math.PI;
    const r     = 55 + seq * 20;
    const x     = Math.cos(theta) * r;
    const y     = Math.sin(theta) * r * 0.6;  // 压扁为椭圆
    nodes.push({ x, y, r, seq, arm });
  }
  return nodes;
}
const _SPIRAL = _buildSpiralLayout();

// 节点半径按距中心衰减（近大远小）
function _nodeRadius(seq) {
  return Math.max(14, 30 - seq * 0.95);
}

// 颜色分层（按seq，内→外：绿→蓝→紫→橙→红）
const _TIER_PALETTE = [
  { core: '#a0ffb8', mid: '#28c860', rim: '#083818', glow: '60,220,110'   },  // 0-5
  { core: '#90d4ff', mid: '#1890e8', rim: '#062848', glow: '40,160,255'   },  // 6-11
  { core: '#d0a0ff', mid: '#9030e0', rim: '#280860', glow: '180,80,255'   },  // 12-17
  { core: '#ffd080', mid: '#e08018', rim: '#402808', glow: '255,190,50'   },  // 18-23
  { core: '#ffa0a0', mid: '#d03030', rim: '#400010', glow: '255,90,90'    },  // 24-29
];
function _tierPal(seq) {
  return _TIER_PALETTE[Math.min(4, Math.floor(seq / 6))];
}

// ── Camera ─────────────────────────────────────────────────────
let _camX   = 0;
let _camY   = 0;
let _zoom   = 2.2;
const _ZOOM_MIN = 0.28;
const _ZOOM_MAX = 4.0;

// ── Module state ───────────────────────────────────────────────
let _navigate     = null;
let _rafId        = null;
let _nodeRects    = [];   // { idx, x, y, r } 世界坐标
let _backRect     = null;
let _shopRect     = null;
let _bgStarsNear  = [];   // 近景星点（跟随camera）
let _bgStarsFar   = [];   // 远景星点（视差0.2x）
let _nebulas      = [];   // 大片星云（屏幕空间）
let _particles    = [];   // 轨道粒子场
let _shootingStars= [];   // 流星

// 触摸状态
let _touch1       = null;
let _touch2       = null;
let _lastDist     = 0;
let _isPanning    = false;
let _panStartX    = 0;
let _panStartY    = 0;
let _camStartX    = 0;
let _camStartY    = 0;
let _moved        = false;
let _tapCandidate = null;

// overlay state
let _overlayActive      = false;
let _overlayToggled     = new Set();
let _overlayBtnRects    = [];
let _overlayConfirm     = null;
let _overlaySkip        = null;
let _overlayScrollY     = 0;
let _overlayScrollTarget= 0;
let _overlayTotalRowsH  = 0;
let _overlayRowsClipY   = 0;
let _overlayRowsClipH   = 0;

let _maShanZhengLoaded  = false;
let _startTime          = 0;

// ── Public API ─────────────────────────────────────────────────
export function showLevels(navigate) {
  _navigate  = navigate;
  _cleanup();
  _startTime = performance.now() * 0.001;

  const W = G.SCREEN_W;
  const H = G.SCREEN_H;

  _camX = W / 2;
  _camY = G.SAFE_TOP + 56 + (H - G.SAFE_TOP - 56) * 0.50;
  _zoom = 2.2;

  // 近景星点（世界坐标，密集）
  _bgStarsNear = Array.from({ length: 200 }, () => ({
    wx: (Math.random() - 0.5) * 1800,
    wy: (Math.random() - 0.5) * 1100,
    r:  Math.random() * 1.3 + 0.2,
    a:  Math.random() * 0.55 + 0.15,
    ph: Math.random() * TWO_PI,
    sp: Math.random() * 2.2 + 0.4,
  }));

  // 远景星点（视差0.2x，稀疏大点）
  _bgStarsFar = Array.from({ length: 80 }, () => ({
    wx: (Math.random() - 0.5) * 2400,
    wy: (Math.random() - 0.5) * 1500,
    r:  Math.random() * 2.0 + 0.8,
    a:  Math.random() * 0.3 + 0.05,
    ph: Math.random() * TWO_PI,
    sp: Math.random() * 0.8 + 0.2,
  }));

  // 轨道粒子场（沿螺旋臂散布）
  _particles = Array.from({ length: 120 }, () => {
    const idx     = Math.floor(Math.random() * 30);
    const node    = _SPIRAL[idx];
    const spread  = 30;
    return {
      wx: node.x + (Math.random() - 0.5) * spread,
      wy: node.y + (Math.random() - 0.5) * spread,
      r:  Math.random() * 1.4 + 0.3,
      a:  Math.random() * 0.35 + 0.05,
      ph: Math.random() * TWO_PI,
      sp: Math.random() * 1.6 + 0.5,
      tier: _TIER_PALETTE[Math.min(4, Math.floor(Math.floor(idx / 6) / 1))],
      seq:  Math.floor(idx / 2),
    };
  });

  // 流星
  _shootingStars = Array.from({ length: 5 }, (_, i) => ({
    active:  false,
    delay:   i * 3200 + Math.random() * 4000,
    x: 0, y: 0, vx: 0, vy: 0, len: 0, born: -1,
  }));

  // 节点矩形（世界坐标）
  _nodeRects = _SPIRAL.map((n, idx) => ({
    idx,
    x: n.x,
    y: n.y,
    r: _nodeRadius(n.seq),
  }));

  if (!_maShanZhengLoaded) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.loadFontFace === 'function') {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _maShanZhengLoaded = true; },
          fail:    () => {},
        });
      }
    } catch (e) {}
  }

  G.CANVAS.addEventListener('touchstart',  _onTouchStart, { passive: false });
  G.CANVAS.addEventListener('touchmove',   _onTouchMove,  { passive: false });
  G.CANVAS.addEventListener('touchend',    _onTouchEnd);
  G.CANVAS.addEventListener('touchcancel', _onTouchEnd);

  _rafId = requestAnimationFrame(_loop);
}

export function hideLevels() { _cleanup(); }

function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart',  _onTouchStart);
    G.CANVAS.removeEventListener('touchmove',   _onTouchMove);
    G.CANVAS.removeEventListener('touchend',    _onTouchEnd);
    G.CANVAS.removeEventListener('touchcancel', _onTouchEnd);
  }
  _nodeRects = []; _bgStarsNear = []; _bgStarsFar = [];
  _particles = []; _shootingStars = [];
  _backRect = _shopRect = null;
  _touch1 = _touch2 = null;
  _isPanning = false;
  _overlayActive = false;
  _overlayToggled.clear();
  _overlayBtnRects = [];
  _overlayConfirm = _overlaySkip = null;
  _overlayScrollY = _overlayScrollTarget = 0;
  _overlayTotalRowsH = 0;
}

// ── Main render loop ───────────────────────────────────────────
function _loop(now) {
  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const t   = now * 0.001;

  // ── 1. 深空渐变底色 ─────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0,   '#06081c');
  bg.addColorStop(0.4, '#040612');
  bg.addColorStop(1,   '#02030a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 2. 大片星云光晕（屏幕空间，固定，极慢漂移）─────────────
  _drawScreenNebulas(ctx, W, H, t);

  // ── 3. 流星 ─────────────────────────────────────────────────
  _drawShootingStars(ctx, W, H, t);

  // ── 4. 世界层（带camera transform）──────────────────────────
  ctx.save();
  const padTop = G.SAFE_TOP + 56;
  ctx.beginPath();
  ctx.rect(0, padTop, W, H - padTop);
  ctx.clip();

  // 远景星点（视差：只用camX/Y的20%）
  const farOffX = (_camX - W / 2) * 0.20;
  const farOffY = (_camY - H / 2) * 0.20;
  ctx.save();
  ctx.translate(W / 2 + farOffX, H / 2 + farOffY);
  ctx.scale(_zoom * 0.5, _zoom * 0.5);  // 远景缩放更小（更远）
  for (const s of _bgStarsFar) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#ffe8e0';
    ctx.beginPath();
    ctx.arc(s.wx, s.wy, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 主世界层
  ctx.translate(_camX, _camY);
  ctx.scale(_zoom, _zoom);

  // 近景星点（跟随camera完整）
  for (const s of _bgStarsNear) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp + s.ph));
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = tw > 0.7 ? '#c8e0ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(s.wx, s.wy, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 螺旋臂轮廓（先画，节点压在上）
  _drawSpiralArms(ctx, t);

  // 轨道粒子
  _drawParticles(ctx, t);

  // 中心黑洞/星核
  _drawGalacticCore(ctx, 0, 0, t);

  // 节点（按seq从大到小绘制，内层在上）
  for (let i = 29; i >= 0; i--) {
    const n = _SPIRAL[i];
    _drawNode(ctx, i, n.x, n.y, _nodeRadius(n.seq), t);
  }

  ctx.restore();

  // ── 5. 固定UI ────────────────────────────────────────────────
  _drawHeader(ctx, W, H, t);

  if (_overlayActive) _drawItemOverlay(ctx, W, H);

  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}

// ── 屏幕星云光晕 ─────────────────────────────────────────────
function _drawScreenNebulas(ctx, W, H, t) {
  const defs = [
    { cx: 0.12, cy: 0.35, rx: W * 0.45, ry: H * 0.35, c: '70,40,180',   a: 0.055 },
    { cx: 0.88, cy: 0.65, rx: W * 0.40, ry: H * 0.32, c: '20,120,200',  a: 0.050 },
    { cx: 0.50, cy: 0.90, rx: W * 0.50, ry: H * 0.28, c: '180,40,120',  a: 0.040 },
    { cx: 0.75, cy: 0.20, rx: W * 0.32, ry: H * 0.28, c: '40,180,80',   a: 0.038 },
    { cx: 0.25, cy: 0.78, rx: W * 0.30, ry: H * 0.22, c: '200,100,20',  a: 0.035 },
  ];
  for (let i = 0; i < defs.length; i++) {
    const d  = defs[i];
    const ox = Math.sin(t * 0.035 + i * 1.7) * W * 0.018;
    const oy = Math.cos(t * 0.028 + i * 1.2) * H * 0.018;
    const cx = d.cx * W + ox;
    const cy = d.cy * H + oy;
    ctx.save();
    ctx.scale(1, d.ry / d.rx);
    const g = ctx.createRadialGradient(cx, cy * d.rx / d.ry, 0, cx, cy * d.rx / d.ry, d.rx);
    g.addColorStop(0,   `rgba(${d.c},${d.a})`);
    g.addColorStop(0.55, `rgba(${d.c},${d.a * 0.35})`);
    g.addColorStop(1,   `rgba(${d.c},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy * d.rx / d.ry, d.rx, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

// ── 流星 ────────────────────────────────────────────────────
function _drawShootingStars(ctx, W, H, t) {
  const ms = t * 1000;
  for (const m of _shootingStars) {
    if (m.born < 0) {
      if (ms > m.delay) {
        m.born = t;
        m.x = Math.random() * W * 0.7;
        m.y = Math.random() * H * 0.3 - 30;
        const angle = Math.PI / 6 + Math.random() * Math.PI / 8;
        const spd = Math.random() * 3 + 4;
        m.vx = Math.cos(angle) * spd;
        m.vy = Math.sin(angle) * spd;
        m.len = Math.random() * 100 + 60;
      }
      continue;
    }
    const age   = t - m.born;
    const alpha = age < 0.2 ? age / 0.2 : Math.max(0, 1 - (age - 0.2) / 1.0);
    if (alpha <= 0 || m.x > W + 200 || m.y > H + 100) {
      m.born = -1;
      m.delay = ms + Math.random() * 9000 + 4000;
      continue;
    }
    m.x += m.vx; m.y += m.vy;
    const a = Math.atan2(m.vy, m.vx);
    ctx.save();
    ctx.globalAlpha = alpha * 0.65;
    const tx = m.x - Math.cos(a) * m.len;
    const ty = m.y - Math.sin(a) * m.len;
    const mg = ctx.createLinearGradient(tx, ty, m.x, m.y);
    mg.addColorStop(0,   'rgba(160,190,255,0)');
    mg.addColorStop(0.65, 'rgba(200,220,255,0.55)');
    mg.addColorStop(1,   'rgba(255,255,255,1)');
    ctx.strokeStyle = mg;
    ctx.lineWidth = 1.5;
    ctx.lineCap   = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y);
    ctx.stroke();
    ctx.restore();
  }
}

// ── 螺旋臂曲线（世界空间）─────────────────────────────────
function _drawSpiralArms(ctx, t) {
  // 每条臂：用bezier曲线连接同臂节点
  for (let arm = 0; arm < 2; arm++) {
    const pts = [];
    for (let i = 0; i < 30; i++) {
      if (i % 2 === arm) pts.push(_SPIRAL[i]);
    }
    // 每段绘制渐变曲线
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1];
      const tierIdx = Math.floor(j / 3);
      const pal = _TIER_PALETTE[Math.min(4, tierIdx)];
      const pulse = 0.08 + Math.sin(t * 0.25 + j * 0.5) * 0.025;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;

      // 外辉光
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx * 1.1, my * 0.9, b.x, b.y);
      ctx.strokeStyle = `rgba(${pal.glow},${pulse})`;
      ctx.lineWidth = 5 / _zoom;
      ctx.stroke();
      ctx.restore();

      // 主线
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx * 1.1, my * 0.9, b.x, b.y);
      ctx.strokeStyle = `rgba(${pal.glow},${pulse * 1.6})`;
      ctx.lineWidth = 1.2 / _zoom;
      ctx.setLineDash([6 / _zoom, 10 / _zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

// ── 粒子场 ─────────────────────────────────────────────────
function _drawParticles(ctx, t) {
  for (const p of _particles) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * p.sp + p.ph));
    const tierPal = p.tier;
    ctx.globalAlpha = p.a * tw;
    ctx.fillStyle = `rgba(${tierPal.glow},1)`;
    ctx.beginPath();
    ctx.arc(p.wx, p.wy, p.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── 银河核心（中心点：神秘蓝白奇点）─────────────────────────
function _drawGalacticCore(ctx, cx, cy, t) {
  const pulse = 1 + Math.sin(t * 2.0) * 0.08;
  const cr    = 18 * pulse;

  // 多圈光晕
  const halos = [
    { mul: 8.0, a: 0.03, c: '100,60,255' },
    { mul: 4.5, a: 0.07, c: '60,100,255' },
    { mul: 2.5, a: 0.15, c: '120,90,255' },
    { mul: 1.6, a: 0.30, c: '200,180,255' },
  ];
  for (const h of halos) {
    const g = ctx.createRadialGradient(cx, cy, cr * 0.2, cx, cy, cr * h.mul);
    g.addColorStop(0, `rgba(${h.c},${h.a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, cr * h.mul, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // 十字喷流（旋转）
  ctx.save();
  ctx.rotate(t * 0.35);
  for (let i = 0; i < 4; i++) {
    const a    = (i / 4) * TWO_PI;
    const len  = cr * 4.5;
    const jetG = ctx.createLinearGradient(
      cx + Math.cos(a) * cr, cy + Math.sin(a) * cr,
      cx + Math.cos(a) * len, cy + Math.sin(a) * len
    );
    jetG.addColorStop(0, `rgba(200,180,255,${0.4 + Math.sin(t * 2 + i) * 0.15})`);
    jetG.addColorStop(1, 'rgba(60,30,180,0)');
    ctx.strokeStyle = jetG;
    ctx.lineWidth   = 1.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();

  // 核心本体
  const cg = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.05, cx, cy, cr);
  cg.addColorStop(0,   '#ffffff');
  cg.addColorStop(0.15, '#e0e8ff');
  cg.addColorStop(0.5, '#6040c0');
  cg.addColorStop(1,   '#1a0840');
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, TWO_PI);
  ctx.fillStyle = cg;
  ctx.fill();

  // 边缘光圈
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, cr * (1.15 + k * 0.22), 0, TWO_PI);
    ctx.strokeStyle = `rgba(160,130,255,${0.3 - k * 0.12})`;
    ctx.lineWidth   = 0.8;
    ctx.stroke();
  }
}

// ── 节点绘制（行星质感，带位移动画）────────────────────────
function _drawNode(ctx, idx, x, y, r, t) {
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);
  const seq      = Math.floor(idx / 2);
  const pal      = _tierPal(seq);

  // 轻微浮动动画（正弦）
  const floatY = Math.sin(t * 1.1 + idx * 0.7) * 1.8;
  const fy = y + floatY;

  ctx.save();

  // 外辉光（解锁节点）
  if (unlocked) {
    const glowAlpha = 0.09 + Math.sin(t * 1.5 + idx * 0.6) * 0.035;
    const gg = ctx.createRadialGradient(x, fy, r * 0.3, x, fy, r * 3.8);
    gg.addColorStop(0, `rgba(${pal.glow},${glowAlpha * 2})`);
    gg.addColorStop(0.5, `rgba(${pal.glow},${glowAlpha})`);
    gg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, fy, r * 3.8, 0, TWO_PI);
    ctx.fillStyle = gg;
    ctx.fill();
  }

  ctx.globalAlpha = unlocked ? 1.0 : 0.58;

  // 行星底层
  const bg = ctx.createRadialGradient(x - r * 0.32, fy - r * 0.32, r * 0.04, x + r * 0.08, fy + r * 0.08, r);
  if (unlocked) {
    bg.addColorStop(0,   pal.core);
    bg.addColorStop(0.38, pal.mid);
    bg.addColorStop(0.78, pal.rim);
    bg.addColorStop(1,   '#000000');
  } else {
    bg.addColorStop(0, 'rgba(45,50,85,0.95)');
    bg.addColorStop(1, 'rgba(10,12,30,0.92)');
  }
  ctx.beginPath();
  ctx.arc(x, fy, r, 0, TWO_PI);
  ctx.fillStyle = bg;
  ctx.fill();

  // 高光斑
  if (unlocked) {
    const hi = ctx.createRadialGradient(x - r * 0.30, fy - r * 0.30, 0, x - r * 0.30, fy - r * 0.30, r * 0.65);
    hi.addColorStop(0, 'rgba(255,255,255,0.32)');
    hi.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(x, fy, r, 0, TWO_PI);
    ctx.fillStyle = hi;
    ctx.fill();
  }

  // 边框
  ctx.beginPath();
  ctx.arc(x, fy, r, 0, TWO_PI);
  if (unlocked) {
    const ba = 0.60 + Math.sin(t * 1.3 + idx * 0.55) * 0.22;
    ctx.strokeStyle = `rgba(${pal.glow},${ba})`;
    ctx.lineWidth   = 1.6 / _zoom;
    ctx.shadowColor = `rgba(${pal.glow},0.65)`;
    ctx.shadowBlur  = 5 / _zoom;
  } else {
    ctx.strokeStyle = 'rgba(65,75,130,0.38)';
    ctx.lineWidth   = 0.7 / _zoom;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 内容
  if (!unlocked) {
    ctx.globalAlpha = 0.60;
    ctx.font = `${r * 0.95}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(130,145,195,0.80)';
    ctx.fillText('🔒', x, fy);
  } else {
    // 星座图
    ctx.globalAlpha = 1.0;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, fy, r - 0.8, 0, TWO_PI); ctx.clip();
    _drawMiniConstellation(ctx, c, x, fy, r - 1, 1.0);
    ctx.restore();
  }

  ctx.restore();

  // 标签（下方）
  ctx.save();
  const numStr   = String(idx + 1).padStart(2, '0');
  const fontSize = Math.max(7, r * 0.52);
  ctx.globalAlpha = unlocked ? 0.90 : 0.35;
  ctx.font         = `bold ${fontSize}px sans-serif`;
  ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
  if (unlocked) {
    ctx.fillStyle   = `rgba(${pal.glow},1)`;
    ctx.shadowColor = `rgba(${pal.glow},0.55)`;
    ctx.shadowBlur  = 4;
  } else {
    ctx.fillStyle = 'rgba(75,85,135,0.65)';
  }
  ctx.fillText(numStr, x, fy + r + 4);
  ctx.shadowBlur = 0;

  if (unlocked && score && score.stars > 0) {
    ctx.globalAlpha = 0.88;
    ctx.font         = `${Math.max(6, r * 0.45)}px sans-serif`;
    ctx.fillStyle    = COLORS.starGold;
    ctx.shadowColor  = 'rgba(255,200,0,0.5)';
    ctx.shadowBlur   = 3;
    ctx.fillText('★'.repeat(score.stars), x, fy + r + 4 + fontSize + 2);
    ctx.shadowBlur   = 0;
  }
  ctx.restore();
}

// ── mini星座图 ──────────────────────────────────────────────
function _drawMiniConstellation(ctx, c, cx, cy, r, alpha) {
  const size = r * 1.7;
  const pts  = c.stars.map(s => ({ x: cx + (s.x - 0.5) * size, y: cy + (s.y - 0.5) * size }));
  ctx.save();
  ctx.globalAlpha = alpha * 0.58;
  ctx.strokeStyle = '#b8ccff';
  ctx.lineWidth   = 0.7; ctx.lineCap = 'round';
  for (const [a, b] of c.lines) {
    ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
  }
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle   = '#e0ecff';
  for (let i = 0; i < pts.length; i++) {
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, i === 0 && pts.length > 4 ? 2.2 : 1.3, 0, TWO_PI); ctx.fill();
  }
  ctx.restore();
}

// ── Header ─────────────────────────────────────────────────
function _drawHeader(ctx, W, H, t) {
  // 顶部渐变遮罩
  ctx.save();
  const hg = ctx.createLinearGradient(0, 0, 0, G.SAFE_TOP + 60);
  hg.addColorStop(0, 'rgba(6,8,25,0.95)');
  hg.addColorStop(1, 'rgba(6,8,25,0.0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, G.SAFE_TOP + 60);
  ctx.restore();

  _backRect = drawButton(ctx, G.SAFE_LEFT + 12, G.SAFE_TOP + 10, 88, 38, '← 返回', {
    fontSize: 14, radius: 10,
    color0: 'rgba(50,35,110,0.90)', color1: 'rgba(35,60,150,0.90)',
  });
  _shopRect = drawButton(ctx, W - G.SAFE_RIGHT - 10 - 76, G.SAFE_TOP + 10, 76, 36, '🛒 商店', {
    fontSize: 12, radius: 10,
    color0: 'rgba(50,35,110,0.90)', color1: 'rgba(35,60,150,0.90)',
  });

  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.save();
  ctx.font        = `bold 24px ${titleFont}`;
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(140,110,255,0.85)';
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = '#dcd4ff';
  ctx.fillText('选择关卡', W / 2, G.SAFE_TOP + 30);
  ctx.shadowBlur  = 0;
  ctx.font        = '13px sans-serif';
  ctx.fillStyle   = '#7060cc';
  ctx.fillText('✦', W / 2 - 72, G.SAFE_TOP + 30);
  ctx.fillText('✦', W / 2 + 72, G.SAFE_TOP + 30);
  ctx.restore();

  const el = t - _startTime;
  if (el < 9) {
    const a = Math.min(1, (9 - el) * 0.45) * 0.48;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#7080a8';
    ctx.fillText('双指缩放 · 单指拖动', W / 2, H - G.SAFE_BOTTOM - 6);
    ctx.restore();
  }
}

// ── Item selection overlay ─────────────────────────────────────
function _drawItemOverlay(ctx, W, H) {
  _overlayScrollY += (_overlayScrollTarget - _overlayScrollY) * 0.22;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H); ctx.restore();

  const ownedItems = ITEMS.filter(it => state.getItemQty(it.id) > 0);
  const cardW = Math.min(W - 40, 340);
  const rowH  = 60;
  const HEADER_H = 70, FOOTER_H = 64;
  const naturalH  = HEADER_H + ownedItems.length * rowH + FOOTER_H;
  const maxCardH  = H - G.SAFE_TOP - G.SAFE_BOTTOM - 16;
  const cardH     = Math.min(naturalH, maxCardH);
  const cardX     = (W - cardW) / 2;
  const cardY     = Math.max(G.SAFE_TOP + 8, (H - cardH) / 2);

  ctx.save();
  ctx.fillStyle = 'rgba(12,16,48,0.97)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(140,110,255,0.40)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text; ctx.shadowColor = 'rgba(140,110,255,0.6)'; ctx.shadowBlur = 8;
  ctx.fillText('选择使用道具', W / 2, cardY + 30); ctx.restore();
  ctx.save();
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text2;
  ctx.fillText('本关结束后自动消耗，可多选', W / 2, cardY + 54); ctx.restore();

  const rowsAreaTop = cardY + HEADER_H;
  const rowsAreaH   = cardH - HEADER_H - FOOTER_H;
  _overlayTotalRowsH = ownedItems.length * rowH;
  _overlayRowsClipY  = rowsAreaTop; _overlayRowsClipH = rowsAreaH;
  const maxScroll    = Math.max(0, _overlayTotalRowsH - rowsAreaH);
  _overlayScrollTarget = Math.max(0, Math.min(maxScroll, _overlayScrollTarget));

  _overlayBtnRects = [];
  ctx.save();
  ctx.beginPath(); ctx.rect(cardX, rowsAreaTop, cardW, rowsAreaH); ctx.clip();
  ctx.translate(0, -_overlayScrollY);
  ownedItems.forEach((it, i) => {
    const rowY = rowsAreaTop + i * rowH;
    const tog  = _overlayToggled.has(it.id);
    const qty  = state.getItemQty(it.id);
    ctx.save();
    ctx.fillStyle = tog ? 'rgba(60,180,100,0.18)' : 'rgba(255,255,255,0.04)';
    _roundRect(ctx, cardX + 10, rowY, cardW - 20, rowH - 5, 8); ctx.fill();
    if (tog) { ctx.strokeStyle = 'rgba(60,220,100,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.font = '24px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cardX + 14, rowY + rowH * 0.5 - 3); ctx.restore();
    ctx.save(); ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text; ctx.fillText(it.nameZh + '  ×' + qty, cardX + 48, rowY + 8); ctx.restore();
    ctx.save(); ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text2; ctx.fillText(it.desc, cardX + 48, rowY + 28); ctx.restore();
    const btnW = 62, btnH = 32;
    const btnX = cardX + cardW - 18 - btnW;
    const btnY = rowY + (rowH - 5 - btnH) / 2;
    const btn  = drawButton(ctx, btnX, btnY, btnW, btnH, tog ? '✓ 已选' : '使用', {
      fontSize: 12, radius: 8,
      color0: tog ? 'rgba(30,140,70,0.9)' : 'rgba(80,60,160,0.85)',
      color1: tog ? 'rgba(20,180,80,0.9)' : 'rgba(60,90,200,0.85)',
    });
    _overlayBtnRects.push({ id: it.id, rect: btn });
  });
  ctx.restore();

  const btnY2 = cardY + cardH - 54;
  const btnW2 = (cardW - 36) / 2;
  _overlaySkip    = drawButton(ctx, cardX + 10,                 btnY2, btnW2, 44, '跳过', {
    fontSize: 15, radius: 10, color0: 'rgba(60,60,100,0.80)', color1: 'rgba(80,80,140,0.80)',
  });
  _overlayConfirm = drawButton(ctx, cardX + cardW - 10 - btnW2, btnY2, btnW2, 44, '确定出发 →', {
    fontSize: 15, radius: 10, color0: 'rgba(30,130,60,0.90)', color1: 'rgba(20,180,80,0.90)',
  });
}

// ── Touch ──────────────────────────────────────────────────
function _screenToWorld(sx, sy) {
  return { wx: (sx - _camX) / _zoom, wy: (sy - _camY) / _zoom };
}

function _zoomAround(mx, my, scale) {
  const nz = Math.max(_ZOOM_MIN, Math.min(_ZOOM_MAX, _zoom * scale));
  const dz = nz / _zoom;
  _camX = mx + (_camX - mx) * dz;
  _camY = my + (_camY - my) * dz;
  _zoom = nz;
}

function _onTouchStart(e) {
  e.preventDefault();
  const T = e.touches;
  if (T.length === 1) {
    _touch1 = { id: T[0].identifier, x: T[0].clientX, y: T[0].clientY };
    _touch2 = null; _isPanning = true;
    _panStartX = T[0].clientX; _panStartY = T[0].clientY;
    _camStartX = _camX; _camStartY = _camY;
    _moved = false;
    _tapCandidate = { x: T[0].clientX, y: T[0].clientY, time: Date.now() };
  } else if (T.length === 2) {
    _touch1 = { id: T[0].identifier, x: T[0].clientX, y: T[0].clientY };
    _touch2 = { id: T[1].identifier, x: T[1].clientX, y: T[1].clientY };
    _lastDist = Math.hypot(T[1].clientX - T[0].clientX, T[1].clientY - T[0].clientY);
    _isPanning = false; _moved = true; _tapCandidate = null;
  }
}

function _onTouchMove(e) {
  e.preventDefault();
  const T = e.touches;
  if (_overlayActive) {
    if (T.length === 1) {
      const dy = T[0].clientY - (_touch1 ? _touch1.y : T[0].clientY);
      const mx = Math.max(0, _overlayTotalRowsH - _overlayRowsClipH);
      _overlayScrollTarget = Math.max(0, Math.min(mx, _overlayScrollTarget - dy));
      if (_touch1) _touch1.y = T[0].clientY;
    }
    return;
  }
  if (T.length === 2) {
    const nd = Math.hypot(T[1].clientX - T[0].clientX, T[1].clientY - T[0].clientY);
    if (_lastDist > 0) {
      const mx = (T[0].clientX + T[1].clientX) / 2;
      const my = (T[0].clientY + T[1].clientY) / 2;
      _zoomAround(mx, my, nd / _lastDist);
    }
    _lastDist = nd;
    const cx = (T[0].clientX + T[1].clientX) / 2;
    const cy = (T[0].clientY + T[1].clientY) / 2;
    if (_touch1 && _touch2) {
      _camX += cx - (_touch1.x + _touch2.x) / 2;
      _camY += cy - (_touch1.y + _touch2.y) / 2;
    }
    _touch1 = { id: T[0].identifier, x: T[0].clientX, y: T[0].clientY };
    _touch2 = { id: T[1].identifier, x: T[1].clientX, y: T[1].clientY };
  } else if (T.length === 1 && _isPanning) {
    const dx = T[0].clientX - _panStartX;
    const dy = T[0].clientY - _panStartY;
    _camX = _camStartX + dx; _camY = _camStartY + dy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _moved = true;
  }
}

function _onTouchEnd(e) {
  const T = e.touches;
  if (T.length < 2) { _touch2 = null; _lastDist = 0; }
  if (T.length === 0) { _touch1 = null; _isPanning = false; }
  if (_moved) { _moved = false; return; }

  const ct = e.changedTouches[0];
  if (!ct) return;
  const tx = ct.clientX, ty = ct.clientY;

  if (_overlayActive) {
    const sy = ty + _overlayScrollY;
    for (const { id, rect } of _overlayBtnRects) {
      if (hitTest(rect, tx, sy)) {
        if (_overlayToggled.has(id)) _overlayToggled.delete(id); else _overlayToggled.add(id);
        return;
      }
    }
    if (_overlaySkip && hitTest(_overlaySkip, tx, ty)) {
      state.selectedItems = []; _overlayActive = false; _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game'); return;
    }
    if (_overlayConfirm && hitTest(_overlayConfirm, tx, ty)) {
      state.selectedItems = [..._overlayToggled]; _overlayActive = false; _overlayScrollY = _overlayScrollTarget = 0;
      if (_navigate) _navigate('game'); return;
    }
    _overlayActive = false; _overlayScrollY = _overlayScrollTarget = 0; return;
  }

  if (_backRect && hitTest(_backRect, tx, ty)) { if (_navigate) _navigate('menu'); return; }
  if (_shopRect && hitTest(_shopRect, tx, ty)) { if (_navigate) _navigate('shop'); return; }

  // 节点 hit test（世界坐标）
  const { wx: twx, wy: twy } = _screenToWorld(tx, ty);
  for (const node of _nodeRects) {
    if (Math.hypot(twx - node.x, twy - (node.y + Math.sin(performance.now() * 0.001 * 1.1 + node.idx * 0.7) * 1.8)) <= node.r + 8 / _zoom) {
      if (!state.isUnlocked(node.idx)) return;
      state.currentLevel = node.idx;
      const hasItems = ITEMS.some(it => state.getItemQty(it.id) > 0);
      if (hasItems) {
        _overlayActive = true; _overlayToggled.clear(); _overlayBtnRects = [];
        _overlayScrollY = _overlayScrollTarget = 0; return;
      }
      state.selectedItems = [];
      if (_navigate) _navigate('game'); return;
    }
  }
}

// ── Helper ─────────────────────────────────────────────────────
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
