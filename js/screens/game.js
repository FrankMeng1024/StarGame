// screens/game.js — Game screen controller
import { GameEngine } from '../game/engine.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';
import { startMusic, stopMusic, playLevelComplete, playTimeExt, toggleMute, isMuted } from '../audio.js';
import { getSpriteReady } from './levels.js';

let engine = null;
let _hintClickListener = null;
let _hintTimer = null;
let _hintGeneration = 0;
let _escListener = null;

export function startGame(navigate) {
  const screen = document.getElementById('screen-game');
  const canvas  = document.getElementById('gameCanvas');
  const W = screen.clientWidth  || 1280;
  const H = screen.clientHeight || 720;

  canvas.width  = W;
  canvas.height = H;

  const idx = state.currentLevel ?? 0;

  if (engine) { engine.stop(); engine = null; }

  // CR-071: Fetch all 6 sprites from the prewarmed cache in levels.js and pass
  // them into GameEngine so it can assign them directly (no new Image() needed).
  const SPRITE_SRCS = [
    'assets/sprites/girl.svg',
    'assets/sprites/net.svg',
    'assets/sprites/debris-meteor.svg',
    'assets/sprites/debris-satellite.svg',
    'assets/sprites/debris-rocket.svg',
    'assets/sprites/debris-cloth.svg',
  ];
  Promise.all(SPRITE_SRCS.map(src => getSpriteReady(src).then(img => [src, img])))
    .then(entries => {
      const sprites = Object.fromEntries(entries);
      engine = new GameEngine(
        canvas, idx,
        (timeLeft) => _handleComplete(timeLeft, navigate),
        ()         => _handleFail(idx, navigate),
        sprites
      );

    // Init HUD
    const status = engine.getStatus();
    document.querySelector('.hud-level-name').textContent = status.levelName;
    document.querySelector('.star-count').textContent = `${status.caughtStars}/${status.totalStars}`;
    const t = Math.ceil(status.timeLeft);
    const timerText = document.getElementById('hud-timer-text') || document.querySelector('.hud-timer');
    if (timerText) timerText.textContent =
      `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;

    // Active item slots HUD
    _initSlotHUD();

    // Active items toast (passive items that are auto-active)
    _showActiveItemsToast();

    // Tutorial hint
    _showHint();

    // Mute button
    _initMuteButton();

    // Pause system
    _initPause(navigate);

    engine.onTimeExt = () => { _showTimeExtFlash(); playTimeExt(); };
    engine.start();
    startMusic();
  });
}

export function stopGame() {
  if (engine) { engine.stop(); engine = null; }
  stopMusic();
  _stopSlotAnimation();
  // Clean up hint listener if still attached
  if (_hintClickListener) {
    document.removeEventListener('click', _hintClickListener, true);
    _hintClickListener = null;
  }
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
  // Clean up Escape listener
  if (_escListener) {
    document.removeEventListener('keydown', _escListener);
    _escListener = null;
  }
  // Hide pause overlay
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.classList.add('hidden');
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
  net_enlarge:  '🪢 网兜扩大',
  shrink_debris:'🔬 缩小垃圾',
  double_coins: '🪙 双倍金币',
  star_map:     '🗺️ 星图揭示',
  glove:        '🧤 宇航员手套',
  space_bomb:   '💣 宇宙炸弹',
  time_ext:     '⏱️ 时间延长',
};

// ── Slot-based HUD (new item system) ─────────────────────────
let _slotRafId = null;

function _initSlotHUD() {
  const container = document.getElementById('hud-active-items');
  if (!container) return;
  container.innerHTML = '';

  if (!engine || engine.activeSlots.length === 0) {
    // Show passive items only if double_coins is active
    if (engine && engine.activeItems.has('double_coins')) {
      const row = document.createElement('div');
      row.className = 'hud-passive-row';
      row.innerHTML = '<span class="hud-passive-icon" title="双倍金币">🪙</span>';
      container.appendChild(row);
    }
    return;
  }

  // Build 3 slot buttons
  engine.activeSlots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'hud-slot';
    el.dataset.slotIdx = i;
    el.innerHTML = `
      <span class="slot-key">${i + 1}</span>
      <span class="slot-icon">${slot.icon}</span>
      <div class="slot-bar-wrap"><div class="slot-bar" style="width:100%"></div></div>
    `;
    el.addEventListener('click', () => engine && engine.activateSlot(i));
    container.appendChild(el);
  });

  // Show passive double_coins badge if active
  if (engine.activeItems.has('double_coins')) {
    const passive = document.createElement('span');
    passive.className = 'hud-passive-icon';
    passive.title = '双倍金币';
    passive.textContent = '🪙';
    container.appendChild(passive);
  }

  // Start countdown bar animation
  _startSlotAnimation();
}

function _startSlotAnimation() {
  if (_slotRafId) cancelAnimationFrame(_slotRafId);
  function tick() {
    if (!engine) return;
    const now = performance.now();
    engine.activeSlots.forEach((slot, i) => {
      const el = document.querySelector(`.hud-slot[data-slot-idx="${i}"]`);
      if (!el) return;
      const bar = el.querySelector('.slot-bar');
      if (slot.used && slot.duration > 0) {
        const remaining = Math.max(0, slot.endTime - now);
        const pct = (remaining / (slot.duration * 1000)) * 100;
        if (bar) bar.style.width = pct + '%';
        el.classList.toggle('slot-expired', remaining <= 0);
      } else if (slot.used && slot.duration === 0) {
        el.classList.add('slot-expired');
        if (bar) bar.style.width = '0%';
      }
    });
    _slotRafId = requestAnimationFrame(tick);
  }
  _slotRafId = requestAnimationFrame(tick);
}

function _stopSlotAnimation() {
  if (_slotRafId) { cancelAnimationFrame(_slotRafId); _slotRafId = null; }
}

function _showActiveItemsToast() {
  // In new system: show passive items if any
  if (!engine || engine.activeItems.size === 0) return;
  const screen = document.getElementById('screen-game');
  if (!screen) return;
  const existing = screen.querySelector('.active-items-toast');
  if (existing) existing.remove();
  const names = Array.from(engine.activeItems).map(id => ITEM_NAMES[id] || id);
  const toast = document.createElement('div');
  toast.className = 'active-items-toast';
  toast.innerHTML = names.map(n => `<span>${n} 生效中</span>`).join('');
  screen.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
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
  const timerEl = document.querySelector('.hud-timer-ring') || document.querySelector('.hud-timer');
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

function _initPause(navigate) {
  const pauseBtn   = document.getElementById('pause-btn');
  const overlay    = document.getElementById('pause-overlay');
  const resumeBtn  = document.getElementById('pause-resume-btn');
  const retryBtn   = document.getElementById('pause-retry-btn');
  const exitBtn    = document.getElementById('pause-exit-btn');
  const confirm    = document.getElementById('pause-confirm');
  const confirmYes = document.getElementById('pause-confirm-yes');
  const confirmNo  = document.getElementById('pause-confirm-no');
  if (!pauseBtn || !overlay) return;

  // Hide confirm panel initially
  confirm.classList.add('hidden');

  function setPaused(paused) {
    if (!engine) return;
    if (paused) {
      engine._paused = true;
      overlay.classList.remove('hidden');
      // CR-058: keep gear icon always (no toggle to play symbol)
      confirm.classList.add('hidden');
    } else {
      overlay.classList.add('hidden');
      engine.resume();
    }
  }

  pauseBtn.onclick = () => setPaused(overlay.classList.contains('hidden'));

  resumeBtn.onclick = () => setPaused(false);

  retryBtn.onclick = () => {
    stopGame();
    navigate('game');
  };

  exitBtn.onclick = () => {
    confirm.classList.toggle('hidden');
  };

  confirmYes.onclick = () => {
    stopGame();
    navigate('levels');
  };

  confirmNo.onclick = () => {
    confirm.classList.add('hidden');
  };

  // Remove any old Escape listener
  if (_escListener) document.removeEventListener('keydown', _escListener);

  _escListener = (e) => {
    if (e.key !== 'Escape') return;
    const isPaused = !overlay.classList.contains('hidden');
    setPaused(!isPaused);
  };
  document.addEventListener('keydown', _escListener);
}

function _handleComplete(timeLeft, navigate) {
  const idx      = state.currentLevel ?? 0;
  const coinMultiplier = engine ? (engine.coinMultiplier ?? 1) : 1;
  let   coins    = Math.floor(timeLeft) * 10 * coinMultiplier;
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

  // CR-055: half coins if level was already cleared with 3 stars
  if (prevScore && prevScore.stars === 3) {
    coins = Math.floor(coins / 2);
  }

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
