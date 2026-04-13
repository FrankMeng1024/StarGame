// menu-sky.js — Dynamic constellation overlay on the main menu
// Renders 4-6 currently-visible constellations as animated glowing star patterns
// on a dedicated canvas layered above star-canvas but below #app UI.
//
// Usage:
//   import { initMenuSky, stopMenuSky } from './menu-sky.js';
//   initMenuSky(visibleConstellations, latDeg, isDefault);  // start
//   stopMenuSky();                                           // stop on nav away

import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _canvas   = null;
let _ctx      = null;
let _rafId    = null;
let _stars    = [];   // flat list of { cx, cy, r, color, phase, speed } per visible constellation
let _lines    = [];   // flat list of { x1,y1,x2,y2, conIdx } for constellation edges
let _labels   = [];   // [{ x, y, text }] — at most 2 label pairs
let _labelEl  = null; // DOM element for text label

// ── Init ──────────────────────────────────────────────────────
/**
 * @param {Array} visibleConstellations  — from getVisibleConstellations()
 * @param {number} latDeg                — observer latitude (for display only)
 * @param {boolean} isDefault            — true if geolocation was denied
 */
export function initMenuSky(visibleConstellations, latDeg, isDefault) {
  stopMenuSky(); // clean up any previous instance

  // ── Create / reuse overlay canvas ────────────────────────────
  _canvas = document.getElementById('menu-sky-canvas');
  if (!_canvas) {
    _canvas = document.createElement('canvas');
    _canvas.id = 'menu-sky-canvas';
    _canvas.setAttribute('aria-hidden', 'true');
    _canvas.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1.5s ease;
    `;
    // Insert after star-canvas so it renders on top of the starfield
    const starCanvas = document.getElementById('star-canvas');
    if (starCanvas && starCanvas.parentNode) {
      starCanvas.insertAdjacentElement('afterend', _canvas);
    } else {
      document.body.insertBefore(_canvas, document.body.firstChild);
    }
  }

  _canvas.width  = window.innerWidth;
  _canvas.height = window.innerHeight;
  _ctx = _canvas.getContext('2d');

  // ── Build label element ───────────────────────────────────────
  _labelEl = document.getElementById('menu-sky-label');
  if (!_labelEl) {
    _labelEl = document.createElement('div');
    _labelEl.id = 'menu-sky-label';
    _labelEl.setAttribute('aria-hidden', 'true');
    _labelEl.style.cssText = `
      position: fixed;
      bottom: 18px;
      right: 22px;
      z-index: 3;
      font-family: 'Noto Sans SC', sans-serif;
      font-size: 12px;
      color: rgba(180,210,255,0.7);
      text-align: right;
      pointer-events: none;
      line-height: 1.6;
    `;
    document.body.appendChild(_labelEl);
  }

  // ── Map visible constellations onto screen ────────────────────
  _buildLayout(visibleConstellations);

  // ── Text label ────────────────────────────────────────────────
  const locationLine = isDefault
    ? '📍 默认：新西兰特卡波'
    : `📍 当前位置 · ${latDeg >= 0 ? '北' : '南'}纬${Math.abs(latDeg).toFixed(1)}°`;

  const visNames = visibleConstellations
    .slice(0, 3)
    .map(c => _findZhName(c.nameEn))
    .filter(Boolean)
    .join(' · ');
  const constellationLine = visNames ? `今晚可见：${visNames}` : '';

  _labelEl.innerHTML = `${locationLine}<br>${constellationLine}`;
  _labelEl.style.display = '';

  // ── Start animation loop ──────────────────────────────────────
  requestAnimationFrame(t => {
    // Fade in the canvas after first frame
    _canvas.style.opacity = '0.85';
    _loop(t);
  });
}

// ── Layout: map constellations to non-overlapping screen zones ─
function _buildLayout(visibleConstellations) {
  _stars  = [];
  _lines  = [];
  _labels = [];

  const W = _canvas.width;
  const H = _canvas.height;

  // Divide screen into a simple grid of zones to prevent overlap.
  // Zones: TL, TM, TR, ML, MR, BL, BM, BR (8 zones), pick one per constellation.
  const ZONES = [
    { xFrac: 0.12, yFrac: 0.18 },  // TL
    { xFrac: 0.50, yFrac: 0.15 },  // TM
    { xFrac: 0.85, yFrac: 0.18 },  // TR
    { xFrac: 0.10, yFrac: 0.52 },  // ML
    { xFrac: 0.88, yFrac: 0.50 },  // MR
    { xFrac: 0.18, yFrac: 0.80 },  // BL
    { xFrac: 0.55, yFrac: 0.82 },  // BM
    { xFrac: 0.82, yFrac: 0.78 },  // BR
  ];

  // Avoid the menu button area: center column ~35-65% x, ~40-75% y
  const isSafeZone = z => !(z.xFrac > 0.32 && z.xFrac < 0.68 && z.yFrac > 0.38 && z.yFrac < 0.78);
  const safeZones = ZONES.filter(isSafeZone);

  visibleConstellations.forEach((vc, zoneIdx) => {
    if (zoneIdx >= safeZones.length) return;

    // Find matching CONSTELLATIONS entry by English name
    const conDef = CONSTELLATIONS.find(c => c.nameEn === vc.nameEn);
    if (!conDef || !conDef.stars) return;

    const zone = safeZones[zoneIdx % safeZones.length];
    const cx   = zone.xFrac * W;
    const cy   = zone.yFrac * H;

    // Scale constellation to fit in a box of ~120×120 px
    const BOX = Math.min(W, H) * 0.11; // ~11% of screen smaller dimension

    // Map normalized star positions [0..1] → zone-relative coords
    const conStars = conDef.stars.map((s, si) => {
      const sx = cx + (s.x - 0.5) * BOX;
      const sy = cy + (s.y - 0.5) * BOX;
      return {
        cx: sx,
        cy: sy,
        r: Math.max(1.5, Math.min(5, magToRadius(s.mag) * 0.55)),
        color: typeToColor(s.type),
        // Phase offset so stars of different constellations twinkle independently
        phase: (si * 1.618 + zoneIdx * 2.41) % TWO_PI,
        speed: 0.5 + (si % 5) * 0.18,
        conIdx: zoneIdx,
      };
    });

    // Build line segments
    (conDef.lines || []).forEach(([ai, bi]) => {
      const a = conStars[ai];
      const b = conStars[bi];
      if (!a || !b) return;
      _lines.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, conIdx: zoneIdx });
    });

    _stars.push(...conStars);

    // Label: only show top 2 constellations, positioned slightly above zone center
    if (zoneIdx < 2) {
      _labels.push({ x: cx, y: cy - BOX * 0.6, text: _findZhName(vc.nameEn) || vc.nameEn });
    }
  });
}

// ── Animation loop ────────────────────────────────────────────
function _loop(now) {
  if (!_ctx) return;
  const t = now * 0.001;
  const W = _canvas.width;
  const H = _canvas.height;

  _ctx.clearRect(0, 0, W, H);

  // Draw constellation lines
  _ctx.save();
  for (const ln of _lines) {
    _ctx.beginPath();
    _ctx.moveTo(ln.x1, ln.y1);
    _ctx.lineTo(ln.x2, ln.y2);
    _ctx.strokeStyle = 'rgba(200,180,120,0.28)';
    _ctx.lineWidth = 0.8;
    _ctx.stroke();
  }
  _ctx.restore();

  // Draw stars with twinkling
  for (const s of _stars) {
    const alpha = 0.35 + 0.55 * Math.abs(Math.sin(t * s.speed + s.phase));

    // Soft glow halo
    const grd = _ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r * 4);
    grd.addColorStop(0,   s.color.replace(')', `,${(alpha * 0.5).toFixed(2)})`).replace('rgb', 'rgba'));
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    _ctx.save();
    _ctx.fillStyle = grd;
    _ctx.beginPath();
    _ctx.arc(s.cx, s.cy, s.r * 4, 0, TWO_PI);
    _ctx.fill();
    _ctx.restore();

    // Core dot
    _ctx.save();
    _ctx.globalAlpha = alpha;
    _ctx.fillStyle   = s.color;
    _ctx.shadowColor = s.color;
    _ctx.shadowBlur  = s.r * 3;
    _ctx.beginPath();
    _ctx.arc(s.cx, s.cy, s.r, 0, TWO_PI);
    _ctx.fill();
    _ctx.restore();
  }

  // Draw labels
  _ctx.save();
  _ctx.font = "11px 'Noto Sans SC', sans-serif";
  _ctx.textAlign = 'center';
  for (const lb of _labels) {
    _ctx.fillStyle = 'rgba(200,220,255,0.55)';
    _ctx.fillText(lb.text, lb.x, lb.y);
  }
  _ctx.restore();

  _rafId = requestAnimationFrame(_loop);
}

// ── Stop & cleanup ────────────────────────────────────────────
export function stopMenuSky() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  if (_canvas) {
    _canvas.style.opacity = '0';
    // Don't remove — reuse next time
  }
  if (_labelEl) {
    _labelEl.style.display = 'none';
  }
  _stars  = [];
  _lines  = [];
  _labels = [];
}

// ── Helper: find Chinese name from CONSTELLATIONS ─────────────
function _findZhName(nameEn) {
  const con = CONSTELLATIONS.find(c => c.nameEn === nameEn);
  return con ? con.nameZh : null;
}

// ── Handle window resize ──────────────────────────────────────
window.addEventListener('resize', () => {
  if (!_canvas || _rafId === null) return; // not active
  _canvas.width  = window.innerWidth;
  _canvas.height = window.innerHeight;
  // Rebuild layout with current stars (re-layout from _stars metadata not stored;
  // caller must re-init on resize if needed — acceptable for menu-only use)
});
