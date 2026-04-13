// screens/menu.js — Main menu screen
import { toggleMute, isMuted } from '../audio.js';
import { requestLocation, getVisibleConstellations } from '../data/visibility.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { initMenuSky, stopMenuSky } from './menu-sky.js';

let _skyInitialized = false;

async function _startMenuSky() {
  if (_skyInitialized) return;
  _skyInitialized = true;
  try {
    const { lat, lon, isDefault } = await requestLocation();

    let conDef = null;
    let bestAlt = null;

    if (!isDefault) {
      // Geolocation available — find highest-altitude game constellation
      const ranked = getVisibleConstellations(lat, lon, new Date(), -90, 100);
      for (const vc of ranked) {
        const match = CONSTELLATIONS.find(c => c.nameEn === vc.nameEn);
        if (match) { conDef = match; bestAlt = vc.altitude; break; }
      }
    }

    if (!conDef) {
      // No geolocation or no match — pick a random game constellation silently
      conDef = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
      bestAlt = null; // unknown altitude — don't show it
    }

    initMenuSky(conDef);
    _renderInfoPanel(conDef, bestAlt, !isDefault, lat);
  } catch (_) {
    // Silently ignore
  }
}

// ── Info panel ────────────────────────────────────────────────
function _renderInfoPanel(conDef, altitude, hasLocation, lat) {
  const panel = document.getElementById('menu-sky-info');
  if (!panel) return;

  const altStr = altitude !== null && altitude > 0 ? `高度 ${altitude.toFixed(0)}°` : '';
  const locationLine = hasLocation && lat !== undefined
    ? `📍 ${lat >= 0 ? '北' : '南'}纬${Math.abs(lat).toFixed(1)}°`
    : '';

  const tip = `位于${conDef.region}，${conDef.bestViewMonth}最易观测。主要亮星：${conDef.mainStars}。`;

  panel.innerHTML = `
    <div class="sky-info-header">
      <span class="sky-info-icon">${conDef.icon || '✦'}</span>
      <span class="sky-info-name">${conDef.nameZh}</span>
      ${altStr ? `<span class="sky-info-alt">${altStr}</span>` : ''}
    </div>
    <p class="sky-info-tip">${tip}</p>
    ${locationLine ? `<p class="sky-info-loc">${locationLine}</p>` : ''}
  `;
  panel.style.display = '';
}

export function initMenu(navigate) {
  const screen = document.getElementById('screen-menu');

  const btnPlay    = screen.querySelector('.btn-play');
  const btnGallery = screen.querySelector('.btn-gallery');
  const btnShop    = screen.querySelector('.btn-shop-from-menu');

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
