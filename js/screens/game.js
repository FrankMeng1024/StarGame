// screens/game.js — Game screen controller
import { GameEngine } from '../game/engine.js';
import { CONSTELLATIONS } from '../data/constellations.js';
import state from '../state.js';

let engine = null;

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

  engine.start();
}

export function stopGame() {
  if (engine) { engine.stop(); engine = null; }
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
  // Simple fail: show complete screen with 0 time (different title handled by navigate)
  navigate('fail', { idx });
}
