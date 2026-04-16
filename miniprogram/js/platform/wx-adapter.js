// wx-adapter.js — 封装 wx API，统一接口，方便测试和替换
// 替代：localStorage → wx.setStorageSync
//       Web Audio    → wx.createInnerAudioContext
//       fetch        → wx.request

// ─── Storage ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'starcatcher_save';
const MUTED_KEY = 'starcatcher_muted';
const TOKEN_KEY = 'starcatcher_token';

const DEFAULT_SAVE = {
  unlockedLevels: [0],
  levelScores: {},
  coins: 100,
  inventory: {},
  seenScenes: [],
  nickname: '',
  avatarUrl: '',
};

export const StorageAdapter = {
  // 本地存储
  getLocal(key, fallback = null) {
    try {
      const v = wx.getStorageSync(key);
      return v !== '' ? v : fallback;
    } catch (e) {
      return fallback;
    }
  },

  setLocal(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.warn('[StorageAdapter] setLocal failed:', e);
    }
  },

  // 同步读取本地存档（不访问网络，用于立即启动）
  loadSaveLocal() {
    return this.getLocal(SAVE_KEY, { ...DEFAULT_SAVE });
  },

  // 存档（云端优先，本地降级）
  async loadSave() {
    // 先读本地
    const local = this.getLocal(SAVE_KEY, { ...DEFAULT_SAVE });

    // 尝试云端
    const token = this.getLocal(TOKEN_KEY);
    if (!token) return local;

    try {
      const remote = await request('GET', '/api/save', null, token);
      if (remote && remote.data) {
        // 云端优先，合并后写回本地
        const merged = { ...DEFAULT_SAVE, ...remote.data };
        this.setLocal(SAVE_KEY, merged);
        return merged;
      }
    } catch (e) {
      console.warn('[StorageAdapter] cloud load failed, using local:', e.message);
    }
    return local;
  },

  async persistSave(data) {
    // 写本地
    this.setLocal(SAVE_KEY, data);

    // 尝试云端
    const token = this.getLocal(TOKEN_KEY);
    if (!token) return;

    try {
      await request('POST', '/api/save', { data }, token);
    } catch (e) {
      console.warn('[StorageAdapter] cloud save failed:', e.message);
    }
  },

  getMuted() {
    return this.getLocal(MUTED_KEY, false);
  },
  setMuted(v) {
    this.setLocal(MUTED_KEY, v);
  },

  getToken() { return this.getLocal(TOKEN_KEY); },
  setToken(t) { this.setLocal(TOKEN_KEY, t); },
};

// ─── Network ─────────────────────────────────────────────────────────────────

// 后端地址 — 本地开发时微信开发者工具开启「不校验域名」
// 生产时改为 https://yiiling.cn
const API_BASE = 'https://yiiling.cn';

export function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const header = { 'content-type': 'application/json' };
    if (token) header['Authorization'] = `Bearer ${token}`;

    wx.request({
      url: API_BASE + path,
      method,
      data: body,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'network error'));
      },
    });
  });
}

// ─── Audio ───────────────────────────────────────────────────────────────────

let _bgm     = null;
let _bgmSrc  = null;
let _playing = false;

export const AudioAdapter = {
  // Idempotent: if already playing the same src, do nothing
  playBGM(src) {
    try {
      const muted = wx.getStorageSync(MUTED_KEY);
      if (muted === true || muted === 'true' || muted === 1) return;
    } catch (e) { /* storage unavailable — proceed */ }

    if (_bgm && _playing && _bgmSrc === src) return; // already playing

    if (_bgm) { try { _bgm.stop(); _bgm.destroy(); } catch (e) {} }
    _bgm     = wx.createInnerAudioContext();
    _bgmSrc  = src;
    _bgm.src  = src;
    _bgm.loop = true;
    _bgm.volume = 0.5;
    _bgm.onPlay(() => { _playing = true; });
    _bgm.onStop(() => { _playing = false; });
    _bgm.onError(() => { _playing = false; });
    _bgm.play();
  },

  stopBGM() {
    if (_bgm) { try { _bgm.stop(); } catch (e) {} }
    _playing = false;
  },

  isMuted() {
    try { const m = wx.getStorageSync(MUTED_KEY); return m === true || m === 'true' || m === 1; }
    catch (e) { return false; }
  },

  toggleMute(src) {
    const nowMuted = AudioAdapter.isMuted();
    try { wx.setStorageSync(MUTED_KEY, !nowMuted); } catch (e) {}
    if (nowMuted) {
      // Was muted → unmute: start playing
      AudioAdapter.playBGM(src);
    } else {
      // Was playing → mute: stop
      AudioAdapter.stopBGM();
    }
    return !nowMuted; // returns new muted state
  },

  playSFX(src) {
    if (AudioAdapter.isMuted()) return; // respect mute toggle
    const sfx = wx.createInnerAudioContext();
    sfx.src = src;
    sfx.volume = 0.8;
    sfx.play();
    sfx.onEnded(() => sfx.destroy());
    sfx.onError(() => sfx.destroy());
  },
};
