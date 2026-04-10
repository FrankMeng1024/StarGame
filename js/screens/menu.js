// screens/menu.js — Main menu screen
import state from '../state.js';
import { toggleMute, isMuted } from '../audio.js';

export function initMenu(navigate) {
  const screen = document.getElementById('screen-menu');

  const btnPlay    = screen.querySelector('.btn-play');
  const btnGallery = screen.querySelector('.btn-gallery');

  btnPlay.addEventListener('click', () => navigate('levels'));
  btnGallery.addEventListener('click', () => navigate('gallery'));

  const muteBtn = document.getElementById('menu-mute-btn');
  if (muteBtn) {
    const updateMuteBtn = () => {
      muteBtn.textContent = isMuted() ? '🔇' : '🔊';
      muteBtn.title = isMuted() ? '取消静音' : '静音';
    };
    updateMuteBtn();
    muteBtn.addEventListener('click', () => { toggleMute(); updateMuteBtn(); });
  }
}
