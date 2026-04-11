// state.js — global singleton game state
import { saveGame, loadGame } from './utils/storage.js';

const state = {
  unlockedLevels: new Set([0]),
  levelScores: new Map(),
  coins: 0,
  inventory: new Map(),
  seenScenes: new Set(),
  currentLevel: null,
  currentScreen: 'menu',
  // Pre-level item selection: array of up to 3 active item IDs (not persisted)
  selectedItems: [],

  save() { saveGame(this); },

  load() {
    const saved = loadGame();
    if (saved) {
      this.unlockedLevels = saved.unlockedLevels;
      this.levelScores    = saved.levelScores;
      this.coins          = saved.coins;
      this.inventory      = saved.inventory;
      this.seenScenes     = saved.seenScenes;
    }
  },

  isUnlocked(idx) { return this.unlockedLevels.has(idx); },

  unlock(idx) {
    this.unlockedLevels.add(idx);
    this.save();
  },

  addCoins(amount) {
    this.coins += amount;
    this.save();
  },

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.save();
    return true;
  },

  setScore(levelIdx, score) {
    const prev = this.levelScores.get(String(levelIdx));
    if (!prev || score.stars > prev.stars || (score.stars === prev.stars && score.time > prev.time)) {
      this.levelScores.set(String(levelIdx), score);
      this.save();
    }
  },

  getScore(levelIdx) {
    return this.levelScores.get(String(levelIdx)) || null;
  },

  addItem(itemId, qty = 1) {
    this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + qty);
    this.save();
  },

  useItem(itemId) {
    const qty = this.inventory.get(itemId) || 0;
    if (qty <= 0) return false;
    if (qty === 1) this.inventory.delete(itemId);
    else this.inventory.set(itemId, qty - 1);
    this.save();
    return true;
  },

  getItemQty(itemId) {
    return this.inventory.get(itemId) || 0;
  },
};

export default state;
