// gallery.js — Canvas 星座图鉴（微信小游戏版）
// STORY-00350: 星系节点图鉴 — 六边形蜂巢布局，底部抽屉详情，与选关界面视觉统一

import { G, onTouch, offTouch } from '../engine/globals.js';
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
  { xr: -0.26, yr: -0.30 },  // 0: 左上
  { xr:  0.26, yr: -0.30 },  // 1: 右上
  { xr: -0.40, yr:  0.00 },  // 2: 左中
  { xr:  0.00, yr:  0.00 },  // 3: 中心
  { xr:  0.40, yr:  0.00 },  // 4: 右中
  { xr:  0.00, yr:  0.32 },  // 5: 下中
];

// 节点间装饰连线（蜂巢风格）
const _HEX_EDGES = [[0,1],[0,2],[0,3],[1,3],[1,4],[2,3],[3,4],[3,5],[2,5],[4,5]];

const _NODE_R = 36;

// 星名中文对照表（Latin → 中文）
const _STAR_ZH = {
  // 大熊座
  'Dubhe': '天枢', 'Merak': '天璇', 'Phecda': '天玑', 'Megrez': '天权',
  'Alioth': '玉衡', 'Mizar': '开阳', 'Alkaid': '摇光',
  // 天蝎座
  'Graffias': '房宿三', 'Dschubba': '房宿一', 'Jabbah': '房宿四',
  'Fang': '房宿二', 'Alniyat': '心宿一', 'Tau Sco': '尾宿一',
  'Epsilon': '尾宿二', 'Mu Sco': '尾宿三', 'Shaula': '尾宿八',
  'Lesath': '尾宿九', 'Alniyat2': '心宿三',
  // 狮子座
  'Eta Leo': '轩辕十', 'Mu Leo': '轩辕九', 'Zeta Leo': '轩辕八',
  'Gamma Leo': '轩辕十二', 'Delta Leo': '太微左垣五', 'Beta Leo': '五帝座一',
  'Theta Leo': '轩辕十一',
  // 白羊座
  'Hamal': '娄宿三', 'Sheratan': '娄宿一', 'Mesarthim': '娄宿二', 'Bharani': '胃宿一',
  // 金牛座
  'Elnath': '五车五', 'Zeta Tau': '天关', 'Lambda': '毕宿一',
  'Alcyone': '昂宿六', 'Atlas': '昂宿七',
  // 双子座
  'Alhena': '井宿三', 'Mebsuda': '井宿五', 'Propus': '井宿四',
  'Kappa': '积薪', 'Tejat': '井宿一', 'Wasat': '井宿四',
  // 巨蟹座
  'Acubens': '柳宿增十三', 'Tarf': '鬼宿四', 'Asellus B': '鬼宿三',
  'Asellus A': '鬼宿二', 'Iota': '鬼宿一',
  // 室女座
  'Porrima': '太微左垣一', 'Auva': '角宿外屏', 'Vindemiatrix': '角宿二',
  'Zaniah': '左执法', 'Syrma': '亢宿四', 'Mu Vir': '亢宿三',
  'Heze': '亢宿二', 'Theta': '亢宿一', 'Iota Vir': '亢宿外',
  // 天秤座
  'Zuben Elgenubi': '氐宿一', 'Zuben Elschemali': '氐宿四',
  'Brachium': '氐宿三', 'Gamma': '氐宿二', 'Upsilon': '氐宿增',
  // 射手座
  'Kaus A': '箕宿三', 'Kaus M': '箕宿二', 'Kaus B': '箕宿一',
  'Phi Sgr': '斗宿四', 'Sigma': '斗宿三', 'Tau Sgr': '斗宿二',
  'Lambda': '斗宿六', 'Delta': '斗宿一',
  // 摩羯座
  'Algedi': '牛宿一', 'Dabih': '牛宿二', 'Nashira': '垒壁阵四',
  'Deneb A': '垒壁阵五', 'Zeta': '垒壁阵三',
  // 水瓶座
  'Sadalsuud': '虚宿一', 'Sadalmelik': '危宿一', 'Sadachbia': '女宿三',
  'Albali': '女宿一', 'Ancha': '女宿四', 'Skat': '羽林军一',
  'EE Aqr': '羽林军二',
  // 双鱼座
  'Alrescha': '外屏七', 'Fumalsamakah': '外屏一', 'Eta': '外屏二',
  'Omega': '外屏三',
  // 仙后座
  'Schedar': '王良四', 'Caph': '王良一', 'Ruchbah': '策',
  'Segin': '阁道二',
  // 英仙座
  'Mirfak': '天船三', 'Algol': '大陵五', 'Atik': '卷舌三',
  'Nu Per': '天船二', 'Xi Per': '天船一',
  // 天鹰座
  'Tarazed': '河鼓三', 'Alshain': '河鼓一', 'Delta Aql': '天桴二',
  'Zeta Aql': '天桴一',
  // 天鹅座
  'Sadr': '天津九', 'Albireo': '辇道增七', 'Delta Cyg': '天津一',
  'Epsilon': '天津二', 'Zeta Cyg': '天津三',
  // 天琴座
  'Sulafat': '渐台三', 'Sheliak': '渐台二', 'Delta Lyr': '织女增三',
  'Zeta Lyr': '织女增一',
  // 南十字座
  'Acrux': '十字架二', 'Gacrux': '十字架一', 'Mimosa': '十字架三',
  'Delta C': '十字架四',
  // 小熊座
  'Kochab': '北极二', 'Pherkad': '北极一',
  // 牧夫座
  'Nekkar': '招摇', 'Seginus': '梗河一', 'Izar': '梗河二',
  'Eta Boo': '玄戈一', 'Rho Boo': '梗河三',
  // 御夫座
  'Menkib': '天廪四', 'Hassaleh': '天廪三', 'Alnath': '五车五',
  'Sadatoni': '柱一', 'Hoedus II': '柱二',
  // 飞马座
  'Markab': '室宿一', 'Scheat': '室宿二', 'Algenib': '壁宿一',
  'Alpheratz': '壁宿二', 'Enif': '危宿三', 'Homam': '离宫六',
  // 海豚座
  'Sualocin': '瓠瓜一', 'Rotanev': '瓠瓜二',
  // 天龙座
  'Grumium': '天棓三', 'Thuban': '右枢', 'Edasich': '天棓四',
  'Eta Dra': '天棓一', 'Zeta Dra': '天棓五', 'Gamma Dra': '天棓二',
  'Delta Dra': '紫微右垣', 'Deneb Dra': '天棓增',
  // 蛇夫座
  'Cebalrai': '候', 'Sabik': '斗宿二', 'Zeta Oph': '列肆三',
  'Yed Prior': '天江一', 'Yed Post': '天江二',
  // 半人马座
  'Muhlifain': '库楼七', 'Menkent': '库楼六', 'Eta Cen': '库楼二',
  'Zeta Cen': '库楼三', 'Nu Cen': '库楼一',
  // 猎犬座
  'Chara': '常陈三', 'La Superba': '常陈增',
};

// 获取星星中文名（优先使用数据中的中文名，次用查找表）
function _starZhName(name) {
  if (!name) return '';
  // 已是中文
  if (/[\u4e00-\u9fa5]/.test(name)) return name;
  return _STAR_ZH[name] || name;
}

// 背景星云
const _NEBULAE = [
  { xr: 0.18, yr: 0.32, rx: 130, ry: 80,  col: '100,70,255',  a: 0.07 },
  { xr: 0.80, yr: 0.60, rx: 110, ry: 68,  col: '40,180,200',  a: 0.06 },
  { xr: 0.50, yr: 0.90, rx: 140, ry: 82,  col: '200,80,150',  a: 0.05 },
];

// ── 模块状态 ──────────────────────────────────────────────────
let _navigate     = null;
let _galleryFrom  = 'menu';  // tracks caller screen for back navigation
let _rafId        = null;
let _currentGroup = 0;
let _pendingGroup = 0;    // spring lerp 目标组
let _pendingNodes = null; // 目标组预计算节点（动画中双屏渲染）
let _slideX        = 0;   // spring lerp 当前偏移
let _slideTargetX  = 0;   // spring lerp 目标偏移
let _nodeRects    = [];   // [{cx, cy, r, idx}]
let _bgStars      = [];
let _backRect     = null;
let _isDragging   = false;
let _touchStartX  = 0;
let _touchStartY  = 0;

// 全屏详情页
let _detail         = null;  // null | { idx, alpha, scrollY, scrollTarget }
let _detailRects    = {};    // 详情页内按钮区域
let _detailLastTY   = 0;
let _detailDragging = false;
let _detailTotalH   = 0;

// 星图星名点击
let _detailTappedStar = null; // { idx, until } — tapped star index + expire ms
let _detailMappedStars = [];  // mapped star positions for hit-test

// 照片全屏缩放
let _zoom = null; // null | { img, alpha, targetAlpha, scale, targetScale }
let _zoomRect = null; // hit area for photo tap

// 照片轮播
let _carouselPos   = 0;
let _carouselForIdx = -1;
let _carouselImgs  = [];
let _carouselPrevRect = null;
let _carouselNextRect = null;

// 字体
let _msz = false;

// ── Public API ────────────────────────────────────────────────
export function showGallery(navigate, opts = {}) {
  _navigate = navigate;
  _galleryFrom = opts.from || 'menu';
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

  onTouch('start', _onTouchStart);
  onTouch('move',  _onTouchMove);
  onTouch('end',   _onTouchEnd);
  _rafId = requestAnimationFrame(_loop);
}

export function hideGallery() { _cleanup(); }

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (G.CANVAS) {
    offTouch('start', _onTouchStart);
    offTouch('move',  _onTouchMove);
    offTouch('end',   _onTouchEnd);
  }
  _nodeRects   = [];
  _bgStars     = [];
  _backRect    = null;
  _detail      = null;
  _detailRects = {};
  _carouselPos = 0;
  _carouselForIdx = -1;
  _carouselImgs = [];
  _carouselPrevRect = null;
  _carouselNextRect = null;
  _isDragging  = false;
  _slideX        = 0;
  _slideTargetX  = 0;
  _pendingGroup  = 0;
  _pendingNodes  = null;
  _currentGroup  = 0;
}

function _computeLayout() {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;

  // 节点区：标题下到底部组指示器上方（指示器只占26px，节点可用空间更大）
  const areaTop    = G.SAFE_TOP + 72;
  const areaBottom = H - G.SAFE_BOTTOM - 26;
  const areaCX     = W / 2;
  const areaCY     = (areaTop + areaBottom) / 2;
  const areaW      = W - (G.SAFE_LEFT || 0) - (G.SAFE_RIGHT || 0) - 180;  // align to header btn edges
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

  // ── Spring lerp 切换动画（与关卡界面完全一致） ─────────────
  _slideX += (_slideTargetX - _slideX) * 0.18;
  if (!_isDragging && Math.abs(_slideX - _slideTargetX) < 0.5) {
    if (_pendingGroup !== _currentGroup) {
      _currentGroup = _pendingGroup;
      if (_pendingNodes) { _nodeRects = _pendingNodes; _pendingNodes = null; }
    }
    _slideX = 0; _slideTargetX = 0;
  }
  // 详情页动画
  if (_detail) {
    _detail.alpha = Math.min(1, _detail.alpha + 0.07);
    _detail.scrollY += (_detail.scrollTarget - _detail.scrollY) * 0.20;
  }
  // 全屏缩放动画
  if (_zoom) {
    _zoom.alpha += (_zoom.targetAlpha - _zoom.alpha) * 0.12;
    _zoom.scale += (_zoom.targetScale - _zoom.scale) * 0.14;
    if (_zoom.targetAlpha === 0 && _zoom.alpha < 0.02) _zoom = null;
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
  _backRect = _drawBackBtnG(ctx, G.SAFE_LEFT + 90, G.SAFE_TOP + 10, 80, 32, '← 返回');

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

  // 已发现计数 — 方案G金色风格
  const discovered = CONSTELLATIONS.filter((_, i) => state.isUnlocked(i)).length;
  {
    const btnY = G.SAFE_TOP + 10;
    const btnH = 32;
    const rx   = W - (G.SAFE_RIGHT || 0) - 90;
    const rw   = 80;
    const lx   = rx - rw;
    const cy   = btnY + btnH / 2;
    const lineY = btnY + btnH - 1;
    ctx.save();
    const tg = ctx.createLinearGradient(lx, cy, rx, cy);
    tg.addColorStop(0, 'rgba(255,220,80,0.95)');
    tg.addColorStop(1, 'rgba(255,160,60,0.85)');
    ctx.font         = 'bold 12px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = tg;
    ctx.shadowColor  = 'rgba(255,180,60,0.5)';
    ctx.shadowBlur   = 5;
    ctx.fillText(`${discovered}/${CONSTELLATIONS.length} 已解锁`, rx, cy - 1);
    ctx.shadowBlur   = 0;
    const lg = ctx.createLinearGradient(lx, 0, rx, 0);
    lg.addColorStop(0,   'rgba(255,200,60,0.0)');
    lg.addColorStop(0.3, 'rgba(255,160,40,0.7)');
    lg.addColorStop(1,   'rgba(255,220,80,0.2)');
    ctx.strokeStyle = lg;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(lx, lineY);
    ctx.lineTo(rx, lineY);
    ctx.stroke();
    ctx.restore();
  }

  // ── 星系名（crossfade，无箭头按钮） ──────────────────────────
  const group  = _GROUPS[_currentGroup];
  const penGroup = _GROUPS[_pendingGroup];
  const groupY = G.SAFE_TOP + 58;

  const nameAlpha    = Math.max(0, 1 - Math.abs(_slideX) / (G.SCREEN_W * 0.35));
  const pendingAlpha = Math.min(1, Math.abs(_slideX) / (G.SCREEN_W * 0.35));
  if (nameAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = nameAlpha;
    ctx.font = `bold 15px ${titleFont}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = group.color;
    ctx.shadowColor = group.glow + '0.6)'; ctx.shadowBlur = 8;
    ctx.fillText(group.name, W / 2, groupY);
    ctx.restore();
  }
  if (pendingAlpha > 0.01 && _pendingGroup !== _currentGroup) {
    ctx.save();
    ctx.globalAlpha = pendingAlpha;
    ctx.font = `bold 15px ${titleFont}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = penGroup.color;
    ctx.shadowColor = penGroup.glow + '0.6)'; ctx.shadowBlur = 8;
    ctx.fillText(penGroup.name, W / 2, groupY);
    ctx.restore();
  }

  // ── 节点区（clip + spring 双屏渲染） ─────────────────────
  const padTop    = G.SAFE_TOP + 72;
  const padBottom = H - G.SAFE_BOTTOM - 26;  // 指示器只占 26px，节点不被遮挡
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, W, padBottom - padTop);
  ctx.clip();

  // 当前组节点（随拖动偏移）
  const slideRatio = Math.min(1, Math.abs(_slideX) / W);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - slideRatio * 0.5);
  ctx.translate(_slideX, 0);
  _drawHexEdges(ctx, t, _nodeRects, _currentGroup);
  for (const node of _nodeRects) { _drawNode(ctx, node, t, _currentGroup); }
  ctx.restore();

  // 目标组节点（从对侧滑入）
  if (_pendingNodes && _pendingGroup !== _currentGroup && Math.abs(_slideX) > 2) {
    const pdir = _pendingGroup > _currentGroup ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, slideRatio * 1.2);
    ctx.translate(_slideX + pdir * -W, 0);
    _drawHexEdges(ctx, t, _pendingNodes, _pendingGroup);
    for (const node of _pendingNodes) { _drawNode(ctx, node, t, _pendingGroup); }
    ctx.restore();
  }

  ctx.restore();

  // ── 组指示器 ─────────────────────────────────────────────
  _drawGroupIndicator(ctx, W, H);

  // ── 全屏详情页 ────────────────────────────────────────────
  if (_detail) {
    _drawDetail(ctx, W, H, t);
  }

  // ── 图片全屏缩放遮层（最顶层） ─────────────────────────────
  if (_zoom) {
    _drawZoomOverlay(ctx, W, H);
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
    ctx.translate(nx, ny);
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
    g.addColorStop(0, `rgba(${n.col},${n.a})`);
    g.addColorStop(0.5, `rgba(${n.col},${n.a * 0.5})`);
    g.addColorStop(1, `rgba(${n.col},0)`);
    ctx.beginPath();
    ctx.arc(0, 0, n.rx, 0, TWO_PI);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

// ── 蜂巢连线 ──────────────────────────────────────────────────
function _drawHexEdges(ctx, t, nodes, groupIdx) {
  const group = _GROUPS[groupIdx];
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.lineDashOffset = -(t * 5) % 9;
  ctx.lineWidth = 0.7;
  for (const [a, b] of _HEX_EDGES) {
    const na = nodes[a];
    const nb = nodes[b];
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
function _drawNode(ctx, node, t, groupIdx) {
  const { cx, cy, r, idx, slot } = node;
  const c        = CONSTELLATIONS[idx];
  const unlocked = state.isUnlocked(idx);
  const score    = state.getScore(idx);
  const explored = score && score.stars > 0;  // 曾经通关（即"探索过"）
  const isActive = _detail && _detail.idx === idx;  // 当前选中
  const group    = _GROUPS[groupIdx];

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
      const size = (r - 3) * 0.62;
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

  // 提示文字（替代星座名，点击引导）
  ctx.font = `10px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = unlocked ? 'rgba(180,180,220,0.60)' : 'rgba(70,75,120,0.4)';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.fillText(unlocked ? '点击查看名称' : '未解锁', cx, cy + r + 5);

  ctx.restore();

  // ── 脉冲外环（当前选中） ──────────────────────────────────
  if (isActive && _detail) {
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
  const dotR  = 4;
  const gap   = 14;
  const totalW = n * dotR * 2 + (n - 1) * (gap - dotR * 2);
  const startX = (W - totalW) / 2 + dotR;
  const dotY   = H - G.SAFE_BOTTOM - 10;

  for (let i = 0; i < n; i++) {
    const dx     = startX + i * gap;
    const active = i === _currentGroup;
    const done   = _GROUPS[i].levels.every(idx => state.isUnlocked(idx));

    ctx.save();
    if (active) { ctx.shadowColor = _GROUPS[i].color; ctx.shadowBlur = 8; }
    ctx.globalAlpha = active ? 1.0 : 0.45;
    ctx.beginPath();
    ctx.arc(dx, dotY, active ? dotR + 1 : dotR, 0, TWO_PI);
    ctx.fillStyle = _GROUPS[i].color;
    ctx.fill();
    if (done && !active) {
      ctx.globalAlpha = 0.7;
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#05081c';
      ctx.fillText('✓', dx, dotY);
    }
    ctx.restore();
  }
}

// ── 全屏详情页 ────────────────────────────────────────────────
// 全屏淡入，横屏左右分栏：左40%星图+名称，右60%图片+描述
function _drawDetail(ctx, W, H, t) {
  if (!_detail) return;
  const c      = CONSTELLATIONS[_detail.idx];
  const grpIdx = _GROUPS.findIndex(g => g.levels.includes(_detail.idx));
  const grp    = _GROUPS[Math.max(0, grpIdx)];
  const alpha  = _easeOut(_detail.alpha);

  const titleFont = _msz ? "'Ma Shan Zheng', serif" : 'serif';

  // ── 全屏背景（淡入） ─────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(5,7,24,0.98)';
  ctx.fillRect(0, 0, W, H);
  // 背景星云（轻量版）
  for (const n of _NEBULAE) {
    const nx = n.xr * W;
    const ny = n.yr * H;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.scale(1, n.ry / n.rx);
    const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
    ng.addColorStop(0, `rgba(${n.col},${n.a * 0.7})`);
    ng.addColorStop(1, `rgba(${n.col},0)`);
    ctx.beginPath();
    ctx.arc(0, 0, n.rx, 0, TWO_PI);
    ctx.fillStyle = ng;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ── Header ───────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = alpha;

  // 返回按钮
  _detailRects.back = _drawBackBtnG(ctx, G.SAFE_LEFT + 90, G.SAFE_TOP + 8, 88, 28, '← 返回图鉴');

  // 星座名（header中央）
  ctx.font = `bold 24px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grp.color;
  ctx.shadowColor = grp.color;
  ctx.shadowBlur  = 10;
  ctx.fillText(c.nameZh, W / 2, G.SAFE_TOP + 22);
  ctx.shadowBlur = 0;

  // 左右切换星座：置于标题左侧，完全避开右上角微信胶囊
  const _CBTN_R  = 15;
  const _CBTN_CY = G.SAFE_TOP + 22;
  // 放在左侧：返回按钮右侧（返回按钮宽88，左起 SAFE_LEFT+90+88=SAFE_LEFT+178）
  const _prevCX  = (G.SAFE_LEFT || 0) + 196;
  const _nextCX  = (G.SAFE_LEFT || 0) + 196 + _CBTN_R * 2 + 8;
  const _prevActive = _detail.idx > 0;
  const _nextActive = _detail.idx < CONSTELLATIONS.length - 1;

  // prev circle
  ctx.save();
  ctx.shadowColor = _prevActive ? grp.color : 'transparent';
  ctx.shadowBlur  = _prevActive ? 8 : 0;
  ctx.globalAlpha = alpha * (_prevActive ? 0.85 : 0.25);
  ctx.beginPath(); ctx.arc(_prevCX, _CBTN_CY, _CBTN_R, 0, TWO_PI);
  ctx.fillStyle = 'rgba(20,15,55,0.72)';
  ctx.fill();
  ctx.strokeStyle = _prevActive ? grp.color : 'rgba(120,130,200,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = _prevActive ? grp.color : 'rgba(150,155,200,0.4)';
  ctx.fillText('◀', _prevCX, _CBTN_CY + 1);
  ctx.restore();
  _detailRects.prevCon = { x: _prevCX - _CBTN_R, y: _CBTN_CY - _CBTN_R, w: _CBTN_R * 2, h: _CBTN_R * 2 };

  // next circle
  ctx.save();
  ctx.shadowColor = _nextActive ? grp.color : 'transparent';
  ctx.shadowBlur  = _nextActive ? 8 : 0;
  ctx.globalAlpha = alpha * (_nextActive ? 0.85 : 0.25);
  ctx.beginPath(); ctx.arc(_nextCX, _CBTN_CY, _CBTN_R, 0, TWO_PI);
  ctx.fillStyle = 'rgba(20,15,55,0.72)';
  ctx.fill();
  ctx.strokeStyle = _nextActive ? grp.color : 'rgba(120,130,200,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = _nextActive ? grp.color : 'rgba(150,155,200,0.4)';
  ctx.fillText('▶', _nextCX, _CBTN_CY + 1);
  ctx.restore();
  _detailRects.nextCon = { x: _nextCX - _CBTN_R, y: _CBTN_CY - _CBTN_R, w: _CBTN_R * 2, h: _CBTN_R * 2 };

  ctx.restore();

  // ── 分栏布局 ─────────────────────────────────────────────
  const HEADER_H  = G.SAFE_TOP + 46;
  const FOOTER_H  = G.SAFE_BOTTOM + 4;
  const BODY_TOP  = HEADER_H;
  const BODY_H    = H - HEADER_H - FOOTER_H;

  // 分割线
  const SPLIT_X = Math.round(W * 0.40);

  // ── 左侧40%：星图 ─────────────────────────────────────────
  const LEFT_W   = SPLIT_X;
  const LEFT_CX  = LEFT_W / 2;
  const LEFT_CY  = BODY_TOP + BODY_H / 2;
  const CHART_R  = Math.min(LEFT_W * 0.46, BODY_H * 0.44, 110);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(0, BODY_TOP, LEFT_W, BODY_H);
  ctx.clip();

  // 星图圆形背景
  const bgG = ctx.createRadialGradient(LEFT_CX, LEFT_CY, 0, LEFT_CX, LEFT_CY, CHART_R);
  bgG.addColorStop(0, 'rgba(18,24,62,0.96)');
  bgG.addColorStop(0.7, 'rgba(10,14,40,0.92)');
  bgG.addColorStop(1, 'rgba(5,7,24,0.80)');
  ctx.beginPath();
  ctx.arc(LEFT_CX, LEFT_CY, CHART_R, 0, TWO_PI);
  ctx.fillStyle = bgG;
  ctx.fill();
  ctx.strokeStyle = grp.color + '55';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (c.stars && c.stars.length > 0) {
    const PAD  = CHART_R * 0.26;
    // 自动居中：计算所有星的包围盒，缩放后使星群居中于圆心
    const xs   = c.stars.map(s => s.x);
    const ys   = c.stars.map(s => s.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const span = Math.max(xMax - xMin, yMax - yMin, 0.001);
    const cScale = (CHART_R - PAD) * 1.8 / span;
    const xMid = (xMin + xMax) / 2;
    const yMid = (yMin + yMax) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(LEFT_CX, LEFT_CY, CHART_R - 2, 0, TWO_PI);
    ctx.clip();

    const mapped = c.stars.map(s => ({
      x: LEFT_CX + (s.x - xMid) * cScale,
      y: LEFT_CY + (s.y - yMid) * cScale,
      r: Math.min(magToRadius(s.mag) * 1.5, 6),
      color: typeToColor(s.type),
      name: s.name,
    }));

    _detailMappedStars = mapped; // store for tap detection

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
      const grd2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
      grd2.addColorStop(0, s.color);
      grd2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = grd2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.2, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }

    // 点击显示星名tooltip
    if (_detailTappedStar !== null) {
      if (Date.now() > _detailTappedStar.until) {
        _detailTappedStar = null;
      } else {
        const si = _detailTappedStar.idx;
        const s  = mapped[si];
        const nm = s && _starZhName(c.stars[si].name);
        if (s && nm) {
          const TW = Math.max(50, ctx.measureText(nm).width + 16);
          const TH = 18;
          let lx = s.x + 6;
          let ly = s.y - TH / 2 - 4;
          if (lx + TW > SPLIT_X - 2) lx = s.x - TW - 6;
          if (ly < BODY_TOP + 2) ly = s.y + 6;
          ctx.save();
          ctx.font = '11px sans-serif';
          ctx.fillStyle = 'rgba(20,16,55,0.88)';
          _roundRect(ctx, lx, ly, TW, TH, 6);
          ctx.fill();
          ctx.strokeStyle = grp.color + '88';
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = grp.color;
          ctx.fillText(nm, lx + TW / 2, ly + TH / 2);
          // 连接线
          ctx.strokeStyle = grp.color + '66';
          ctx.lineWidth = 0.6;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(lx + TW / 2, ly + TH);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
    }
    ctx.restore();
    ctx.restore();
  }

  // 左栏文字：点击提示（替代星座英文名）
  const nameY = LEFT_CY + CHART_R + 8;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(160,155,210,0.65)';
  ctx.fillText('点击星点查看名称', LEFT_CX, nameY);

  // 左右竖分割线
  ctx.strokeStyle = grp.color + '28';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SPLIT_X, BODY_TOP + 8);
  ctx.lineTo(SPLIT_X, BODY_TOP + BODY_H - 8);
  ctx.stroke();

  ctx.restore(); // end left clip

  // ── 右侧60%：图片 + 描述（可滚动） ──────────────────────
  const RIGHT_X   = SPLIT_X + 8;
  const RIGHT_W   = W - RIGHT_X - (G.SAFE_RIGHT || 0) - 10;
  const CLIP_TOP  = BODY_TOP + 4;
  const CLIP_H    = BODY_H - 8;

  // 加载/重置照片（仅本地资源，外部CDN在小游戏域名白名单外无法加载）
  const allPhotos = c.photos || (c.photo ? [c.photo] : []);
  const photos = allPhotos.filter(u => u && !u.startsWith('http'));
  if (_carouselForIdx !== _detail.idx) {
    _carouselForIdx = _detail.idx;
    _carouselImgs   = [];
    _carouselPos    = 0;
    photos.forEach((url, i) => _loadPhoto(url, i, _detail.idx));
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(RIGHT_X, CLIP_TOP, RIGHT_W, CLIP_H);
  ctx.clip();
  ctx.translate(0, -_detail.scrollY + CLIP_TOP);

  let oy2 = 6;

  // ── 天文图片 ─────────────────────────────────────────────
  const PHOTO_H = Math.min(160, CLIP_H * 0.48);
  const slot    = _carouselImgs[_carouselPos] || { img: null, loaded: false, error: false };

  ctx.save();
  ctx.fillStyle = 'rgba(20,16,48,0.80)';
  _roundRect(ctx, RIGHT_X, oy2, RIGHT_W, PHOTO_H, 8);
  ctx.fill();
  ctx.beginPath();
  _roundRect(ctx, RIGHT_X, oy2, RIGHT_W, PHOTO_H, 8);
  ctx.clip();

  if (slot.loaded && slot.img) {
    const iw = slot.img.width  || RIGHT_W;
    const ih = slot.img.height || PHOTO_H;
    const scale = Math.max(RIGHT_W / iw, PHOTO_H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = RIGHT_X + (RIGHT_W - dw) / 2;
    const dy = oy2 + (PHOTO_H - dh) / 2;
    ctx.drawImage(slot.img, dx, dy, dw, dh);
  } else if (slot.error || photos.length === 0) {
    // 旋转星形占位符（加载失败 / 无图）
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(140,130,180,0.55)';
    ctx.fillText('暂无图片', RIGHT_X + RIGHT_W / 2, oy2 + PHOTO_H / 2);
  } else {
    // 旋转星形加载动画
    const cx3 = RIGHT_X + RIGHT_W / 2;
    const cy3 = oy2 + PHOTO_H / 2;
    const spin = t * 1.6;
    ctx.save();
    ctx.translate(cx3, cy3);
    ctx.rotate(spin);
    ctx.strokeStyle = grp.color + 'aa';
    ctx.lineWidth = 1.5;
    for (let sp = 0; sp < 6; sp++) {
      const a = (sp / 6) * TWO_PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
    ctx.restore();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,140,190,0.60)';
    ctx.fillText('加载中...', cx3, cy3 + 22);
  }
  ctx.restore();

  // 记录图片点击区域（用于全屏缩放，坐标与轮播按钮一致：滚动补偿后）
  _zoomRect = { x: RIGHT_X, y: oy2, w: RIGHT_W, h: PHOTO_H };

  // 照片翻页按钮
  if (photos.length > 1) {
    const BW = 24, BH = 34, BY = oy2 + (PHOTO_H - BH) / 2;
    const drawBtn2 = (bx, label, active2) => {
      ctx.save();
      ctx.globalAlpha = active2 ? 0.75 : 0.18;
      ctx.fillStyle = 'rgba(8,6,22,0.70)';
      _roundRect(ctx, bx, BY, BW, BH, 5);
      ctx.fill();
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c8d4ff';
      ctx.fillText(label, bx + BW / 2, BY + BH / 2);
      ctx.restore();
      return { x: bx, y: BY, w: BW, h: BH };
    };
    _carouselPrevRect = drawBtn2(RIGHT_X + 2, '‹', _carouselPos > 0);
    _carouselNextRect = drawBtn2(RIGHT_X + RIGHT_W - BW - 2, '›', _carouselPos < photos.length - 1);
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(210,205,255,0.75)';
    ctx.fillText(`${_carouselPos + 1}/${photos.length}`, RIGHT_X + RIGHT_W / 2, oy2 + PHOTO_H - 8);
    ctx.restore();
  } else {
    _carouselPrevRect = null;
    _carouselNextRect = null;
  }
  oy2 += PHOTO_H + 10;

  // ── 信息pills ─────────────────────────────────────────────
  const infos = [
    c.region        ? `${c.region}` : null,
    c.bestViewMonth ? `${c.bestViewMonth}` : null,
    c.mainStars     ? `主星 ${c.mainStars}` : null,
  ].filter(Boolean);

  if (infos.length > 0) {
    const pillH = 24;
    let px = RIGHT_X;
    let pillRowY = oy2;
    for (const info of infos) {
      ctx.save();
      ctx.font = '13px sans-serif';
      // 截断超长文字
      let label = info;
      const maxPillW = RIGHT_W - 4;
      while (label.length > 4 && ctx.measureText(label).width + 16 > maxPillW) {
        label = label.slice(0, -1);
      }
      const tw = Math.min(ctx.measureText(label).width + 16, maxPillW);
      // 换行前检查（检查下一个pill是否超出宽度）
      if (px + tw > RIGHT_X + RIGHT_W) { px = RIGHT_X; pillRowY += pillH + 4; }
      ctx.fillStyle = 'rgba(50,60,120,0.55)';
      _roundRect(ctx, px, pillRowY, tw, pillH, 10);
      ctx.fill();
      ctx.strokeStyle = grp.color + '40';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(195,195,235,0.85)';
      ctx.fillText(label, px + 7, pillRowY + pillH / 2, tw - 14);
      ctx.restore();
      px += tw + 6;
    }
    oy2 = pillRowY + pillH + 10;
  }

  // ── lore（神话/描述） ─────────────────────────────────────
  ctx.save();
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(210,205,245,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = _wrapText(ctx, c.lore || '', RIGHT_W);
  for (const line of lines) {
    ctx.fillText(line, RIGHT_X, oy2);
    oy2 += 24;
  }
  ctx.restore();
  oy2 += 16;

  _detailTotalH         = oy2;
  const maxScroll       = Math.max(0, _detailTotalH - CLIP_H);
  _detail.scrollTarget  = Math.max(0, Math.min(maxScroll, _detail.scrollTarget));

  ctx.restore(); // end right clip+alpha
}

// ── 幽灵按钮 ──────────────────────────────────────────────────
function _ghostBtn(ctx, x, y, w, h, label, opacity) {
  ctx.save();
  ctx.globalAlpha = (opacity !== undefined) ? opacity : 1.0;
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

// ── 方案G 返回按钮：渐变文字+底线，无背景 ──────────────────────
function _drawBackBtnG(ctx, x, y, w, h, label) {
  ctx.save();
  const cy = y + h / 2;
  const cx = x + w / 2;
  const tg = ctx.createLinearGradient(x, cy, x + w, cy);
  tg.addColorStop(0, 'rgba(255,255,255,0.92)');
  tg.addColorStop(1, 'rgba(140,180,255,0.85)');
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = tg;
  ctx.shadowColor  = 'rgba(160,200,255,0.5)';
  ctx.shadowBlur   = 6;
  ctx.fillText(label, cx, cy - 1);
  ctx.shadowBlur   = 0;
  const lg = ctx.createLinearGradient(x, 0, x + w, 0);
  lg.addColorStop(0,   'rgba(255,255,255,0)');
  lg.addColorStop(0.3, 'rgba(140,180,255,0.7)');
  lg.addColorStop(1,   'rgba(100,140,255,0.2)');
  ctx.strokeStyle = lg;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 1);
  ctx.lineTo(x + w, y + h - 1);
  ctx.stroke();
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
    const _stFn = wx.setTimeout || setTimeout;
    const _ctFn = wx.clearTimeout || clearTimeout;
    const timer = _stFn(() => {
      if (_carouselImgs[pos] && !_carouselImgs[pos].loaded)
        _carouselImgs[pos] = { img: null, loaded: false, error: true };
    }, 10000);
    img.onload  = () => { _ctFn(timer); if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img, loaded: true, error: false }; };
    img.onerror = () => { _ctFn(timer); if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true }; };
    img.src = url;
  } catch (e) {
    if (_carouselForIdx === conIdx) _carouselImgs[pos] = { img: null, loaded: false, error: true };
  }
}

// ── 照片全屏缩放遮层 ────────────────────────────────────────────
function _drawZoomOverlay(ctx, W, H) {
  if (!_zoom) return;
  const a = Math.max(0, Math.min(1, _zoom.alpha));
  // 黑色半透明遮罩
  ctx.save();
  ctx.globalAlpha = a * 0.92;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // 居中图片（带弹性缩放）
  if (_zoom.img) {
    const iw = _zoom.img.width  || W;
    const ih = _zoom.img.height || H;
    const fitScale = Math.min(W / iw, H / ih);
    const s  = _zoom.scale;
    const dw = iw * fitScale * s;
    const dh = ih * fitScale * s;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(_zoom.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
  }
  // "点击关闭"提示
  ctx.save();
  ctx.globalAlpha = a * 0.55;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('点击关闭', W / 2, H - 18);
  ctx.restore();
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

function _switchGroup(newGroup) {
  if (newGroup < 0 || newGroup >= _GROUPS.length) return;
  if (newGroup === _currentGroup) return;
  const dir = newGroup > _currentGroup ? -1 : 1;
  _pendingGroup = newGroup;
  _slideTargetX = dir * G.SCREEN_W;

  // 预计算目标组节点
  const W2 = G.SCREEN_W;
  const H2 = G.SCREEN_H;
  const aTop = G.SAFE_TOP + 72;
  const aBot = H2 - G.SAFE_BOTTOM - 26;
  const aCX  = W2 / 2;
  const aCY  = (aTop + aBot) / 2;
  const aW   = W2 - (G.SAFE_LEFT || 0) - (G.SAFE_RIGHT || 0) - 180;
  const aH   = aBot - aTop;
  _pendingNodes = _HEX_POS.map((pos, slot) => ({
    cx: aCX + pos.xr * aW,
    cy: aCY + pos.yr * aH,
    r:  _NODE_R,
    idx: _GROUPS[newGroup].levels[slot],
    slot,
  }));

  _detail         = null;
  _carouselForIdx = -1;
  _carouselImgs   = [];
}

// ── Touch handling ─────────────────────────────────────────────
let _touchStartX2   = 0;
let _touchStartTime = 0;

function _onTouchStart(e) {
  const touch = e.touches[0];
  if (!touch) return;
  _touchStartX2   = touch.x;
  _touchStartX    = touch.x;
  _touchStartY    = touch.y;
  _touchStartTime = Date.now();
  _detailLastTY   = touch.y;
  _detailDragging = false;
  _isDragging     = false;
}

function _onTouchMove(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const dy = touch.y - _detailLastTY;
  _detailLastTY = touch.y;
  const dx = touch.x - _touchStartX;

  if (_detail) {
    if (Math.abs(dy) > 2) _detailDragging = true;
    const W2 = G.SCREEN_W;
    const H2 = G.SCREEN_H;
    const HEADER_H = G.SAFE_TOP + 46;
    const CLIP_H   = H2 - HEADER_H - (G.SAFE_BOTTOM + 4) - 8;
    const maxScroll = Math.max(0, _detailTotalH - CLIP_H);
    _detail.scrollTarget = Math.max(0, Math.min(maxScroll, _detail.scrollTarget - dy));
  } else {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) _isDragging = true;

    // 水平拖拽驱动 spring
    if (_isDragging && Math.abs(dx) > Math.abs(touch.y - _touchStartY)) {
      const W = G.SCREEN_W;
      const canLeft  = _currentGroup < _GROUPS.length - 1;
      const canRight = _currentGroup > 0;
      let rawDx = dx;
      if ((rawDx < 0 && !canLeft) || (rawDx > 0 && !canRight)) rawDx *= 0.25; // 边界阻尼
      _slideX       = rawDx;
      _slideTargetX = rawDx;

      // 预加载目标组节点
      const targetGroup = rawDx < 0 ? _currentGroup + 1 : _currentGroup - 1;
      if (targetGroup >= 0 && targetGroup < _GROUPS.length && targetGroup !== _pendingGroup) {
        const H2 = G.SCREEN_H;
        const aTop = G.SAFE_TOP + 72;
        const aBot = H2 - G.SAFE_BOTTOM - 26;
        const aCX  = W / 2; const aCY = (aTop + aBot) / 2;
        const aW   = W - (G.SAFE_LEFT || 0) - (G.SAFE_RIGHT || 0) - 180; const aH = aBot - aTop;
        _pendingGroup = targetGroup;
        _pendingNodes = _HEX_POS.map((pos, slot) => ({
          cx: aCX + pos.xr * aW, cy: aCY + pos.yr * aH,
          r:  _NODE_R, idx: _GROUPS[targetGroup].levels[slot], slot,
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
  const dx = tx - _touchStartX;

  // ── 全屏图片缩放层（最优先） ───────────────────────────────
  if (_zoom) {
    _zoom.targetAlpha = 0;
    _zoom.targetScale = 0.6;
    return;
  }

  // ── 全屏详情开启状态 ──────────────────────────────────────
  if (_detail) {
    if (_detailDragging) {
      _detailDragging = false;
      return;
    }

    // 返回图鉴按钮
    if (_detailRects.back && hitTest(_detailRects.back, tx, ty)) {
      _detail = null;
      _carouselForIdx = -1;
      _carouselImgs   = [];
      _detailTappedStar = null;
      return;
    }

    // 星座左右切换按钮
    if (_detailRects.prevCon && hitTest(_detailRects.prevCon, tx, ty) && _detail.idx > 0) {
      _detail.idx--;
      _detail.scrollY = _detail.scrollTarget = 0;
      _carouselPos = 0;
      _carouselForIdx = -1;
      _carouselImgs = [];
      _detailTappedStar = null;
      return;
    }
    if (_detailRects.nextCon && hitTest(_detailRects.nextCon, tx, ty) && _detail.idx < CONSTELLATIONS.length - 1) {
      _detail.idx++;
      _detail.scrollY = _detail.scrollTarget = 0;
      _carouselPos = 0;
      _carouselForIdx = -1;
      _carouselImgs = [];
      _detailTappedStar = null;
      return;
    }

    // 照片轮播按钮（需要补偿scroll）
    const HEADER_H = G.SAFE_TOP + 46;
    const CLIP_TOP = HEADER_H + 4;
    const sty = ty + _detail.scrollY - CLIP_TOP;
    if (_carouselPrevRect && hitTest(_carouselPrevRect, tx, sty) && _carouselPos > 0) {
      _carouselPos--;
      return;
    }
    if (_carouselNextRect && hitTest(_carouselNextRect, tx, sty)) {
      const photos = CONSTELLATIONS[_detail.idx].photos
        || (CONSTELLATIONS[_detail.idx].photo ? [CONSTELLATIONS[_detail.idx].photo] : []);
      if (_carouselPos < photos.length - 1) _carouselPos++;
      return;
    }

    // 点击图片区域 → 全屏缩放
    if (_zoomRect && hitTest(_zoomRect, tx, sty)) {
      const slot2 = _carouselImgs[_carouselPos];
      if (slot2 && slot2.loaded && slot2.img) {
        _zoom = { img: slot2.img, alpha: 0, targetAlpha: 1, scale: 0.5, targetScale: 1.0 };
      }
      return;
    }

    // 点击左侧星图区域 → 显示星名
    const SPLIT_X2 = Math.round(G.SCREEN_W * 0.40);
    if (tx < SPLIT_X2 && _detailMappedStars.length > 0) {
      let hitIdx = -1;
      let hitDist = 999;
      for (let si = 0; si < _detailMappedStars.length; si++) {
        const s = _detailMappedStars[si];
        const dist = Math.hypot(tx - s.x, ty - s.y);
        if (dist < Math.max(s.r + 10, 14) && dist < hitDist) {
          hitDist = dist;
          hitIdx  = si;
        }
      }
      if (hitIdx >= 0) {
        _detailTappedStar = { idx: hitIdx, until: Date.now() + 3000 };
      } else {
        _detailTappedStar = null;
      }
      return;
    }

    return;
  }

  // ── 左右滑动切换星系（28% 阈值，参考关卡界面） ───────────────
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
        _slideTargetX = 0; _pendingGroup = _currentGroup; _pendingNodes = null;
      }
    } else {
      // 未达阈值 → 弹回原位
      _slideTargetX = 0; _pendingGroup = _currentGroup; _pendingNodes = null;
    }
    return;
  }

  // ── 固定按钮 ─────────────────────────────────────────────
  if (_backRect && hitTest(_backRect, tx, ty)) {
    if (_navigate) _navigate(_galleryFrom);
    return;
  }

  // ── 节点点击 → 打开全屏详情 ──────────────────────────────
  for (const node of _nodeRects) {
    if (Math.hypot(tx - node.cx, ty - node.cy) <= node.r + 12) {
      if (!state.isUnlocked(node.idx)) {
        try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
        return;
      }
      // 同一节点再次点击 → 关闭详情
      if (_detail && _detail.idx === node.idx) {
        _detail = null;
        _carouselForIdx = -1;
        _carouselImgs   = [];
        return;
      }
      _detail = { idx: node.idx, alpha: 0, scrollY: 0, scrollTarget: 0 };
      _carouselForIdx = -1;
      _carouselImgs   = [];
      _carouselPos    = 0;
      return;
    }
  }
}
