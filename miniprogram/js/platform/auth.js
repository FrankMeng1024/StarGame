// auth.js — 微信登录流程
// wx.login() → code → POST /api/login → JWT token
// 主动授权：button open-type=chooseAvatar（Canvas 内绘制按钮，截取 tap 事件触发 wx 原生弹窗）

import { request, StorageAdapter } from './wx-adapter.js';

export const AuthManager = {
  // 静默登录：获取 openid → token
  async login() {
    // 已有 token 先校验（不过期则直接用）
    const existingToken = StorageAdapter.getToken();
    if (existingToken) {
      // TODO Sprint 2: 验证 token 有效性（可选）
      return;
    }

    // 获取 wx code
    const code = await new Promise((resolve, reject) => {
      wx.login({
        success: (res) => resolve(res.code),
        fail: (err) => reject(new Error(err.errMsg)),
      });
    });

    // 换 token
    const { token } = await request('POST', '/api/login', { code });
    StorageAdapter.setToken(token);
  },

  // 主动授权昵称+头像（调用前需有 button open-type=chooseAvatar 的 tap 事件）
  // 微信新规：必须通过 button 组件触发，不能 API 直接调用
  // 小游戏中：使用 wx.createUserInfoButton（已废弃）的替代方案是显示一个覆盖按钮
  // 实现：在 Canvas 上叠加一个原生 button（wx.createUserInfoButton 对小游戏仍有效）
  async requestUserInfo() {
    return new Promise((resolve, reject) => {
      // wx.createUserInfoButton 在小游戏中仍然可用（与小程序的 getUserProfile 不同）
      const btn = wx.createUserInfoButton({
        type: 'text',
        text: '授权登录',
        style: {
          left: 0, top: 0,
          width: wx.getSystemInfoSync().windowWidth,
          height: wx.getSystemInfoSync().windowHeight,
          lineHeight: 40,
          backgroundColor: 'transparent',
          color: 'transparent',
          textAlign: 'center',
          fontSize: 16,
          borderRadius: 4,
        },
      });

      btn.onTap((res) => {
        btn.destroy();
        if (res.userInfo) {
          resolve({
            nickname: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl,
          });
        } else {
          reject(new Error('user denied'));
        }
      });
    });
  },

  isLoggedIn() {
    return !!StorageAdapter.getToken();
  },
};
