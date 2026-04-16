// intro.js — 开场动画（微信小游戏版 Canvas）
// Phase 1 (0-3s):  流星雨 — gold diagonal streaks across dark sky
// Phase 2 (3-8s):  随机星座节点逐一显现 + 连线绘制
// Phase 3 (8-12s): 标题 "追星少女" 淡入
// 触摸任意位置可跳过
// 结束后调用 navigate('menu')

import { G } from '../engine/globals.js';
import { CONSTELLATIONS } from '../data/constellations.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate  = null;
let _rafId     = null;
let _startTime = 0;
let _done      = false;

// Meteors
let _meteors   = [];  // {x,y,vx,vy,len,alpha}

// Constellation for phase 2 (random selection)
let _conDef    = null;
let _mappedStars = [];
let _mappedLines = [];

// ── Public API ────────────────────────────────────────────────
export function showIntro(navigate) {
  _navigate = navigate;
  _cleanup();
  _done = false;

  // Pick a random unlocked-like constellation (just use a random one)
  _conDef = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
  _buildConStars();

  // Spawn initial meteors
  _meteors = [];
  for (let i = 0; i < 8; i++) {
    _spawnMeteor(Math.random() * 12000); // stagger start times across 12s
  }

  G.CANVAS.addEventListener('touchstart', _onSkip);

  _startTime = 0; // will be set on first frame
  _rafId = requestAnimationFrame(_loop);
}

export function hideIntro() {
  _cleanup();
}

// ── Internal ──────────────────────────────────────────────────
function _cleanup() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  try { G.CANVAS.removeEventListener('touchstart', _onSkip); } catch (e) {}
}

function _onSkip() {
  _finish();
}

function _finish() {
  if (_done) return;
  _done = true;
  _cleanup();
  if (_navigate) _navigate('menu');
}

function _buildConStars() {
  if (!_conDef || !_conDef.stars) { _mappedStars = []; _mappedLines = []; return; }
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const SIZE = Math.min(W, H) * 0.55;
  const cx = W / 2;
  const cy = H * 0.42;
  const PAD = 20;
  const AREA = SIZE - PAD * 2;

  _mappedStars = _conDef.stars.map(s => ({
    x: cx - SIZE / 2 + PAD + s.x * AREA,
    y: cy - SIZE / 2 + PAD + s.y * AREA,
    r: Math.max(2, Math.min(6, 8 - (s.mag || 3))),
  }));
  _mappedLines = _conDef.lines || [];
}

function _spawnMeteor(delayMs) {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const speed = 600 + Math.random() * 400; // px/s
  const angle = Math.PI * 0.32; // ~58° diagonal
  _meteors.push({
    x: Math.random() * W * 1.5 - W * 0.25,
    y: -20 - Math.random() * H * 0.3,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: 60 + Math.random() * 80,
    alpha: 0.7 + Math.random() * 0.3,
    born: delayMs, // ms since intro start
    dead: false,
  });
}

function _loop(now) {
  if (_done) return;
  if (_startTime === 0) _startTime = now;
  // QA FREEZE HOOK: wx.__introFreezeAt = N freezes animation at N seconds
  let elapsed = (now - _startTime) / 1000; // seconds
  if (typeof wx !== 'undefined' && typeof wx.__introFreezeAt === 'number') {
    elapsed = wx.__introFreezeAt;
  }

  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;

  // ── Clear — deep space ──────────────────────────────────────
  ctx.fillStyle = '#020510';
  ctx.fillRect(0, 0, W, H);

  // ── Background micro-stars ──────────────────────────────────
  ctx.save();
  for (let i = 0; i < 80; i++) {
    // Deterministic pseudo-random using i as seed
    const sx = ((i * 137 + 41) % W);
    const sy = ((i * 97 + 23) % H);
    const sa = 0.2 + (i % 5) * 0.1;
    ctx.globalAlpha = sa;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 0.7, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();

  const elapsedMs = now - _startTime;

  // ── Phase 1: Meteors (0-5s) ─────────────────────────────────
  if (elapsed < 5) {
    // Spawn new meteors periodically
    if (_meteors.filter(m => !m.dead).length < 4 && Math.random() < 0.08) {
      _spawnMeteor(elapsedMs);
    }
    for (const m of _meteors) {
      if (m.dead || elapsedMs < m.born) continue;
      const age = (elapsedMs - m.born) / 1000;
      m.x += m.vx * (1 / 60);
      m.y += m.vy * (1 / 60);
      if (m.y > H + 50 || m.x > W + 50) { m.dead = true; continue; }
      // Trail: draw line from current pos back along velocity
      const trailFactor = 0.12; // fraction of velocity vector for trail length
      const tx0 = m.x - m.vx * trailFactor;
      const ty0 = m.y - m.vy * trailFactor;
      const fadeA = m.alpha * Math.max(0, 1 - age * 0.25);
      ctx.save();
      const grd = ctx.createLinearGradient(m.x, m.y, tx0, ty0);
      grd.addColorStop(0, `rgba(255,215,0,${fadeA.toFixed(2)})`);
      grd.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.strokeStyle = grd;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx0, ty0);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Phase 2: Constellation reveal (3-8s) ───────────────────
  if (elapsed >= 3 && elapsed < 8 && _mappedStars.length > 0) {
    const t2 = elapsed - 3; // 0-5s within phase
    const revealFrac = t2 / 5; // 0→1 over 5s

    const starsToShow = Math.floor(revealFrac * _mappedStars.length);
    const linesToShow = Math.floor(revealFrac * _mappedLines.length);

    // Fade in phase 2
    const phaseAlpha = Math.min(1, (elapsed - 3) * 0.8);

    ctx.save();
    ctx.globalAlpha = phaseAlpha;

    // Lines
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 4;
    for (let li = 0; li < linesToShow; li++) {
      const [a, b] = _mappedLines[li];
      if (!_mappedStars[a] || !_mappedStars[b]) continue;
      ctx.beginPath();
      ctx.moveTo(_mappedStars[a].x, _mappedStars[a].y);
      ctx.lineTo(_mappedStars[b].x, _mappedStars[b].y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Stars
    for (let si = 0; si < starsToShow; si++) {
      const s = _mappedStars[si];
      // Glow
      ctx.save();
      ctx.globalAlpha = phaseAlpha * 0.4;
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
      grd.addColorStop(0, '#ffd700');
      grd.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.5, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      // Core
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();

    // Constellation name
    if (elapsed > 5 && _conDef) {
      const nameAlpha = Math.min(1, (elapsed - 5) * 1.5);
      ctx.save();
      ctx.globalAlpha = nameAlpha;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(200,190,255,0.9)';
      ctx.fillText(_conDef.nameZh + '  ' + _conDef.nameEn, W / 2, H * 0.7);
      ctx.restore();
    }
  }

  // ── Phase 3: Title fade-in (8-12s) ─────────────────────────
  if (elapsed >= 8) {
    const t3 = elapsed - 8; // 0-4s
    const titleAlpha = Math.min(1, t3 / 1.5);

    // Dim constellation for focus on title
    if (_mappedStars.length > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (t3 / 4) * 0.5);
      ctx.strokeStyle = 'rgba(255,215,0,0.4)';
      ctx.lineWidth = 1;
      for (const [a, b] of _mappedLines) {
        if (!_mappedStars[a] || !_mappedStars[b]) continue;
        ctx.beginPath();
        ctx.moveTo(_mappedStars[a].x, _mappedStars[a].y);
        ctx.lineTo(_mappedStars[b].x, _mappedStars[b].y);
        ctx.stroke();
      }
      for (const s of _mappedStars) {
        ctx.fillStyle = '#fff8dc';
        ctx.globalAlpha = 0.6 * Math.max(0, 1 - (t3 / 4) * 0.5);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
        ctx.fill();
      }
      ctx.restore();
    }

    // Title glow
    ctx.save();
    ctx.globalAlpha = titleAlpha * 0.3;
    ctx.shadowColor = '#a070ff';
    ctx.shadowBlur = 40;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8d8ff';
    ctx.fillText('追星少女', W / 2, H / 2);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0e8ff';
    ctx.shadowColor = '#c090ff';
    ctx.shadowBlur = 12;
    ctx.fillText('追星少女', W / 2, H / 2);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.globalAlpha = Math.min(1, t3 / 2.5);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(180,170,220,0.8)';
    ctx.fillText('轻触屏幕开始', W / 2, H / 2 + 36);
    ctx.restore();

    // Auto-finish at 13s (suppressed when QA freeze hook is active)
    if (elapsed >= 13 && !(typeof wx !== 'undefined' && typeof wx.__introFreezeAt === 'number')) {
      _finish();
      return;
    }
  }

  _rafId = requestAnimationFrame(_loop);
}
