// screens/game.js — Game screen controller
import { GameEngine } from '../game/engine.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';
import { startMusic, stopMusic, playLevelComplete, playTimeExt, toggleMute, isMuted } from '../audio.js';

let engine = null;
let _hintClickListener = null;
let _hintTimer = null;
let _hintGeneration = 0;

export function startGame(navigate) {
  const screen = document.getElementById('screen-game');
  const canvas  = document.getElementById('gameCanvas');
  const W = screen.clientWidth  || 1280;
  const H = screen.clientHeight || 720;

  canvas.width  = W;
  canvas.height = H;

  const idx = state.currentLevel ?? 0;

  if (engine) { engine.stop(); engine = null; }

  engine = new GameEngine(
    canvas, idx,
    (timeLeft) => _handleComplete(timeLeft, navigate),
    ()         => _handleFail(idx, navigate)
  );

  // Init HUD
  const status = engine.getStatus();
  document.querySelector('.hud-level-name').textContent = status.levelName;
  document.querySelector('.star-count').textContent = `${status.caughtStars}/${status.totalStars}`;
  const t = Math.ceil(status.timeLeft);
  document.querySelector('.hud-timer').textContent =
    `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;

  // Active item buttons (space_bomb, time_ext)
  _initActiveItemButtons();

  // Passive item HUD row
  _initPassiveItemRow();

  // Active items toast (show passive items that are active this run)
  _showActiveItemsToast();

  // Tutorial hint
  _showHint();

  // Mute button
  _initMuteButton();

  engine.start();
  startMusic();
}

export function stopGame() {
  if (engine) { engine.stop(); engine = null; }
  stopMusic();
  // Clean up hint listener if still attached
  if (_hintClickListener) {
    document.removeEventListener('click', _hintClickListener, true);
    _hintClickListener = null;
  }
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
}

function _showHint() {
  const hint = document.getElementById('game-hint');
  if (!hint) return;

  // Clean up any leftover hint state from a previous game load
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
  if (_hintClickListener) {
    document.removeEventListener('click', _hintClickListener, true);
    _hintClickListener = null;
  }

  // Only show if not seen this session
  if (sessionStorage.getItem('hintSeen')) {
    hint.style.display = 'none';
    return;
  }

  hint.style.display = '';
  hint.classList.remove('hint-fade-out');

  // Increment generation so any stale timers from previous _showHint calls
  // cannot fire _dismissHint after this new hint is shown.
  const gen = ++_hintGeneration;

  // Auto-dismiss after 5s
  _hintTimer = setTimeout(() => {
    if (_hintGeneration === gen) _dismissHint();
  }, 5000);

  // Defer adding the click listener until after the current event (the
  // level-card click that triggered navigation) has fully finished dispatching.
  // This prevents that same click from immediately dismissing the hint.
  setTimeout(() => {
    if (_hintGeneration !== gen) return; // game left before timeout fired
    _hintClickListener = function onFirstClick() {
      if (_hintGeneration !== gen) {
        document.removeEventListener('click', _hintClickListener, true);
        _hintClickListener = null;
        return;
      }
      if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
      _dismissHint();
      document.removeEventListener('click', _hintClickListener, true);
      _hintClickListener = null;
    };
    document.addEventListener('click', _hintClickListener, true);
  }, 0);
}

const ITEM_NAMES = {
  net_speed:    '⚡ 网兜加速',
  star_magnet:  '🧲 磁力星引',
  shrink_debris:'🔬 缩小垃圾',
  double_coins: '🪙 双倍金币',
  star_map:     '🗺️ 星图揭示',
  glove:        '🧤 宇航员手套',
};

function _showActiveItemsToast() {
  if (!engine || engine.activeItems.size === 0) return;
  const screen = document.getElementById('screen-game');
  if (!screen) return;

  // Remove any existing toast
  const existing = screen.querySelector('.active-items-toast');
  if (existing) existing.remove();

  const names = Array.from(engine.activeItems).map(id => ITEM_NAMES[id] || id);
  const toast = document.createElement('div');
  toast.className = 'active-items-toast';
  toast.innerHTML = names.map(n => `<span>${n} 已激活</span>`).join('');
  screen.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function _initActiveItemButtons() {
  const container = document.getElementById('hud-active-items');
  if (!container) return;
  container.innerHTML = '';

  const ACTIVE_ITEMS = [
    { id: 'space_bomb', icon: '💣', label: '炸弹' },
    { id: 'time_ext',   icon: '⏱️', label: '+20秒' },
  ];

  for (const item of ACTIVE_ITEMS) {
    if (state.getItemQty(item.id) <= 0) continue;

    const btn = document.createElement('button');
    btn.className = 'hud-item-btn';
    btn.dataset.itemId = item.id;
    btn.innerHTML = `<span class="hud-item-icon">${item.icon}</span><span class="hud-item-label">${item.label}</span>`;
    btn.addEventListener('click', () => _activateItem(item.id, btn));
    container.appendChild(btn);
  }
}

function _activateItem(itemId, btn) {
  if (!engine) return;
  if (!state.useItem(itemId)) return;

  if (itemId === 'space_bomb') {
    // Remove all uncaught debris
    engine.debris = engine.debris.filter(d => {
      if (!d.caught) {
        engine._emitDebrisParticles(d.x, d.y);
        return false;
      }
      return true;
    });
  } else if (itemId === 'time_ext') {
    engine.timeLeft = Math.min(engine.timeLeft + 20, engine.startTime + 20);
    _showTimeExtFlash();
    playTimeExt();
  }

  // Hide button after use (qty is now 0)
  if (state.getItemQty(itemId) <= 0) btn.style.display = 'none';
}

function _dismissHint() {
  const hint = document.getElementById('game-hint');
  if (!hint) return;
  sessionStorage.setItem('hintSeen', '1');
  hint.classList.add('hint-fade-out');
  setTimeout(() => { hint.style.display = 'none'; }, 400);
}

function _showTimeExtFlash() {
  const screen = document.getElementById('screen-game');
  const timerEl = document.querySelector('.hud-timer');
  if (!screen || !timerEl) return;
  const rect = timerEl.getBoundingClientRect();
  const screenRect = screen.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'time-ext-flash';
  el.textContent = '+20秒';
  el.style.left = `${rect.left - screenRect.left + rect.width / 2}px`;
  el.style.top  = `${rect.top  - screenRect.top  - 10}px`;
  screen.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function _initPassiveItemRow() {
  if (!engine || engine.activeItems.size === 0) return;
  const hud = document.querySelector('.hud-top');
  if (!hud) return;
  // Remove any existing row
  const existing = hud.querySelector('.hud-passive-row');
  if (existing) existing.remove();

  const PASSIVE_ICONS = {
    net_speed:    '⚡',
    star_magnet:  '🧲',
    shrink_debris:'🔬',
    double_coins: '🪙',
    star_map:     '🗺️',
    glove:        '🧤',
  };
  const row = document.createElement('div');
  row.className = 'hud-passive-row';
  for (const id of engine.activeItems) {
    const icon = PASSIVE_ICONS[id];
    if (!icon) continue;
    const span = document.createElement('span');
    span.className = 'hud-passive-icon';
    span.textContent = icon;
    row.appendChild(span);
  }
  hud.appendChild(row);
}

function _initMuteButton() {
  const btn = document.getElementById('mute-btn');
  if (!btn) return;
  const update = () => {
    btn.textContent = isMuted() ? '🔇' : '🔊';
    btn.title = isMuted() ? '取消静音' : '静音';
  };
  update();
  btn.onclick = () => { toggleMute(); update(); };
}

function _handleComplete(timeLeft, navigate) {
  const idx      = state.currentLevel ?? 0;
  const coinMultiplier = engine ? (engine.coinMultiplier ?? 1) : 1;
  const coins    = Math.floor(timeLeft) * 10 * coinMultiplier;
  const level    = CONSTELLATIONS[idx];
  const caught   = engine ? engine.caughtStars : level.stars.length;
  const total    = level.stars.length;
  const startTime = engine ? engine.startTime : 90;

  // Star rating: 3 = timeLeft > 50% of start; 2 = timeLeft > 20%; 1 = any
  const ratio = timeLeft / startTime;
  const stars = ratio > 0.5 ? 3 : ratio > 0.2 ? 2 : 1;

  // Check if this run is a new record (before setScore overwrites)
  const prevScore = state.getScore(idx);
  const isNewRecord = !prevScore ||
    stars > prevScore.stars ||
    (stars === prevScore.stars && timeLeft > prevScore.time);

  // Update state
  state.setScore(idx, { stars, time: timeLeft });
  state.addCoins(coins);
  state.unlock(idx + 1);

  playLevelComplete();
  navigate('complete', { idx, timeLeft, coins, caught, total, isNewRecord });
}

function _handleFail(idx, navigate) {
  const level    = CONSTELLATIONS[idx];
  const caught   = engine ? engine.caughtStars : 0;
  const total    = level.stars.length;
  const elapsed  = engine ? Math.floor(engine.startTime - engine.timeLeft) : (engine?.startTime ?? 90);
  navigate('fail', { idx, caught, total, elapsed });
}
