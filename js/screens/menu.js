// screens/menu.js — Main menu screen
import state from '../state.js';
import { toggleMute, isMuted } from '../audio.js';
import { requestLocation, getVisibleConstellations } from '../data/visibility.js';
import { initMenuSky, stopMenuSky } from './menu-sky.js';

// CR-070: Kick off geolocation + constellation rendering as soon as the menu
// module is imported — this runs in the background so by the time the user
// sees the menu the sky is already populated (or failing gracefully).
let _skyInitialized = false;

async function _startMenuSky() {
  if (_skyInitialized) return;
  _skyInitialized = true;
  try {
    const { lat, lon, isDefault } = await requestLocation();
    const visible = getVisibleConstellations(lat, lon, new Date());
    initMenuSky(visible, lat, isDefault);
  } catch (_) {
    // Silently ignore — sky is purely cosmetic
  }
}

export function initMenu(navigate) {
  const screen = document.getElementById('screen-menu');

  const btnPlay    = screen.querySelector('.btn-play');
  const btnGallery = screen.querySelector('.btn-gallery');
  const btnShop    = screen.querySelector('.btn-shop-from-menu');

  // CR-071: Show achievement button only after full completion
  const btnAchievement = screen.querySelector('.btn-achievement');
  if (btnAchievement) {
    const allDone = Array.from({ length: 30 }, (_, i) => i).every(i => state.hasCompleted(i));
    btnAchievement.style.display = allDone ? '' : 'none';
    if (allDone) btnAchievement.addEventListener('click', () => navigate('achievement'));
  }

  btnPlay.addEventListener('click', () => { stopMenuSky(); navigate('levels'); });
  btnGallery.addEventListener('click', () => { stopMenuSky(); navigate('gallery'); });
  if (btnShop) btnShop.addEventListener('click', () => { stopMenuSky(); navigate('shop', { from: 'menu' }); });

  const muteBtn = document.getElementById('menu-mute-btn');
  if (muteBtn) {
    const updateMuteBtn = () => {
      muteBtn.textContent = isMuted() ? '🔇' : '🔊';
      muteBtn.title = isMuted() ? '取消静音' : '静音';
    };
    updateMuteBtn();
    muteBtn.addEventListener('click', () => { toggleMute(); updateMuteBtn(); });
  }

  // Start sky rendering (async, non-blocking)
  _startMenuSky();
}

// Called by navigate() when returning to menu so sky restarts
export function resumeMenuSky() {
  _skyInitialized = false;
  _startMenuSky();
}
