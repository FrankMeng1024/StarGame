// intro.js — First-run cinematic intro animation (CR-072 / STORY-00118)
// Plays once on first visit (no 'starcatcher_intro_seen' in localStorage).
// Duration: ~12s. Three phases:
//   Phase 1 (0-2s):   Stars drift in from dark
//   Phase 2 (2-6s):   Net sweeps in from right, catches a gold star, particle burst
//   Phase 3 (6-12s):  4 constellation lines light up sequentially, title fades in
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
    // Fade out
    canvas.style.transition = 'opacity 0.5s ease';
    canvas.style.opacity = '0';
    skipBtn.remove();
    setTimeout(() => { canvas.remove(); onDone(); }, 500);
  }

  skipBtn.addEventListener('click', finish);

  // ── Background stars (phase 1 seed) ─────────────────────────
  const BG_STARS = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 97.3 + 17) % W,
    y: (i * 61.7 + 43) % H,
    r: 0.4 + (i % 4) * 0.3,
    alpha: 0,
    targetAlpha: 0.2 + (i % 5) * 0.1,
    delay: i * 20,   // ms stagger
  }));

  // ── Gold target star (center-ish) ────────────────────────────
  const STAR_X = W * 0.48;
  const STAR_Y = H * 0.42;

  // ── Simple Orion belt (4 nodes, 3 lines) for phase 3 ─────────
  const NODES = [
    { x: W * 0.34, y: H * 0.44 },
    { x: W * 0.42, y: H * 0.46 },
    { x: W * 0.50, y: H * 0.44 },
    { x: W * 0.58, y: H * 0.42 },
  ];
  const LINES = [[0,1],[1,2],[2,3]];

  // ── Net state ────────────────────────────────────────────────
  // Sweeps from right edge inward, then "catches" the target star
  let netX = W + 100;
  let netY = H * 0.35;
  const NET_TARGET_X = STAR_X + 10;
  const NET_TARGET_Y = STAR_Y - 10;

  // ── Particles ────────────────────────────────────────────────
  const particles = [];
  function _spawnParticles(cx, cy) {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: 1.5 + Math.random() * 2,
        color: Math.random() < 0.6 ? '#ffd700' : '#ffffff',
      });
    }
  }

  // ── Title ────────────────────────────────────────────────────
  let titleAlpha = 0;

  // ── Bouncing star character (appears in phase 1, ~0.5s in) ───
  // A cute 5-pointed star that bounces up from bottom-center
  const BOUNCE_STAR = {
    x: W * 0.5,
    baseY: H * 0.72,
    alpha: 0,
  };

  // ── Timeline state ───────────────────────────────────────────
  let startTime = null;
  let caught    = false;
  let linesDrawn = 0;
  let lastLineTime = 0;
  let _rafId    = 0;

  function frame(now) {
    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000; // seconds

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020510';
    ctx.fillRect(0, 0, W, H);

    // ── Phase 1: stars drift in (0–2s) ─────────────────────────
    for (const s of BG_STARS) {
      const t = Math.max(0, elapsed * 1000 - s.delay) / 800;
      s.alpha = Math.min(s.targetAlpha, t * s.targetAlpha);
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#c0d0ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Bouncing star character (phase 1: 0.5s–2s) ───────────────
    if (elapsed >= 0.5 && elapsed < 6) {
      BOUNCE_STAR.alpha = Math.min(1, (elapsed - 0.5) / 0.6);
      // Gentle bounce: oscillates up/down
      const bounce = Math.sin(elapsed * 4.5) * 14 + Math.sin(elapsed * 2.1) * 6;
      const sy = BOUNCE_STAR.baseY + bounce;
      // Fade out as net approaches (after t=4s)
      const fadeOut = elapsed > 4 ? Math.max(0, 1 - (elapsed - 4) / 1.5) : 1;
      _drawBouncingStar(ctx, BOUNCE_STAR.x, sy, 18, BOUNCE_STAR.alpha * fadeOut, elapsed);
    }

    // ── Phase 2: net sweep + catch (2–6s) ────────────────────────
    if (elapsed >= 2 && elapsed < 6) {
      const t = (elapsed - 2) / 4; // 0→1 over 4s
      const catchT = 0.55; // net arrives at star at t=0.55

      if (t < catchT) {
        // Net sweeps from right edge to target
        const prog = t / catchT;
        const eased = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
        netX = W + 100 + (NET_TARGET_X - W - 100) * eased;
        netY = H * 0.35 + (NET_TARGET_Y - H * 0.35) * eased;
      } else if (!caught) {
        caught = true;
        netX = NET_TARGET_X;
        netY = NET_TARGET_Y;
        _spawnParticles(STAR_X, STAR_Y);
        // Small audio ting
        playRevealNote(0, 4);
      }

      _drawNet(ctx, netX, netY, 40);

      // Draw gold target star (fades after catch)
      if (!caught) {
        const pulse = 0.7 + 0.3 * Math.sin(elapsed * 8);
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12 * pulse;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(STAR_X, STAR_Y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Particles ────────────────────────────────────────────────
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.alpha -= 0.025;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Phase 3: constellation lines light up (6–12s) ────────────
    if (elapsed >= 6) {
      const lineT = elapsed - 6;
      const lineInterval = 0.9; // seconds between lines
      const nextLineIdx = Math.floor(lineT / lineInterval);

      if (nextLineIdx > linesDrawn && linesDrawn < LINES.length) {
        linesDrawn = Math.min(nextLineIdx, LINES.length);
        // Play note for each newly revealed line
        for (let li = linesDrawn - 1; li < linesDrawn; li++) {
          if (li < LINES.length) playRevealNote(li, LINES.length);
        }
      }

      // Draw revealed lines
      for (let li = 0; li < linesDrawn; li++) {
        const [a, b] = LINES[li];
        const na = NODES[a], nb = NODES[b];
        const grad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
        grad.addColorStop(0, 'rgba(255,215,0,0.85)');
        grad.addColorStop(1, 'rgba(255,215,0,0.4)');
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw constellation nodes
      NODES.forEach((n, ni) => {
        const revealed = LINES.some(([a, b], li) => li < linesDrawn && (a === ni || b === ni));
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = revealed ? 10 : 0;
        ctx.globalAlpha = revealed ? 0.9 : 0.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Title fade-in at 8s
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
    }

    // ── Auto-finish at 12s ────────────────────────────────────────
    if (elapsed >= 12) {
      finish();
      return;
    }

    _rafId = requestAnimationFrame(frame);
  }

  _rafId = requestAnimationFrame(frame);
}

// ── Draw cute bouncing 5-pointed star ────────────────────────
function _drawBouncingStar(ctx, x, y, r, alpha, t) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer glow halo
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
  grd.addColorStop(0, 'rgba(255,230,80,0.55)');
  grd.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 5-pointed star shape
  const spikes = 5;
  const outerR = r;
  const innerR = r * 0.42;
  // Slight wobble rotation for personality
  const rot = Math.sin(t * 1.8) * 0.12 - Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = rot + (i * Math.PI) / spikes;
    const radius = i % 2 === 0 ? outerR : innerR;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = r * 1.8;
  ctx.fill();

  // Small sparkle dots around the star (3 tiny dots)
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,200,0.85)';
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * Math.PI * 2) / 3 + t * 2;
    const d = r * 1.7;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
// Net: round pouch (arc) + mesh grid inside + rope handle
function _drawNet(ctx, x, y, size) {
  const s = size;
  ctx.save();
  ctx.strokeStyle = 'rgba(220, 200, 255, 0.80)';
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = 'rgba(200,180,255,0.7)';
  ctx.shadowBlur  = 8;

  // Round bag opening (flat top arc)
  ctx.beginPath();
  ctx.arc(x, y + s * 0.25, s * 0.45, Math.PI, 0);
  ctx.stroke();

  // Bag bottom (full arc closing the pouch)
  ctx.beginPath();
  ctx.arc(x, y + s * 0.25, s * 0.45, 0, Math.PI);
  ctx.stroke();

  // Mesh lines inside (horizontal + vertical) — subtle
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  // Vertical center line
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.2);
  ctx.lineTo(x, y + s * 0.7);
  ctx.stroke();
  // Horizontal mid line
  ctx.beginPath();
  ctx.moveTo(x - s * 0.4, y + s * 0.25);
  ctx.lineTo(x + s * 0.4, y + s * 0.25);
  ctx.stroke();

  // Rope handle (curves up-right)
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.35, y - s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.65, y - s * 0.5, x + s * 0.55, y - s * 0.95);
  ctx.stroke();

  ctx.restore();
}
