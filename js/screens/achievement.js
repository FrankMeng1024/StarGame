// screens/achievement.js — Full-completion achievement screen (CR-071 / STORY-00117)
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;

export function showAchievement(navigate) {
  const screen = document.getElementById('screen-achievement');
  if (!screen) return;

  // ── Badge animation ──────────────────────────────────────────
  const badgeEl = screen.querySelector('.achievement-badge');
  if (badgeEl) {
    badgeEl.style.animation = 'none';
    // Force reflow so animation restarts each visit
    void badgeEl.offsetWidth;
    badgeEl.style.animation = '';
  }

  // ── Build constellation grid ──────────────────────────────────
  const grid = screen.querySelector('.achievement-grid');
  if (!grid) return;
  grid.innerHTML = '';

  CONSTELLATIONS.forEach((con, idx) => {
    const done = state.hasCompleted(idx);
    const card = document.createElement('div');
    card.className = 'ach-card' + (done ? ' ach-card--done' : '');
    card.title = `${con.nameZh} · ${con.nameEn}`;

    const canvas = document.createElement('canvas');
    canvas.width  = 64;
    canvas.height = 64;
    canvas.className = 'ach-canvas';
    _drawMiniConstellation(canvas, con, done);

    const label = document.createElement('div');
    label.className = 'ach-label';
    label.textContent = con.nameZh;

    card.appendChild(canvas);
    card.appendChild(label);
    grid.appendChild(card);
  });

  // ── Progress badge count ──────────────────────────────────────
  const doneCount = Array.from({ length: 30 }, (_, i) => i).filter(i => state.hasCompleted(i)).length;
  const countEl = screen.querySelector('.achievement-count');
  if (countEl) countEl.textContent = `${doneCount}/30 ★`;

  // ── Back button ───────────────────────────────────────────────
  const btnBack = screen.querySelector('.btn-ach-back');
  if (btnBack) btnBack.onclick = () => navigate('menu');
}

// ── Draw small constellation icon ─────────────────────────────
function _drawMiniConstellation(canvas, con, done) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = 10;
  const AREA = W - PAD * 2;

  ctx.fillStyle = done ? '#07122a' : '#0a0d1a';
  ctx.fillRect(0, 0, W, H);

  const stars = con.stars.map(s => ({
    x: PAD + s.x * AREA,
    y: PAD + s.y * AREA,
    r: Math.max(1, Math.min(3.5, magToRadius(s.mag) * 0.45)),
    color: done ? typeToColor(s.type) : 'rgb(120,130,160)',
  }));

  // Lines
  if (con.lines) {
    ctx.strokeStyle = done ? 'rgba(255,215,0,0.5)' : 'rgba(180,190,220,0.2)';
    ctx.lineWidth = 0.8;
    for (const [a, b] of con.lines) {
      const sa = stars[a], sb = stars[b];
      if (!sa || !sb) continue;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
  }

  // Stars
  for (const s of stars) {
    ctx.save();
    ctx.fillStyle   = s.color;
    if (done) {
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = s.r * 3;
    }
    ctx.globalAlpha = done ? 1 : 0.35;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}
