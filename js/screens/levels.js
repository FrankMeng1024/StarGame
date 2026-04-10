// screens/levels.js — Level select screen
import { CONSTELLATIONS } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../state.js';

export function initLevels(navigate) {
  const screen = document.getElementById('screen-levels');
  const grid   = screen.querySelector('.level-grid');
  const backBtn = screen.querySelector('.btn-back-menu');

  backBtn.addEventListener('click', () => navigate('menu'));

  // Apply scene background based on current progress
  _applyLevelsBackground();

  // Build level cards
  CONSTELLATIONS.forEach((c, idx) => {
    const card = document.createElement('div');
    const unlocked = state.isUnlocked(idx);
    card.className = `level-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.dataset.idx = idx;

    const difficulty = '★'.repeat(c.difficulty) + '☆'.repeat(5 - c.difficulty);
    const score = state.getScore(idx);
    const scoreStars = score ? '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars) : '';
    const bestTime = score ? `<span class="card-best-time">最佳: ${Math.ceil(score.time)}秒</span>` : '';
    card.innerHTML = `
      <span class="card-num">${idx + 1}</span>
      ${unlocked ? '<span class="unlock-badge"></span>' : ''}
      <span class="card-icon">${c.icon}</span>
      <span class="card-name-zh">${c.nameZh}</span>
      <span class="card-name-en">${c.nameEn}</span>
      <span class="card-stars">${difficulty}</span>
      ${scoreStars ? `<span class="card-score-stars">${scoreStars}</span>` : ''}
      ${bestTime}
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
  _applyLevelsBackground();
  const cards = document.querySelectorAll('.level-card');
  cards.forEach(card => {
    const idx = parseInt(card.dataset.idx, 10);
    const unlocked = state.isUnlocked(idx);
    const c = CONSTELLATIONS[idx];
    const score = state.getScore(idx);
    const scoreStars = score ? '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars) : '';
    const bestTime = score ? `<span class="card-best-time">最佳: ${Math.ceil(score.time)}秒</span>` : '';
    const stars = '★'.repeat(c.difficulty) + '☆'.repeat(5 - c.difficulty);

    if (unlocked && card.classList.contains('locked')) {
      // Newly unlocked — full re-render
      card.className = 'level-card unlocked';
      card.innerHTML = `
        <span class="card-num">${idx + 1}</span>
        <span class="unlock-badge"></span>
        <span class="card-icon">${c.icon}</span>
        <span class="card-name-zh">${c.nameZh}</span>
        <span class="card-name-en">${c.nameEn}</span>
        <span class="card-stars">${stars}</span>
        ${scoreStars ? `<span class="card-score-stars">${scoreStars}</span>` : ''}
        ${bestTime}
      `;
      card.addEventListener('click', () => {
        state.currentLevel = idx;
        card.dispatchEvent(new CustomEvent('level-select', { detail: idx, bubbles: true }));
      });
    } else if (unlocked) {
      // Already unlocked — update score display only
      const existingScore = card.querySelector('.card-score-stars');
      const existingBest  = card.querySelector('.card-best-time');
      if (existingScore) existingScore.remove();
      if (existingBest)  existingBest.remove();
      const starsEl = card.querySelector('.card-stars');
      if (starsEl) {
        if (scoreStars) {
          const ss = document.createElement('span');
          ss.className = 'card-score-stars';
          ss.textContent = scoreStars;
          starsEl.after(ss);
          if (bestTime) ss.insertAdjacentHTML('afterend', bestTime);
        } else if (bestTime) {
          starsEl.insertAdjacentHTML('afterend', bestTime);
        }
      }
    }
  });
}

function _applyLevelsBackground() {
  const screen = document.getElementById('screen-levels');
  if (!screen) return;
  // Determine scene from highest unlocked level index
  const maxIdx = Math.max(...Array.from(state.unlockedLevels));
  const sceneIdx = Math.min(Math.floor(maxIdx / 5), SCENE_PALETTES.length - 1);
  const scene = SCENE_PALETTES[sceneIdx];
  screen.style.background = `linear-gradient(180deg, ${scene.sky0} 0%, ${scene.sky1} 60%, ${scene.sky2} 100%)`;
}
