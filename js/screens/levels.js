// screens/levels.js — Level select screen
import { CONSTELLATIONS } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../state.js';
import { showItemSelect } from './item-select.js';
import { CONSTELLATION_PHOTOS } from '../data/photos.js?v=29';

// CR-065/069/086: Pre-warm all game assets at module load. Store refs to prevent GC.
// Export sprite map so game.js can reuse the SAME objects (already decoded).
const _prewarmedImages = [];
const _spriteCache = {};      // src → HTMLImageElement
const _decodeCache  = {};     // src → Promise<HTMLImageElement> (resolved once, reused)

(function _prewarmAssets() {
  const SPRITE_SRCS = [
    'assets/sprites/girl.svg',
    'assets/sprites/net.svg',
    'assets/sprites/debris-meteor.svg',
    'assets/sprites/debris-satellite.svg',
    'assets/sprites/debris-rocket.svg',
    'assets/sprites/debris-cloth.svg',
  ];
  SPRITE_SRCS.forEach(src => {
    const img = new Image();
    // Kick off decode immediately once the network fetch completes.
    // Store the promise so getSpriteReady() returns it instantly — no re-decode.
    _decodeCache[src] = new Promise(resolve => {
      img.onload  = () => img.decode().catch(() => {}).then(() => resolve(img));
      img.onerror = () => resolve(img); // resolve even on error so game can start
    });
    img.src = src;
    _prewarmedImages.push(img);
    _spriteCache[src] = img;
  });

  // Gallery astrophotography images — preload all so gallery opens without delay
  Object.values(CONSTELLATION_PHOTOS).flat().forEach(p => {
    const img = new Image(); img.src = p.url; _prewarmedImages.push(img);
  });
})();

// Returns a Promise that resolves when all 6 sprite SVGs are fully decoded.
// CR-072: exported so game.js can call this after level complete to ensure
// sprites are warm before the user can enter the next level.
const _SPRITE_SRCS = [
  'assets/sprites/girl.svg',
  'assets/sprites/net.svg',
  'assets/sprites/debris-meteor.svg',
  'assets/sprites/debris-satellite.svg',
  'assets/sprites/debris-rocket.svg',
  'assets/sprites/debris-cloth.svg',
];
export function prewarmSprites() {
  return Promise.all(_SPRITE_SRCS.map(src => getSpriteReady(src)));
}

// Returns a Promise<HTMLImageElement> for a sprite src, reusing the decode promise
// created at module load — so decode() is never called twice for the same sprite.
export function getSpriteReady(src) {
  // Fast path: return the already-resolving (or resolved) decode promise
  if (_decodeCache[src]) return _decodeCache[src];

  // Fallback for any src not pre-warmed (shouldn't happen in normal flow)
  const img = new Image();
  img.src = src;
  _decodeCache[src] = new Promise(resolve => {
    img.onload  = () => img.decode().catch(() => {}).then(() => resolve(img));
    img.onerror = () => resolve(img);
  });
  _spriteCache[src] = img;
  return _decodeCache[src];
}

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
      <span class="card-stars">
        <span class="card-diff-label">难度</span>
        <span class="card-diff-bar-wrap"><span class="card-diff-bar" style="width:${diffPct}%;background:${diffColor}"></span></span>
      </span>
      ${scoreStars ? `<span class="card-score-stars">${scoreStars}</span>` : ''}
      ${bestTime}
      ${!unlocked ? '<span class="lock-icon">🔒</span>' : ''}
    `;

    grid.appendChild(card);
  });

  // CR-072: Wait for sprites to be fully decoded before enabling level card
  // click handlers. This ensures level 1 is instant even on first page load
  // (before _prewarmAssets() IIFE has finished loading the SVG files).
  // prewarmSprites() resolves in the same microtask when sprites are already
  // complete, so there is zero added delay for returning visits.
  prewarmSprites().then(() => {
    grid.querySelectorAll('.level-card.unlocked').forEach(card => {
      const idx = parseInt(card.dataset.idx, 10);
      card.addEventListener('click', () => {
        state.currentLevel = idx;
        showItemSelect(() => navigate('game'), () => navigate('levels'));
      });
    });
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
