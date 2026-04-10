// screens/gallery.js — Constellation gallery grid + detail view
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';

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

  document.querySelector('.detail-icon').textContent  = con.icon;
  document.querySelector('.detail-name-zh').textContent = con.nameZh;
  document.querySelector('.detail-name-en').textContent = con.nameEn;
  document.querySelector('.detail-lore-text').textContent = con.lore;
}
