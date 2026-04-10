// screens/game.js — Game screen controller
import { GameEngine } from '../game/engine.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';

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

  // Tutorial hint
  _showHint();

  engine.start();
}

export function stopGame() {
  if (engine) { engine.stop(); engine = null; }
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

function _dismissHint() {
  const hint = document.getElementById('game-hint');
  if (!hint) return;
  sessionStorage.setItem('hintSeen', '1');
  hint.classList.add('hint-fade-out');
  setTimeout(() => { hint.style.display = 'none'; }, 400);
}

function _handleComplete(timeLeft, navigate) {
  const idx   = state.currentLevel ?? 0;
  const coins  = Math.floor(timeLeft) * 10;
  const level  = CONSTELLATIONS[idx];
  const caught = engine ? engine.caughtStars : level.stars.length;
  const total  = level.stars.length;

  // Update state
  state.setScore(idx, { stars: 3, time: timeLeft });
  state.addCoins(coins);
  state.unlock(idx + 1);

  navigate('complete', { idx, timeLeft, coins, caught, total });
}

function _handleFail(idx, navigate) {
  const level    = CONSTELLATIONS[idx];
  const caught   = engine ? engine.caughtStars : 0;
  const total    = level.stars.length;
  const elapsed  = engine ? Math.floor(90 - engine.timeLeft) : 90;
  navigate('fail', { idx, caught, total, elapsed });
}
