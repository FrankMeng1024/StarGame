// screens/levels.js — Level select screen
import { CONSTELLATIONS } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../state.js';
import { showItemSelect } from './item-select.js';

export function initLevels(navigate) {
  const screen = document.getElementById('screen-levels');
  const grid   = screen.querySelector('.level-grid');
  const backBtn = screen.querySelector('.btn-back-menu');

  backBtn.addEventListener('click', () => navigate('menu'));

  const shopBtn = screen.querySelector('.btn-shop-from-levels');
  if (shopBtn) shopBtn.addEventListener('click', () => navigate('shop', { from: 'levels' }));

  // Apply scene background based on current progress
  _applyLevelsBackground();

  // Build level cards — no scene dividers (clean 6×5 grid)
  CONSTELLATIONS.forEach((c, idx) => {
    const unlocked = state.isUnlocked(idx);
    const card = document.createElement('div');
    card.className = `level-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.dataset.idx = idx;

    const diffPct = (c.difficulty / 5 * 100).toFixed(0);
    const diffColor = c.difficulty <= 2 ? '#4cde80' : c.difficulty === 3 ? '#ffb830' : '#ff5555';
    const score = state.getScore(idx);
    const scoreStars = score ? `最佳: ${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}` : '';
    const bestTime = score ? `<span class="card-best-time">最佳: ${Math.ceil(score.time)}秒</span>` : '';
    card.innerHTML = `
      <span class="card-num">${idx + 1}</span>
      ${unlocked ? '<span class="unlock-badge"></span>' : ''}
      <span class="card-icon">${c.icon}</span>
      <span class="card-name-zh">${c.nameZh}</span>
      <span class="card-name-en">${c.nameEn}</span>
      <span class="card-stars">
        <span class="card-diff-label">难度</span>
        <span class="card-diff-bar-wrap"><span class="card-diff-bar" style="width:${diffPct}%;background:${diffColor}"></span></span>
      </span>
      ${scoreStars ? `<span class="card-score-stars">${scoreStars}</span>` : ''}
      ${bestTime}
      ${!unlocked ? '<span class="lock-icon">🔒</span>' : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        state.currentLevel = idx;
        showItemSelect(() => navigate('game'));
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
    const scoreStars = score ? `最佳: ${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}` : '';
    const bestTime = score ? `<span class="card-best-time">最佳: ${Math.ceil(score.time)}秒</span>` : '';
    const diffPct = (c.difficulty / 5 * 100).toFixed(0);
    const diffColor = c.difficulty <= 2 ? '#4cde80' : c.difficulty === 3 ? '#ffb830' : '#ff5555';
    const diffBar = `<span class="card-diff-label">难度</span><span class="card-diff-bar-wrap"><span class="card-diff-bar" style="width:${diffPct}%;background:${diffColor}"></span></span>`;

    if (unlocked && card.classList.contains('locked')) {
      // Newly unlocked — full re-render
      card.className = 'level-card unlocked';
      card.innerHTML = `
        <span class="card-num">${idx + 1}</span>
        <span class="unlock-badge"></span>
        <span class="card-icon">${c.icon}</span>
        <span class="card-name-zh">${c.nameZh}</span>
        <span class="card-name-en">${c.nameEn}</span>
        <span class="card-stars">${diffBar}</span>
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
  // Determine scene from highest unlocked level index (default 0 if set is empty)
  const maxIdx = state.unlockedLevels.size > 0 ? Math.max(...Array.from(state.unlockedLevels)) : 0;
  const sceneIdx = Math.min(Math.floor(maxIdx / 5), SCENE_PALETTES.length - 1);
  const scene = SCENE_PALETTES[sceneIdx];
  screen.style.background = `linear-gradient(180deg, ${scene.sky0} 0%, ${scene.sky1} 60%, ${scene.sky2} 100%)`;
}
