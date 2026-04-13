// intro.js — First-run cinematic intro animation (CR-084a)
// Plays once on first visit (no 'starcatcher_intro_seen' in localStorage).
// Duration: ~12s. Three phases:
//   Phase 1 (0–3s):   Meteor shower — gold streaks diagonal across dark sky
//   Phase 2 (3–8s):   Constellation nodes appear one by one + lines draw
//   Phase 3 (8–12s):  Title "追星少女" fades in
// Skip button always visible at top-right.

import { playRevealNote } from './audio.js';

const INTRO_KEY = 'starcatcher_intro_seen';

/**
 * Play the intro animation if first visit.
 * Always resolves — never rejects.
 * @returns {Promise<void>}
 */
export function playIntro() {
  let seen = false;
  try { seen = !!localStorage.getItem(INTRO_KEY); } catch (_) { /* silently ignore */ }
  if (seen) return Promise.resolve();

  return new Promise(resolve => {
    _runIntro(() => {
      try { localStorage.setItem(INTRO_KEY, '1'); } catch (_) { /* silently ignore */ }
      resolve();
    });
  });
}

// ── Core intro runner ─────────────────────────────────────────
function _runIntro(onDone) {
  // ── Canvas overlay ──────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'intro-canvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #020510;
    pointer-events: none;
  `;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ── Skip button ─────────────────────────────────────────────
  const skipBtn = document.createElement('button');
  skipBtn.textContent = '跳过 ›';
  skipBtn.style.cssText = `
    position: fixed;
    top: 18px;
    right: 22px;
    z-index: 101;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.7);
    font-family: 'Noto Sans SC', sans-serif;
    font-size: 13px;
    padding: 5px 14px;
    border-radius: 20px;
    cursor: pointer;
    pointer-events: all;
  `;
  document.body.appendChild(skipBtn);

  let _done = false;
  function finish() {
    if (_done) return;
    _done = true;
    cancelAnimationFrame(_rafId);
    canvas.style.transition = 'opacity 0.5s ease';
    canvas.style.opacity = '0';
    skipBtn.remove();
    setTimeout(() => { canvas.remove(); onDone(); }, 500);
  }

  skipBtn.addEventListener('click', finish);

  // ── Background stars (scattered, fade in during phase 1) ───
  const BG_STARS = Array.from({ length: 90 }, (_, i) => ({
    x: (i * 97.3 + 17) % W,
    y: (i * 61.7 + 43) % H,
    r: 0.4 + (i % 4) * 0.3,
    alpha: 0,
    targetAlpha: 0.15 + (i % 5) * 0.08,
    delay: i * 18,
  }));

  // ── Meteors — diagonal streaks (top-right → bottom-left) ───
  // Staggered: first few appear quickly, last ones trail off
  const METEORS = Array.from({ length: 9 }, (_, i) => {
    // Start positions: scattered along top-right quadrant
    const startX = W * (0.55 + (i % 4) * 0.12);
    const startY = H * (0.02 + (i % 3) * 0.08);
    const speed  = 0.28 + (i % 3) * 0.08;  // fraction of screen per second
    const angle  = Math.PI * (0.58 + (i % 5) * 0.03); // ~210–225° (down-left)
    return {
      x: startX, y: startY,
      vx: Math.cos(angle) * speed * W,
      vy: Math.sin(angle) * speed * H,
      len: 80 + (i % 4) * 40,   // tail length in px
      width: 1.5 + (i % 3) * 0.8,
      delay: i * 0.28,           // seconds stagger
      duration: 0.9 + (i % 3) * 0.25,
      alpha: 0,
    };
  });

  // ── Constellation nodes (Orion belt — 4 stars, 3 lines) ───
  const NODES = [
    { x: W * 0.34, y: H * 0.44 },
    { x: W * 0.42, y: H * 0.46 },
    { x: W * 0.50, y: H * 0.44 },
    { x: W * 0.58, y: H * 0.42 },
  ];
  const LINES = [[0,1],[1,2],[2,3]];

  // ── Title ────────────────────────────────────────────────────
  let titleAlpha = 0;

  // ── Phase 2 state ─────────────────────────────────────────────
  // Each node appears at phase2Start + nodeIdx * nodeInterval
  const PHASE2_START = 3.0;
  const NODE_INTERVAL = 0.8;  // seconds between nodes appearing
  const LINE_DELAY = 0.3;     // seconds after second node before line draws

  // ── Timeline ─────────────────────────────────────────────────
  let startTime = null;
  let revealedNodes  = 0;
  let revealedLines  = 0;
  let nodeSparkleTimes = [];  // timestamp each node was revealed (for sparkle burst)
  let _rafId = 0;

  function frame(now) {
    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020510';
    ctx.fillRect(0, 0, W, H);

    // ── Background stars (fade in 0–2s) ──────────────────────
    for (const s of BG_STARS) {
      const t = Math.max(0, elapsed * 1000 - s.delay) / 1200;
      s.alpha = Math.min(s.targetAlpha, t * s.targetAlpha);
      if (s.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#c0d0ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Phase 1: Meteor shower (0–3s) ────────────────────────
    for (let mi = 0; mi < METEORS.length; mi++) {
      const m = METEORS[mi];
      const mStart = m.delay;
      const mEnd   = mStart + m.duration;

      if (elapsed < mStart || elapsed > mEnd + 0.4) continue;

      // Progress 0→1 through this meteor's lifetime
      const prog = Math.min(1, (elapsed - mStart) / m.duration);
      // Fade: quick fade-in, slower fade-out
      const fadeIn  = Math.min(1, prog / 0.2);
      const fadeOut = elapsed > mEnd ? Math.max(0, 1 - (elapsed - mEnd) / 0.4) : 1;
      m.alpha = fadeIn * fadeOut;

      // Current head position
      const hx = m.x + m.vx * (elapsed - mStart);
      const hy = m.y + m.vy * (elapsed - mStart);

      // Tail end (opposite direction of travel)
      const dist = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      const nx   = m.vx / dist;
      const ny   = m.vy / dist;
      const tx   = hx - nx * m.len;
      const ty   = hy - ny * m.len;

      ctx.save();
      ctx.globalAlpha = m.alpha;

      // Gradient: bright white/gold head → transparent tail
      const grad = ctx.createLinearGradient(hx, hy, tx, ty);
      grad.addColorStop(0, 'rgba(255,248,180,0.95)');
      grad.addColorStop(0.15, 'rgba(255,215,0,0.80)');
      grad.addColorStop(0.5,  'rgba(255,200,80,0.35)');
      grad.addColorStop(1,    'rgba(255,215,0,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth   = m.width;
      ctx.lineCap     = 'round';
      ctx.shadowColor = 'rgba(255,220,80,0.6)';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Bright glowing head dot
      ctx.shadowBlur = 12;
      ctx.fillStyle  = 'rgba(255,255,200,0.95)';
      ctx.beginPath();
      ctx.arc(hx, hy, m.width * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ── Phase 2: Constellation reveal (3–8s) ─────────────────
    if (elapsed >= PHASE2_START) {
      const p2elapsed = elapsed - PHASE2_START;

      // Reveal nodes one by one
      const shouldReveal = Math.floor(p2elapsed / NODE_INTERVAL) + 1;
      if (shouldReveal > revealedNodes && revealedNodes < NODES.length) {
        const newCount = Math.min(shouldReveal, NODES.length);
        for (let ni = revealedNodes; ni < newCount; ni++) {
          nodeSparkleTimes[ni] = elapsed;
          playRevealNote(ni, NODES.length);
        }
        revealedNodes = newCount;
      }

      // Draw revealed lines (with animated draw progress)
      const lineStartTime = PHASE2_START + NODE_INTERVAL + LINE_DELAY;
      if (elapsed >= lineStartTime) {
        const lineElapsed = elapsed - lineStartTime;
        const shouldDrawLines = Math.floor(lineElapsed / NODE_INTERVAL) + 1;
        if (shouldDrawLines > revealedLines && revealedLines < LINES.length) {
          revealedLines = Math.min(shouldDrawLines, LINES.length);
        }

        for (let li = 0; li < revealedLines; li++) {
          const [a, b] = LINES[li];
          const na = NODES[a], nb = NODES[b];

          // Animated draw: line grows from a to b over 0.5s
          const lineDrawStart = lineStartTime + li * NODE_INTERVAL;
          const drawProg = Math.min(1, (elapsed - lineDrawStart) / 0.5);
          const ex = na.x + (nb.x - na.x) * drawProg;
          const ey = na.y + (nb.y - na.y) * drawProg;

          const grad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
          grad.addColorStop(0, 'rgba(255,215,0,0.85)');
          grad.addColorStop(1, 'rgba(255,215,0,0.4)');
          ctx.save();
          ctx.strokeStyle = grad;
          ctx.lineWidth   = 1.5;
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur  = 6;
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw constellation nodes + sparkle burst
      for (let ni = 0; ni < revealedNodes; ni++) {
        const n = NODES[ni];
        const age = elapsed - (nodeSparkleTimes[ni] || elapsed);

        // Sparkle burst particles (first 0.6s)
        if (age < 0.6) {
          const burstProg = age / 0.6;
          for (let si = 0; si < 8; si++) {
            const angle = (si * Math.PI * 2) / 8;
            const dist  = burstProg * 22;
            const px    = n.x + Math.cos(angle) * dist;
            const py    = n.y + Math.sin(angle) * dist;
            ctx.save();
            ctx.globalAlpha = (1 - burstProg) * 0.8;
            ctx.fillStyle   = '#ffd700';
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // Node dot with glow
        const pulse = age < 0.3 ? (age / 0.3) : 1;
        ctx.save();
        ctx.fillStyle   = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 10 * pulse;
        ctx.globalAlpha = 0.9 * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Phase 3: Title fade-in (8–12s) ───────────────────────
    if (elapsed >= 8) {
      titleAlpha = Math.min(1, (elapsed - 8) / 1.5);
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.fillStyle   = '#e8d5ff';
      ctx.font        = `bold ${Math.round(W * 0.045)}px 'Ma Shan Zheng', serif`;
      ctx.textAlign   = 'center';
      ctx.shadowColor = '#b090ff';
      ctx.shadowBlur  = 18;
      ctx.fillText('追星少女', W * 0.5, H * 0.62);
      ctx.font      = `${Math.round(W * 0.02)}px 'Noto Sans SC', sans-serif`;
      ctx.fillStyle = 'rgba(200,200,255,0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText('StarCatcher', W * 0.5, H * 0.62 + Math.round(W * 0.035));
      ctx.restore();
    }

    // ── Auto-finish at 12s ────────────────────────────────────
    if (elapsed >= 12) {
      finish();
      return;
    }

    _rafId = requestAnimationFrame(frame);
  }

  _rafId = requestAnimationFrame(frame);
}
