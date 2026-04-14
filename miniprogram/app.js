// app.js — 微信小游戏入口
// 负责：wx.login 静默登录 → 获取 openid → 加载云端存档 → 启动主菜单

import { AuthManager } from './js/platform/auth.js';
import { StorageAdapter } from './js/platform/wx-adapter.js';
import { showMenu } from './js/screens/menu.js';

// 全局 Canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 屏幕尺寸（全局共享）
export const SCREEN_W = canvas.width;
export const SCREEN_H = canvas.height;
export const CTX = ctx;
export const CANVAS = canvas;

// 全局状态
export let gameState = null;

async function boot() {
  // 1. 静默登录 — 获取 openid + JWT token
  try {
    await AuthManager.login();
  } catch (e) {
    console.warn('[boot] login failed, running offline:', e.message);
  }

  // 2. 加载存档（云端优先，本地降级）
  gameState = await StorageAdapter.loadSave();

  // 3. 启动主菜单
  showMenu();
}

boot();
