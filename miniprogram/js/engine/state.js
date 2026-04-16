// state.js — 全局游戏状态（微信小游戏版）
// 与原版 state.js 接口完全一致，替换 localStorage → StorageAdapter
import { StorageAdapter } from '../platform/wx-adapter.js';

const DEFAULT_SAVE = {
  unlockedLevels: [0],
  levelScores: {},
  coins: 100,
  inventory: {},
  seenScenes: [],
  nickname: '',
  avatarUrl: '',
};

const state = {
  unlockedLevels: new Set([0]),
  levelScores: new Map(),
  coins: 100,
  inventory: new Map(),
  seenScenes: new Set(),
  currentLevel: null,
  selectedItems: [],
  nickname: '',
  avatarUrl: '',

  // 从存档对象加载（由 app.js boot 调用）
  fromSaveData(data) {
    if (!data) return;
    this.unlockedLevels = new Set(data.unlockedLevels || [0]);
    this.levelScores    = new Map(Object.entries(data.levelScores || {}));
    this.coins          = data.coins ?? 100;
    this.inventory      = new Map(Object.entries(data.inventory || {}));
    this.seenScenes     = new Set(data.seenScenes || []);
    this.nickname       = data.nickname || '';
    this.avatarUrl      = data.avatarUrl || '';
    if (this.coins === 0 && this.levelScores.size === 0) this.coins = 100;
  },

  // 后台云端数据合并 — 取本地+云端各字段最大值，不覆盖玩家本次会话操作
  mergeFromCloudData(data) {
    if (!data) return;
    // Union unlocked levels (never regress)
    for (const lvl of (data.unlockedLevels || [])) this.unlockedLevels.add(lvl);
    // Keep best score per level
    for (const [k, v] of Object.entries(data.levelScores || {})) {
      const cur = this.levelScores.get(k);
      if (!cur || v.stars > cur.stars || (v.stars === cur.stars && v.time > cur.time)) {
        this.levelScores.set(k, v);
      }
    }
    // Keep higher coin balance
    this.coins = Math.max(this.coins, data.coins ?? 0);
    // Union seen scenes
    for (const s of (data.seenScenes || [])) this.seenScenes.add(s);
    // Nickname/avatar: take cloud value only if local is empty
    if (!this.nickname && data.nickname) this.nickname = data.nickname;
    if (!this.avatarUrl && data.avatarUrl) this.avatarUrl = data.avatarUrl;
  },

  toSaveData() {
    return {
      unlockedLevels: [...this.unlockedLevels],
      levelScores:    Object.fromEntries(this.levelScores),
      coins:          this.coins,
      inventory:      Object.fromEntries(this.inventory),
      seenScenes:     [...this.seenScenes],
      nickname:       this.nickname,
      avatarUrl:      this.avatarUrl,
    };
  },

  save() {
    StorageAdapter.persistSave(this.toSaveData());
  },

  isUnlocked(idx) { return this.unlockedLevels.has(idx); },

  hasCompleted(idx) {
    const score = this.levelScores.get(String(idx));
    return !!(score && score.stars > 0);
  },

  unlock(idx) { this.unlockedLevels.add(idx); this.save(); },

  addCoins(amount) { this.coins += amount; this.save(); },

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.save();
    return true;
  },

  setScore(levelIdx, score) {
    const key  = String(levelIdx);
    const prev = this.levelScores.get(key);
    if (!prev || score.stars > prev.stars ||
        (score.stars === prev.stars && score.time > prev.time)) {
      this.levelScores.set(key, score);
      this.save();
    }
  },

  getScore(levelIdx) { return this.levelScores.get(String(levelIdx)) || null; },

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

  getItemQty(itemId) { return this.inventory.get(itemId) || 0; },
};

export default state;
