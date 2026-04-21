// intro.js — 开场动画（微信小游戏版 Canvas）
// Phase 1 (0-4s):  流星雨 — gold diagonal streaks, staggered angles
// Phase 2 (4-9s):  星座节点逐一显现 + 连线从A点向B点生长
// Phase 3 (9-13s): 标题 "追星少女" 淡入
// 触摸任意位置可跳过
// 结束后调用 navigate('menu')

import { G } from '../engine/globals.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { drawFadeOverlay, tickFade, resetFade } from '../engine/canvas-utils.js';

const TWO_PI = Math.PI * 2;

// ── Module state ──────────────────────────────────────────────
let _maShanZhengLoaded = false;  // set to true once wx.loadFontFace succeeds
let _navigate  = null;
let _rafId     = null;
let _startTime = 0;
let _lastNow   = 0;
let _done      = false;

// Background starfield (3 size tiers)
let _bgStars   = [];  // {x,y,r,baseAlpha,phase,speed}

// Meteors — each fully independent
let _meteors   = [];  // {x,y,vx,vy,len,width,alpha,born,dead,angle}

// Constellation for phase 2
let _conDef    = null;
let _mappedStars = [];
let _mappedLines = [];

// Per-star reveal tracking
let _revealedCount = 0;
let _starRevealTimes = [];  // elapsed-seconds when each star was revealed

// Per-line draw progress tracking
let _lineDrawStart = [];  // elapsed-seconds when each line started drawing

// Sparkle particles
let _sparkles  = [];  // {x,y,vx,vy,life,maxLife}

// ── Public API ────────────────────────────────────────────────
export function showIntro(navigate) {
  _navigate = navigate;
  _cleanup();
  _done = false;

  // Force-clear any stuck fade overlay from previous navigation
  resetFade();

  // Load Ma Shan Zheng calligraphy font (async — Phase 3 starts at t=9s, plenty of time)
  // Wrapped in try/catch: font load failure is non-fatal, fallback to serif
  if (!_maShanZhengLoaded) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.loadFontFace === 'function') {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _maShanZhengLoaded = true; },
          fail: () => { /* network unavailable or sandbox — fallback to serif */ },
        });
      }
    } catch (e) { /* ignore — title renders in fallback serif */ }
  }

  // Cygnus (天鹅座) — sweeping Northern Cross with outstretched wings
  _conDef = CONSTELLATIONS[17]; // 天鹅座 (Cygnus)
  _buildConStars();

  // Build background starfield — 3 size tiers
  _bgStars = [];
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  // Tiny stars (105): r=0.5-0.7, dimmer
  for (let i = 0; i < 105; i++) {
    _bgStars.push({
      x: ((i * 137 + 41) % (W + 1)),
      y: ((i * 97 + 23)  % (H + 1)),
      r: 0.5 + (i % 3) * 0.1,
      baseAlpha: 0.12 + (i % 5) * 0.06,
      phase: i * 0.73,
      speed: 0.4 + (i % 7) * 0.12,
    });
  }
  // Medium stars (45): r=1.0-1.4
  for (let i = 0; i < 45; i++) {
    _bgStars.push({
      x: ((i * 211 + 83) % (W + 1)),
      y: ((i * 173 + 59) % (H + 1)),
      r: 1.0 + (i % 3) * 0.2,
      baseAlpha: 0.22 + (i % 4) * 0.08,
      phase: i * 1.17,
      speed: 0.6 + (i % 5) * 0.18,
    });
  }
  // Large/bright stars (18): r=1.8-2.4 — the "real stars you can see"
  for (let i = 0; i < 18; i++) {
    _bgStars.push({
      x: ((i * 307 + 131) % (W + 1)),
      y: ((i * 251 + 107) % (H + 1)),
      r: 1.8 + (i % 4) * 0.15,
      baseAlpha: 0.50 + (i % 3) * 0.14,
      phase: i * 2.03,
      speed: 0.3 + (i % 4) * 0.10,
    });
  }

  // Spawn meteors — each fully independent: different angle, speed, timing
  _meteors = [];
  const baseAngles = [
    Math.PI * 0.28, Math.PI * 0.32, Math.PI * 0.35,
    Math.PI * 0.29, Math.PI * 0.33, Math.PI * 0.31,
    Math.PI * 0.27, Math.PI * 0.36, Math.PI * 0.30,
  ];
  // 4 meteors appear immediately (born=0)
  for (let i = 0; i < 4; i++) {
    const angle = baseAngles[i] + (Math.random() * 0.04 - 0.02);
    _spawnMeteorFull(angle, 0);
  }
  // 5 more staggered across 0-8s
  for (let i = 4; i < 9; i++) {
    const angle = baseAngles[i] + (Math.random() * 0.06 - 0.03);
    const delay = 500 + Math.random() * 7500;
    _spawnMeteorFull(angle, delay);
  }

  _revealedCount = 0;
  _starRevealTimes = [];
  _lineDrawStart = [];
  _sparkles = [];

  G.CANVAS.addEventListener('touchstart', _onSkip);

  _startTime = 0;
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
  _bgStars = [];
  _meteors = [];
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
  // Constellation in upper-center area — large and impressive
  const SIZE = Math.min(W, H) * 0.68;
  const cx = W / 2;
  const cy = H * 0.33;
  const PAD = 16;
  const AREA = SIZE - PAD * 2;

  _mappedStars = _conDef.stars.map(s => ({
    x: cx - SIZE / 2 + PAD + s.x * AREA,
    y: cy - SIZE / 2 + PAD + s.y * AREA,
    r: Math.max(3, Math.min(9, 11 - (s.mag || 3))),  // size by magnitude: brighter=larger
  }));
  _mappedLines = _conDef.lines || [];
}

function _spawnMeteorFull(angle, delayMs) {
  const W = G.SCREEN_W;
  const H = G.SCREEN_H;
  const speed = 350 + Math.random() * 250; // 350-600 px/s — varied speeds
  _meteors.push({
    x:     Math.random() * W * 1.4 - W * 0.2,
    y:     -20 - Math.random() * H * 0.35,
    vx:    Math.cos(angle) * speed,
    vy:    Math.sin(angle) * speed,
    len:   70 + Math.random() * 90,     // tail length 70-160px
    width: 1.8 + Math.random() * 1.0,   // varied thickness
    alpha: 0.85 + Math.random() * 0.15,
    born:  delayMs,
    dead:  false,
  });
}

function _loop(now) {
  if (_done) return;
  if (_startTime === 0) _startTime = now;
  const dt = _lastNow > 0 ? Math.min((now - _lastNow) / 1000, 0.05) : 1 / 60;
  _lastNow = now;

  // QA FREEZE HOOK: wx.__introFreezeAt = N freezes animation at N seconds
  // DEV_FREEZE: set to a number to hard-freeze for screenshot capture (remove before commit)
  const _DEV_FREEZE = 0; // 0 = disabled
  let elapsed = (now - _startTime) / 1000;
  if (_DEV_FREEZE > 0) {
    elapsed = _DEV_FREEZE;
  } else if (typeof wx !== 'undefined' && typeof wx.__introFreezeAt === 'number') {
    elapsed = wx.__introFreezeAt;
  }

  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;
  const elapsedMs = now - _startTime;

  // ── Clear — deep space black ──────────────────────────────────
  ctx.fillStyle = '#020510';
  ctx.fillRect(0, 0, W, H);

  // ── Background starfield — 3 size tiers, all twinkling independently ──
  ctx.save();
  for (const s of _bgStars) {
    // Independent twinkle per star using its own phase and speed
    const twinkle = s.baseAlpha * (0.55 + 0.45 * Math.sin(elapsed * s.speed + s.phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = s.r > 1.5 ? '#d0e0ff' : '#ffffff'; // large stars slightly blue-white
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();

  // ── Phase 1: Meteor shower (0–5s) ─────────────────────────────
  if (elapsed < 5) {
    // Occasionally spawn more meteors if count is low
    const alive = _meteors.filter(m => !m.dead).length;
    if (alive < 3 && Math.random() < 0.06) {
      const angle = Math.PI * (0.27 + Math.random() * 0.10);
      _spawnMeteorFull(angle, elapsedMs);
    }
  }
  // Draw all active meteors (they can still be visible after 5s)
  for (const m of _meteors) {
    if (m.dead || elapsedMs < m.born) continue;
    const age = (elapsedMs - m.born) / 1000;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.y > H + 60 || m.x > W + 60 || m.x < -W * 0.5) { m.dead = true; continue; }

    // Fade out with age
    const fadeA = m.alpha * Math.max(0, 1 - age * 0.2);
    if (fadeA < 0.02) { m.dead = true; continue; }

    // Trail: bright head → transparent tail
    const dist = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
    const nx = m.vx / dist, ny = m.vy / dist;
    const tx = m.x - nx * m.len;
    const ty = m.y - ny * m.len;

    ctx.save();
    const grd = ctx.createLinearGradient(m.x, m.y, tx, ty);
    grd.addColorStop(0,    `rgba(255,248,180,${(fadeA).toFixed(2)})`);
    grd.addColorStop(0.12, `rgba(255,215,0,${(fadeA * 0.80).toFixed(2)})`);
    grd.addColorStop(0.5,  `rgba(255,200,80,${(fadeA * 0.30).toFixed(2)})`);
    grd.addColorStop(1,    'rgba(255,215,0,0)');
    ctx.strokeStyle = grd;
    ctx.lineWidth   = m.width;
    ctx.lineCap     = 'round';
    ctx.shadowColor = 'rgba(255,220,80,0.5)';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Bright glowing head dot
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = 'rgba(255,255,200,0.9)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.width * 1.4, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  // ── Phase 2: Constellation reveal (3–9s) ──────────────────────
  if (elapsed >= 3 && _mappedStars.length > 0) {
    // Star reveal: one new star every 0.45s
    const STAR_INTERVAL = 0.45;
    const PHASE2_START  = 3.0;
    const p2e = elapsed - PHASE2_START;

    const shouldReveal = Math.min(
      Math.floor(p2e / STAR_INTERVAL) + 1,
      _mappedStars.length
    );
    while (_revealedCount < shouldReveal) {
      // Record when this star was revealed (backdate to actual reveal time, not current elapsed)
      _starRevealTimes[_revealedCount] = PHASE2_START + _revealedCount * STAR_INTERVAL;
      // Sparkle burst on reveal
      const s = _mappedStars[_revealedCount];
      for (let k = 0; k < 8; k++) {
        const ang = (k * TWO_PI) / 8 + Math.random() * 0.3;
        const spd = 60 + Math.random() * 60;
        _sparkles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 30, maxLife: 30 });
      }
      _revealedCount++;
    }

    // Line reveal: after 2 stars are shown, lines start drawing
    // Each line starts when BOTH its endpoint stars are revealed, + 0.15s delay
    for (let li = 0; li < _mappedLines.length; li++) {
      if (_lineDrawStart[li] !== undefined) continue; // already started
      const [a, b] = _mappedLines[li];
      if (a < _revealedCount && b < _revealedCount) {
        // Both endpoints revealed — schedule line draw at max reveal time + 0.15s
        const revealA = _starRevealTimes[a] || 0;
        const revealB = _starRevealTimes[b] || 0;
        _lineDrawStart[li] = Math.max(revealA, revealB) + 0.15;
      }
    }

    // Draw lines with growth animation
    ctx.save();
    for (let li = 0; li < _mappedLines.length; li++) {
      if (_lineDrawStart[li] === undefined) continue;
      const [a, b] = _mappedLines[li];
      if (!_mappedStars[a] || !_mappedStars[b]) continue;
      const sa = _mappedStars[a], sb = _mappedStars[b];
      // Line grows from A toward B over 0.5s
      const prog = Math.min(1, (elapsed - _lineDrawStart[li]) / 0.5);
      if (prog <= 0) continue;
      const ex = sa.x + (sb.x - sa.x) * prog;
      const ey = sa.y + (sb.y - sa.y) * prog;

      const grad = ctx.createLinearGradient(sa.x, sa.y, sb.x, sb.y);
      grad.addColorStop(0, 'rgba(255,215,0,0.90)');
      grad.addColorStop(1, 'rgba(255,215,0,0.45)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = 'rgba(255,215,0,0.7)';
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // Draw revealed stars
    ctx.save();
    for (let si = 0; si < _revealedCount; si++) {
      const s   = _mappedStars[si];
      const age = elapsed - (_starRevealTimes[si] || elapsed);

      // Pulse effect at reveal (first 0.4s)
      const pulse = age < 0.4 ? (age / 0.4) : 1.0;
      const scale = age < 0.25 ? (1.0 + 0.8 * Math.sin(age / 0.25 * Math.PI)) : 1.0;

      // Glow
      ctx.save();
      ctx.globalAlpha = 0.45 * pulse;
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
      grd.addColorStop(0, '#ffd700');
      grd.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.5, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      // Core star
      ctx.globalAlpha = 0.9 * pulse;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 12 * pulse;
      ctx.fillStyle   = '#fff8dc';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * scale, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();

    // ── NO constellation name text — intentionally removed ──
  }

  // ── Phase 3: Title fade-in (9–13s) ────────────────────────────
  if (elapsed >= 9) {
    const t3 = elapsed - 9;
    const titleAlpha = Math.min(1, t3 / 1.5);
    const TY = H * 0.72;  // lower area — constellation stays in upper area

    // Keep constellation visible but slightly dimmed
    // (already drawn above — no re-draw needed)

    // Outer title glow halo
    ctx.save();
    ctx.globalAlpha = titleAlpha * 0.38;
    ctx.shadowColor = '#b090ff';
    ctx.shadowBlur  = 36;
    const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
    ctx.font = `bold ${Math.round(W * 0.045)}px ${titleFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8d5ff';
    ctx.fillText('追星少女', W / 2, TY);
    ctx.restore();

    // Title — plain light-purple, calligraphy font (matches Web intro.js)
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.font = `bold ${Math.round(W * 0.045)}px ${titleFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#b090ff';
    ctx.shadowBlur  = 18;
    ctx.fillStyle = '#e8d5ff';
    ctx.fillText('追星少女', W / 2, TY);
    ctx.restore();

    // StarCatcher subtitle (matches Web intro.js)
    ctx.save();
    ctx.globalAlpha = titleAlpha * 0.85;
    ctx.font = `${Math.round(W * 0.02)}px 'Noto Sans SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(200,200,255,0.7)';
    ctx.fillText('StarCatcher', W / 2, TY + Math.round(W * 0.035));
    ctx.restore();

    // Auto-finish at 14s
    if (elapsed >= 14 && !(typeof wx !== 'undefined' && typeof wx.__introFreezeAt === 'number')) {
      _finish();
      return;
    }
  }

  // ── Sparkle particles ─────────────────────────────────────────
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
      ctx.fillStyle   = '#ffd700';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Skip hint ─────────────────────────────────────────────────
  {
    const hintAlpha = Math.min(0.70, elapsed * 1.5);
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(180,170,220,1)';
    ctx.fillText('✦ 轻触跳过', W - 16, H - (G.SAFE_BOTTOM || 8) - 8);
    ctx.restore();
  }

  // Global fade overlay
  tickFade(1 / 60);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
}
