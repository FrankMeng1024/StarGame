// menu-sky.js — Single-constellation featured background for the main menu
// CR-079: Shows the ONE constellation most visible right now (highest altitude)
// large and centered on the canvas, occupying ~55% of screen height.
//
// Usage:
//   import { initMenuSky, stopMenuSky } from './menu-sky.js';
//   initMenuSky(conDef, altitudeDeg, isDefault);  // start
//   stopMenuSky();                                  // stop on nav away

import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _canvas   = null;
let _ctx      = null;
let _rafId    = null;
let _stars    = [];   // { cx, cy, r, color, phase, speed }
let _lines    = [];   // { x1, y1, x2, y2 }

// ── Init ──────────────────────────────────────────────────────
/**
 * @param {object} conDef — full CONSTELLATIONS entry (with .stars, .lines)
 */
export function initMenuSky(conDef) {
  stopMenuSky(); // clean up any previous instance

  if (!conDef || !conDef.stars) return;

  // ── Create / reuse overlay canvas — inside screen-menu ───────
  _canvas = document.getElementById('menu-sky-canvas');
  if (!_canvas) {
    _canvas = document.createElement('canvas');
    _canvas.id = 'menu-sky-canvas';
    _canvas.setAttribute('aria-hidden', 'true');
    _canvas.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1.8s ease;
    `;
    // Insert as first child of screen-menu so it renders behind UI content
    // but inside the screen stacking context
    const screenMenu = document.getElementById('screen-menu');
    if (screenMenu) {
      screenMenu.insertBefore(_canvas, screenMenu.firstChild);
    } else {
      document.body.appendChild(_canvas);
    }
  }

  _canvas.width  = window.innerWidth;
  _canvas.height = window.innerHeight;
  _ctx = _canvas.getContext('2d');

  // ── Build layout: single constellation centered ───────────────
  _buildLayout(conDef);

  // ── Start animation loop ──────────────────────────────────────
  requestAnimationFrame(t => {
    _canvas.style.opacity = '1.0';
    _loop(t);
  });
}

// ── Layout: constellation in upper portion of screen ─────────
function _buildLayout(conDef) {
  _stars = [];
  _lines = [];

  const W = _canvas.width;
  const H = _canvas.height;

  // Initial placement — center of constellation data space at screen center
  const cx = W * 0.50;
  const cy = H * 0.33;
  const BOX = H * 0.72;

  // First pass: compute raw positions
  const conStars = conDef.stars.map((s, si) => ({
    cx: cx + (s.x - 0.5) * BOX,
    cy: cy + (s.y - 0.5) * BOX,
    r: Math.max(3.5, Math.min(13, magToRadius(s.mag) * 1.5)),
    color: typeToColor(s.type),
    phase: (si * 1.618) % TWO_PI,
    speed: 0.4 + (si % 5) * 0.15,
  }));

  // Auto-center: shift so bounding-box center aligns with (W*0.50, H*0.33)
  // This corrects for asymmetric star data (e.g. Taurus skewing right)
  const xs = conStars.map(s => s.cx);
  const ys = conStars.map(s => s.cy);
  const xMid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const yMid = (Math.min(...ys) + Math.max(...ys)) / 2;
  const dx = W * 0.50 - xMid;
  const dy = H * 0.33 - yMid;
  for (const s of conStars) { s.cx += dx; s.cy += dy; }

  (conDef.lines || []).forEach(([ai, bi]) => {
    const a = conStars[ai];
    const b = conStars[bi];
    if (!a || !b) return;
    _lines.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy });
  });

  _stars = conStars;
}

// ── Animation loop ────────────────────────────────────────────
function _loop(now) {
  if (!_ctx) return;
  const t = now * 0.001;
  const W = _canvas.width;
  const H = _canvas.height;

  _ctx.clearRect(0, 0, W, H);

  // Draw constellation lines — more visible as full-screen hero background
  _ctx.save();
  for (const ln of _lines) {
    _ctx.beginPath();
    _ctx.moveTo(ln.x1, ln.y1);
    _ctx.lineTo(ln.x2, ln.y2);
    _ctx.strokeStyle = 'rgba(200,185,130,0.50)';
    _ctx.lineWidth = 1.4;
    _ctx.stroke();
  }
  _ctx.restore();

  // Draw stars with twinkling + large glow halo
  for (const s of _stars) {
    const alpha = 0.50 + 0.50 * Math.abs(Math.sin(t * s.speed + s.phase));

    // Outer soft glow
    const grd = _ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r * 5);
    const colorBase = s.color.replace(')', `,${(alpha * 0.45).toFixed(2)})`).replace('rgb', 'rgba');
    grd.addColorStop(0, colorBase);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.save();
    _ctx.fillStyle = grd;
    _ctx.beginPath();
    _ctx.arc(s.cx, s.cy, s.r * 5, 0, TWO_PI);
    _ctx.fill();
    _ctx.restore();

    // Core star dot
    _ctx.save();
    _ctx.globalAlpha = alpha;
    _ctx.fillStyle   = s.color;
    _ctx.shadowColor = s.color;
    _ctx.shadowBlur  = s.r * 4;
    _ctx.beginPath();
    _ctx.arc(s.cx, s.cy, s.r, 0, TWO_PI);
    _ctx.fill();
    _ctx.restore();
  }

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
  }
  _stars = [];
  _lines = [];
}

// ── Handle window resize ──────────────────────────────────────
window.addEventListener('resize', () => {
  if (!_canvas || _rafId === null) return;
  _canvas.width  = window.innerWidth;
  _canvas.height = window.innerHeight;
  // Stars/lines positions are stale after resize — caller should re-init.
  // For menu-only use, acceptable: layout holds until next menu entry.
});
