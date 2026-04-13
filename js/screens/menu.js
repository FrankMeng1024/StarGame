// screens/menu.js — Main menu screen
import state from '../state.js';
import { toggleMute, isMuted } from '../audio.js';
import { requestLocation, getVisibleConstellations } from '../data/visibility.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import { initMenuSky, stopMenuSky } from './menu-sky.js';

// CR-079: Kick off geolocation + single-constellation rendering as soon as
// the menu module is imported — by the time the user sees the menu the sky
// is already populated (or failing gracefully).
let _skyInitialized = false;

async function _startMenuSky() {
  if (_skyInitialized) return;
  _skyInitialized = true;
  try {
    const { lat, lon, isDefault } = await requestLocation();
    // Get all ranked constellations (no count/altitude limit — we need the full list
    // to find the first one that has a game entry in our 30 constellations)
    const ranked = getVisibleConstellations(lat, lon, new Date(), -90, 100);

    // Find the highest-altitude constellation that exists in our game data
    let conDef = null;
    let bestAlt = 0;
    for (const vc of ranked) {
      const match = CONSTELLATIONS.find(c => c.nameEn === vc.nameEn);
      if (match) {
        conDef = match;
        bestAlt = vc.altitude;
        break;
      }
    }
    if (!conDef) return; // no match found — skip silently

    initMenuSky(conDef, bestAlt, isDefault);
    _renderInfoPanel(conDef, bestAlt, isDefault, lat);
  } catch (_) {
    // Silently ignore — sky is purely cosmetic
  }
}

// ── Info panel ────────────────────────────────────────────────
function _renderInfoPanel(conDef, altitude, isDefault, lat) {
  let panel = document.getElementById('menu-sky-info');
  if (!panel) return; // element must exist in HTML

  const altStr = altitude > 0
    ? `高度 ${altitude.toFixed(0)}°`
    : `低于地平线`;

  const locationLine = isDefault
    ? '📍 默认：新西兰特卡波'
    : `📍 当前位置 · ${lat >= 0 ? '北' : '南'}纬${Math.abs(lat).toFixed(1)}°`;

  // Viewing tip: combine region, bestViewMonth, mainStars into 2 short sentences
  const tip = `位于${conDef.region}，${conDef.bestViewMonth}最易观测。主要亮星：${conDef.mainStars}。`;

  panel.innerHTML = `
    <div class="sky-info-header">
      <span class="sky-info-icon">${conDef.icon || '✦'}</span>
      <span class="sky-info-name">${conDef.nameZh}</span>
      <span class="sky-info-name-en">${conDef.nameEn}</span>
      <span class="sky-info-alt">${altStr}</span>
    </div>
    <p class="sky-info-tip">${tip}</p>
    <p class="sky-info-loc">${locationLine}</p>
  `;
  panel.style.display = '';
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
