// storage.js — localStorage wrapper
const SAVE_KEY = 'starcatcher_save';

// Q5: Availability probe — run once at module load
let _storageAvailable = true;
try {
  localStorage.setItem('_sc_test', '1');
  localStorage.removeItem('_sc_test');
} catch (e) {
  _storageAvailable = false;
  console.warn('[StarCatcher] localStorage unavailable, running in memory-only mode');
}

export function saveGame(state) {
  if (!_storageAvailable) return;
  try {
    const data = {
      unlockedLevels: [...state.unlockedLevels],
      levelScores: Object.fromEntries(state.levelScores),
      coins: state.coins,
      inventory: Object.fromEntries(state.inventory),
      seenScenes: [...state.seenScenes],
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGame() {
  if (!_storageAvailable) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      unlockedLevels: new Set(data.unlockedLevels || [0]),
      levelScores: new Map(Object.entries(data.levelScores || {})),
      coins: data.coins || 0,
      inventory: new Map(Object.entries(data.inventory || {})),
      seenScenes: new Set(data.seenScenes || []),
    };
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

export function clearGame() {
  if (!_storageAvailable) return;
  localStorage.removeItem(SAVE_KEY);
}
