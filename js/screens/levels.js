// screens/levels.js — Level select screen
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';

export function initLevels(navigate) {
  const screen = document.getElementById('screen-levels');
  const grid   = screen.querySelector('.level-grid');
  const backBtn = screen.querySelector('.btn-back-menu');

  backBtn.addEventListener('click', () => navigate('menu'));

  // Build level cards
  CONSTELLATIONS.forEach((c, idx) => {
    const card = document.createElement('div');
    const unlocked = state.isUnlocked(idx);
    card.className = `level-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.dataset.idx = idx;

    const stars = '★'.repeat(c.difficulty) + '☆'.repeat(5 - c.difficulty);
    card.innerHTML = `
      <span class="card-num">${idx + 1}</span>
      ${unlocked ? '<span class="unlock-badge"></span>' : ''}
      <span class="card-icon">${c.icon}</span>
      <span class="card-name-zh">${c.nameZh}</span>
      <span class="card-name-en">${c.nameEn}</span>
      <span class="card-stars">${stars}</span>
      ${!unlocked ? '<span class="lock-icon">🔒</span>' : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        state.currentLevel = idx;
        navigate('game');
      });
    }

    grid.appendChild(card);
  });
}

export function refreshLevels() {
  const cards = document.querySelectorAll('.level-card');
  cards.forEach(card => {
    const idx = parseInt(card.dataset.idx, 10);
    const unlocked = state.isUnlocked(idx);
    if (unlocked && card.classList.contains('locked')) {
      // Re-render card as unlocked
      card.className = 'level-card unlocked';
      const c = CONSTELLATIONS[idx];
      const stars = '★'.repeat(c.difficulty) + '☆'.repeat(5 - c.difficulty);
      card.innerHTML = `
        <span class="card-num">${idx + 1}</span>
        <span class="unlock-badge"></span>
        <span class="card-icon">${c.icon}</span>
        <span class="card-name-zh">${c.nameZh}</span>
        <span class="card-name-en">${c.nameEn}</span>
        <span class="card-stars">${stars}</span>
      `;
      card.addEventListener('click', () => {
        state.currentLevel = idx;
        // navigate is captured in closure but not available here, use event
        card.dispatchEvent(new CustomEvent('level-select', { detail: idx, bubbles: true }));
      });
    }
  });
}
