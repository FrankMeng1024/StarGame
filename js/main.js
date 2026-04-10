// main.js — app entry point, screen router, cursor
import state from './state.js';
import { initStarfield } from './starfield.js';
import { initMenu } from './screens/menu.js';
import { initLevels } from './screens/levels.js';
import { startGame, stopGame } from './screens/game.js';
import { showComplete, showFail } from './screens/complete.js';

// ── Custom star cursor ─────────────────────────────────────────
function initCursor() {
  const cursor = document.getElementById('star-cursor');
  if (!cursor) return;
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });
  document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
}

// ── Screen navigation ──────────────────────────────────────────
const SCREENS = ['menu', 'levels', 'game', 'complete', 'gallery'];

function showScreen(id) {
  for (const sid of SCREENS) {
    const el = document.getElementById(`screen-${sid}`);
    if (el) el.classList.toggle('active', sid === id);
  }
}

function navigate(screen, params = {}) {
  // Stop game if leaving game screen
  if (screen !== 'game') stopGame();

  showScreen(screen === 'complete' || screen === 'fail' ? 'complete' : screen);

  if (screen === 'game') {
    startGame(navigate);
  } else if (screen === 'complete') {
    showComplete(navigate, params);
  } else if (screen === 'fail') {
    showFail(navigate, params);
  }
}

// ── Init ───────────────────────────────────────────────────────
function init() {
  state.load();
  initCursor();
  initStarfield('star-canvas');
  initMenu(navigate);
  initLevels(navigate);

  // Level-select event from refreshed cards
  document.addEventListener('level-select', e => {
    state.currentLevel = e.detail;
    navigate('game');
  });

  // Expose navigate for test verification only
  window.__navigate = navigate;

  showScreen('menu');
}

document.addEventListener('DOMContentLoaded', init);
