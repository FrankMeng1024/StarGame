// screens/gallery.js — Constellation gallery grid + detail view
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;

let _navigate = null;

export function initGallery(navigate) {
  _navigate = navigate;
  _buildGrid();

  // Back buttons
  const btnBackMenu = document.querySelector('.btn-back-menu-from-gallery');
  if (btnBackMenu) btnBackMenu.addEventListener('click', () => navigate('menu'));

  const btnBackGallery = document.querySelector('.btn-back-gallery');
  if (btnBackGallery) btnBackGallery.addEventListener('click', () => {
    _buildGrid();
    navigate('gallery');
  });
}

export function refreshGallery(navigate) {
  _navigate = navigate;
  _buildGrid();
}

function _buildGrid() {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  grid.innerHTML = '';

  CONSTELLATIONS.forEach((con, idx) => {
    const unlocked = state.isUnlocked(idx);
    const card = document.createElement('div');
    card.className = `gallery-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.setAttribute('role', 'listitem');

    if (unlocked) {
      card.innerHTML = `
        <div class="gc-icon">${con.icon}</div>
        <div class="gc-name-zh">${con.nameZh}</div>
        <div class="gc-name-en">${con.nameEn}</div>
      `;
      card.addEventListener('click', () => _navigate && _navigate('gallery-detail', { idx }));
    } else {
      card.innerHTML = `
        <div class="gc-icon gc-locked-icon">✦</div>
        <div class="gc-name-zh gc-locked-name">${con.nameZh}</div>
        <div class="gc-name-en">${con.nameEn}</div>
        <div class="gc-unexplored">未探索</div>
      `;
    }

    grid.appendChild(card);
  });
}

export function showGalleryDetail(navigate, params) {
  const { idx } = params;
  const con = CONSTELLATIONS[idx];
  if (!con) return;

  document.querySelector('.detail-name-zh').textContent = con.nameZh;
  document.querySelector('.detail-name-en').textContent = con.nameEn;
  document.querySelector('.detail-lore-text').textContent = con.lore;

  const regionEl = document.getElementById('detail-region');
  const bestViewEl = document.getElementById('detail-best-view');
  const mainStarsEl = document.getElementById('detail-main-stars');
  if (regionEl) regionEl.textContent = con.region || '—';
  if (bestViewEl) bestViewEl.textContent = con.bestViewMonth || '—';
  if (mainStarsEl) mainStarsEl.textContent = con.mainStars || '—';

  _renderPortrait(idx, con);
}

function _renderPortrait(idx, con) {
  const canvas = document.getElementById('constellation-portrait');
  if (!canvas) return;

  const SIZE = 300;
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Scene-matched background
  const sceneIdx = Math.min(Math.floor(idx / 5), SCENE_PALETTES.length - 1);
  const scene = SCENE_PALETTES[sceneIdx];
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0,   scene.sky0);
  grad.addColorStop(0.6, scene.sky1);
  grad.addColorStop(1,   scene.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Background micro-stars
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 67.3 + idx * 11) % SIZE;
    const y = (i * 41.7 + idx * 7)  % SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 0.5, 0, TWO_PI);
    ctx.fill();
  }

  if (!con.stars || con.stars.length === 0) return;

  // Map normalized positions to canvas with padding
  const PAD  = 32;
  const AREA = SIZE - PAD * 2;
  const stars = con.stars.map(s => ({
    x: PAD + s.x * AREA,
    y: PAD + s.y * AREA,
    r: Math.min(magToRadius(s.mag), 7),
    color: typeToColor(s.type),
  }));

  // Draw constellation lines
  const lines = con.lines || [];
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(255,215,0,0.3)';
  ctx.shadowBlur = 3;
  for (const [a, b] of lines) {
    if (!stars[a] || !stars[b]) continue;
    ctx.beginPath();
    ctx.moveTo(stars[a].x, stars[a].y);
    ctx.lineTo(stars[b].x, stars[b].y);
    ctx.stroke();
  }
  ctx.restore();

  // Draw stars
  for (const s of stars) {
    // Glow
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
    grd.addColorStop(0, s.color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
    // Core
    ctx.save();
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = s.r * 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}
