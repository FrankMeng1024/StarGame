// storage.js — localStorage wrapper
const SAVE_KEY = 'starcatcher_save';

export function saveGame(state) {
  try {
    const data = {
      unlockedLevels: [...state.unlockedLevels],
      levelScores: Object.fromEntries(state.levelScores),
      coins: state.coins,
      inventory: Object.fromEntries(state.inventory),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      unlockedLevels: new Set(data.unlockedLevels || [0]),
      levelScores: new Map(Object.entries(data.levelScores || {})),
      coins: data.coins || 0,
      inventory: new Map(Object.entries(data.inventory || {})),
    };
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

export function clearGame() {
  localStorage.removeItem(SAVE_KEY);
}
