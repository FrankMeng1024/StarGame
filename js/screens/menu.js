// screens/menu.js — Main menu screen
import state from '../state.js';

export function initMenu(navigate) {
  const screen = document.getElementById('screen-menu');

  const btnPlay    = screen.querySelector('.btn-play');
  const btnGallery = screen.querySelector('.btn-gallery');

  btnPlay.addEventListener('click', () => navigate('levels'));
  btnGallery.addEventListener('click', () => navigate('gallery'));
}
