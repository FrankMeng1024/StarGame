// intro.js — 开场动画（微信小游戏版 Canvas）
// Phase 1 (0-5s):  流星雨 — gold diagonal streaks across dark sky
// Phase 2 (5-9s):  随机星座节点逐一显现 + 连线绘制  (upper screen area)
// Phase 3 (9-13s): 标题 "追星少女" 淡入  (lower screen area)
// 触摸任意位置可跳过
// 结束后调用 navigate('menu')

import { G } from '../engine/globals.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { drawFadeOverlay, tickFade, resetFade } from '../engine/canvas-utils.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _navigate  = null;
let _rafId     = null;
let _startTime = 0;
let _lastNow   = 0;
let _done      = false;

// Meteors
let _meteors   = [];  // {x,y,vx,vy,len,alpha}

// Constellation for phase 2 (random selection)
let _conDef    = null;
let _mappedStars = [];
let _mappedLines = [];

// Sparkle particles for star reveal (STORY-00277)
let _sparkles  = [];  // {x,y,vx,vy,life,maxLife}
// Track which stars have already triggered sparkle burst
let _sparkleTriggered = new Set();

// ── Public API ────────────────────────────────────────────────
export function showIntro(navigate) {
  _navigate = navigate;
  _cleanup();
  _done = false;

  // STORY-00290: Force-clear any stuck fade overlay from previous navigation
  // (root cause of black screen on real device: _fadeAlpha=1 from prior fadeNavigate call)
  resetFade();

  // STORY-00316 (CR-113): Fixed Orion — consistent with HTML version, best shape for intro
  _conDef = CONSTELLATIONS[0]; // 猎户座 (Orion)
  _buildConStars();

  // Spawn initial meteors — 4 with born=0 for immediate visibility (STORY-00283)
  _meteors = [];
  for (let i = 0; i < 4; i++) {
    _spawnMeteor(0); // appear from frame 1
  }
  for (let i = 0; i < 5; i++) {
    _spawnMeteor(1000 + Math.random() * 8000); // stagger remaining across 9s
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
  _sparkles = [];
  _sparkleTriggered = new Set();
  _lastNow = 0;
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
  // STORY-00290: Constellation in upper 35% of screen — better visual proportion
  // Portrait: cx=center, cy=28% down; Landscape: similar upper placement
  const SIZE = Math.min(W, H) * 0.65;  // STORY-00316: was 0.50 — larger, more impressive
  const cx = W / 2;
  const cy = H * 0.32;  // STORY-00316: was 0.28 — slightly lower for balance with meteors
  const PAD = 18;
  const AREA = SIZE - PAD * 2;

  _mappedStars = _conDef.stars.map(s => ({
    x: cx - SIZE / 2 + PAD + s.x * AREA,
    y: cy - SIZE / 2 + PAD + s.y * AREA,
    r: Math.max(3, Math.min(8, 10 - (s.mag || 3))),  // STORY-00316: was max(2,min(6,...)) — larger range, stronger size contrast
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
    alpha: 0.85 + Math.random() * 0.15,  // STORY-00283: min 0.85 for visibility
    born: delayMs, // ms since intro start
    dead: false,
  });
}

function _loop(now) {
  if (_done) return;
  if (_startTime === 0) _startTime = now;
  const dt = _lastNow > 0 ? Math.min((now - _lastNow) / 1000, 0.05) : 1 / 60;
  _lastNow = now;
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

  // ── Background micro-stars — active twinkle (STORY-00284) ────
  ctx.save();
  for (let i = 0; i < 80; i++) {
    // Deterministic pseudo-random using i as seed
    const sx = ((i * 137 + 41) % W);
    const sy = ((i * 97 + 23) % H);
    const twinkle = 0.25 + 0.45 * Math.abs(Math.sin(elapsed * (0.5 + (i % 7) * 0.2) + i * 0.8));
    ctx.globalAlpha = twinkle;
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
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y > H + 50 || m.x > W + 50) { m.dead = true; continue; }
      // Trail: draw line from current pos back along velocity — longer trail (STORY-00277)
      const trailFactor = 0.28; // STORY-00283: was 0.22 — even longer, more dramatic trails
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

  // ── Phase 2: Constellation reveal (2-8s) ───────────────────
  if (elapsed >= 2 && elapsed < 8 && _mappedStars.length > 0) {
    const t2 = elapsed - 2; // 0-6s within phase
    const revealFrac = t2 / 6; // 0→1 over 6s — STORY-00283: starts at 2s (was 3s)

    const starsToShow = Math.floor(revealFrac * _mappedStars.length);
    const linesToShow = Math.floor(revealFrac * _mappedLines.length);

    // Fade in phase 2
    const phaseAlpha = Math.min(1, (elapsed - 2) * 0.8);

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
      // Sparkle burst trigger — once per star reveal (STORY-00277)
      if (!_sparkleTriggered.has(si)) {
        _sparkleTriggered.add(si);
        for (let k = 0; k < 6; k++) {
          const angle = (k * Math.PI * 2) / 6;
          _sparkles.push({ x: s.x, y: s.y, vx: Math.cos(angle) * 60, vy: Math.sin(angle) * 60, life: 20, maxLife: 20 });
        }
      }
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
    if (elapsed > 4 && _conDef) {  // STORY-00283: was elapsed>5, adjusted for earlier start
      const nameAlpha = Math.min(1, (elapsed - 4) * 1.5);
      ctx.save();
      ctx.globalAlpha = nameAlpha;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(200,190,255,0.9)';
      // STORY-00290: position below the upper constellation area
      ctx.fillText(_conDef.nameZh + '  ' + _conDef.nameEn, W / 2, H * 0.52);
      ctx.restore();
    }
  }

  // ── Phase 3: Title fade-in (8-12s) ─────────────────────────
  // STORY-00290: title in lower area (H*0.68) — upper area has constellation
  if (elapsed >= 8) {
    const t3 = elapsed - 8; // 0-4s
    const titleAlpha = Math.min(1, t3 / 1.5);
    const TY = H * 0.68;  // lower anchor for title group

    // Dim constellation for focus on title (upper area dims slightly)
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

    // ── Cosmic portal glow (STORY-00284) — 3 pulsing concentric rings around title ──
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    const pulseA = 0.5 + 0.5 * Math.sin(elapsed * 1.2);
    const pulseB = 0.5 + 0.5 * Math.sin(elapsed * 0.8 + 1.0);
    const pulseC = 0.5 + 0.5 * Math.sin(elapsed * 0.5 + 2.1);
    // Ring 1 — innermost purple (centered on title)
    const grd1 = ctx.createRadialGradient(W/2, TY, 0, W/2, TY, 70);
    grd1.addColorStop(0, `rgba(160,80,255,${(0.18 + 0.10 * pulseA).toFixed(2)})`);
    grd1.addColorStop(1, 'rgba(120,0,200,0)');
    ctx.fillStyle = grd1;
    ctx.beginPath(); ctx.arc(W/2, TY, 70, 0, TWO_PI); ctx.fill();
    // Ring 2 — mid indigo
    const grd2 = ctx.createRadialGradient(W/2, TY, 25, W/2, TY, 120);
    grd2.addColorStop(0, 'rgba(80,0,180,0)');
    grd2.addColorStop(0.5, `rgba(100,40,220,${(0.10 + 0.06 * pulseB).toFixed(2)})`);
    grd2.addColorStop(1, 'rgba(60,0,160,0)');
    ctx.fillStyle = grd2;
    ctx.beginPath(); ctx.arc(W/2, TY, 120, 0, TWO_PI); ctx.fill();
    // Ring 3 — outer violet fade
    const grd3 = ctx.createRadialGradient(W/2, TY, 60, W/2, TY, 170);
    grd3.addColorStop(0, 'rgba(60,0,140,0)');
    grd3.addColorStop(0.5, `rgba(80,20,180,${(0.06 + 0.04 * pulseC).toFixed(2)})`);
    grd3.addColorStop(1, 'rgba(40,0,100,0)');
    ctx.fillStyle = grd3;
    ctx.beginPath(); ctx.arc(W/2, TY, 170, 0, TWO_PI); ctx.fill();
    ctx.restore();

    // Outer title glow halo
    ctx.save();
    ctx.globalAlpha = titleAlpha * 0.35;
    ctx.shadowColor = '#a070ff';
    ctx.shadowBlur = 40;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c090ff';
    ctx.fillText('追  星  少  女', W / 2, TY);
    ctx.restore();

    // Title with gradient fill (STORY-00284)
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#c090ff';
    ctx.shadowBlur = 14;
    const titleGrd = ctx.createLinearGradient(W/2 - 80, TY - 25, W/2 + 80, TY + 25);
    titleGrd.addColorStop(0, '#e0d0ff');
    titleGrd.addColorStop(0.5, '#c8a8ff');
    titleGrd.addColorStop(1, '#b090ff');
    ctx.fillStyle = titleGrd;
    ctx.fillText('追  星  少  女', W / 2, TY);
    ctx.restore();

    // Decorative separator (STORY-00284)
    if (t3 > 1.2) {
      const sepAlpha = Math.min(1, (t3 - 1.2) / 0.8) * titleAlpha;
      const sepY = TY + 28;
      const sepLineW = W * 0.18;
      ctx.save();
      ctx.globalAlpha = sepAlpha * 0.65;
      ctx.strokeStyle = 'rgba(180,140,255,1)';
      ctx.lineWidth = 0.8;
      // Left line
      ctx.beginPath(); ctx.moveTo(W/2 - 14, sepY); ctx.lineTo(W/2 - sepLineW, sepY); ctx.stroke();
      // Right line
      ctx.beginPath(); ctx.moveTo(W/2 + 14, sepY); ctx.lineTo(W/2 + sepLineW, sepY); ctx.stroke();
      // Center star
      ctx.fillStyle = 'rgba(200,170,255,1)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', W/2, sepY);
      ctx.restore();
    }

    // Subtitle with upward float (STORY-00284)
    const subAlpha = Math.min(1, t3 / 2.5);
    if (subAlpha > 0) {
      // Float: starts 8px below final position, floats up over 1.5s
      const floatOffset = 8 * Math.max(0, 1 - t3 / 1.5);
      ctx.save();
      ctx.globalAlpha = subAlpha;
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(185,165,230,0.9)';
      ctx.fillText('探索88星座的奇妙旅程', W / 2, TY + 38 + floatOffset);
      ctx.restore();
    }

    // Auto-finish at 13s (suppressed when QA freeze hook is active)
    if (elapsed >= 13 && !(typeof wx !== 'undefined' && typeof wx.__introFreezeAt === 'number')) {
      _finish();
      return;
    }
  }

  // ── Sparkle particles (STORY-00277) ──────────────────────────
  if (_sparkles.length > 0) {
    ctx.save();
    for (let si = _sparkles.length - 1; si >= 0; si--) {
      const sp = _sparkles[si];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life--;
      if (sp.life <= 0) { _sparkles.splice(si, 1); continue; }
      const a = sp.life / sp.maxLife;
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Skip hint (STORY-00283) — show from frame 1 ──────────────
  if (elapsed >= 0) {
    const hintAlpha = Math.min(0.75, elapsed * 1.5); // fade in quickly
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(180,170,220,1)';
    ctx.fillText('✦ 轻触跳过', W - 16, H - (G.SAFE_BOTTOM || 8) - 8);
    ctx.restore();
  }

  // Global fade overlay (STORY-00282)
  const dt282 = 1 / 60;
  tickFade(dt282);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}
