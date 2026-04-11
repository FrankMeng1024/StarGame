// main.js — app entry point, screen router, cursor
import state from './state.js';
import { initStarfield } from './starfield.js';
import { initMenu } from './screens/menu.js';
import { initLevels, refreshLevels } from './screens/levels.js';
import { startGame, stopGame } from './screens/game.js';
import { showComplete, showFail } from './screens/complete.js';
import { initGallery, showGalleryDetail, refreshGallery } from './screens/gallery.js';
import { initShop } from './screens/shop.js';
import { showItemSelect } from './screens/item-select.js';

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

// ── Cursor star trail ──────────────────────────────────────────
let _trailEnabled = true;
let _trailTimer   = null;

function _spawnTrailParticle(x, y) {
  const p = document.createElement('div');
  p.className = 'cursor-trail-particle';
  const chars = ['✦', '·', '✧', '★', '⋆'];
  p.textContent = chars[Math.floor(Math.random() * chars.length)];
  const offX = (Math.random() - 0.5) * 10;
  const offY = (Math.random() - 0.5) * 10;
  p.style.left = (x + offX) + 'px';
  p.style.top  = (y + offY) + 'px';
  p.style.fontSize = (8 + Math.random() * 8) + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 500);
}

function initTrail() {
  let lastSpawn = 0;
  document.addEventListener('mousemove', e => {
    if (!_trailEnabled) return;
    const now = Date.now();
    if (now - lastSpawn < 40) return;  // ~25 particles/s max
    lastSpawn = now;
    _spawnTrailParticle(e.clientX, e.clientY);
  });
}

// Disable trail during active gameplay; re-enable on other screens
function setTrailEnabled(enabled) {
  _trailEnabled = enabled;
}

// ── Screen navigation ──────────────────────────────────────────
const SCREENS = ['menu', 'levels', 'game', 'complete', 'gallery', 'gallery-detail', 'shop'];

function showScreen(id) {
  for (const sid of SCREENS) {
    const el = document.getElementById(`screen-${sid}`);
    if (el) el.classList.toggle('active', sid === id);
  }
}

let _navPending = false;
function navigate(screen, params = {}) {
  if (_navPending) return;

  // Stop game if leaving game screen
  if (screen !== 'game') stopGame();

  // Determine the DOM screen id
  const screenId = (screen === 'complete' || screen === 'fail') ? 'complete' : screen;
  const nextEl = document.getElementById(`screen-${screenId}`);

  // No transition during gameplay (performance)
  if (screen === 'game') {
    setTrailEnabled(false);
    showScreen('game');
    startGame(navigate);
    return;
  }

  // Re-enable trail on non-gameplay screens
  setTrailEnabled(true);

  // Fade-out current active screen, then fade-in new one
  const currentEl = document.querySelector('.screen.active:not(#star-canvas)');
  if (currentEl && currentEl !== nextEl) {
    _navPending = true;
    currentEl.classList.add('screen-exit');
    setTimeout(() => {
      currentEl.classList.remove('active', 'screen-exit');
      _navPending = false;
      _activateScreen(screen, screenId, params);
    }, 250);
  } else {
    _activateScreen(screen, screenId, params);
  }
}

function _activateScreen(screen, screenId, params) {
  showScreen(screenId);
  const el = document.getElementById(`screen-${screenId}`);
  if (el) {
    el.classList.add('screen-enter');
    requestAnimationFrame(() => {
      el.classList.add('screen-enter-active');
      setTimeout(() => el.classList.remove('screen-enter', 'screen-enter-active'), 300);
    });
  }

  if (screen === 'complete') {
    showComplete(navigate, params);
  } else if (screen === 'fail') {
    showFail(navigate, params);
  } else if (screen === 'gallery') {
    refreshGallery(navigate);
  } else if (screen === 'gallery-detail') {
    showGalleryDetail(navigate, params);
  } else if (screen === 'shop') {
    initShop(navigate);
  } else if (screen === 'levels') {
    refreshLevels();
  }
}

// ── Init ───────────────────────────────────────────────────────
function init() {
  state.load();
  initCursor();
  initTrail();
  initStarfield('star-canvas');
  initMenu(navigate);
  initLevels(navigate);
  initGallery(navigate);

  // Level-select event from refreshed cards
  document.addEventListener('level-select', e => {
    state.currentLevel = e.detail;
    showItemSelect(() => navigate('game'));
  });

  // Expose navigate for test verification only
  window.__navigate = navigate;
  window.__state = state;

  showScreen('menu');
}

document.addEventListener('DOMContentLoaded', init);
