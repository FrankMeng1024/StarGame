# TECH_SPEC.md — 追星少女 (StarCatcher) · 微信小游戏版

## §type
微信小游戏 (WeChat Mini Game) — 单人休闲游戏，纯 Canvas 2D 渲染，含云端存档后端。

## §acceptance
acceptance_mode: auto

## §verification-tool
miniprogram-automator

## §devtools-path
C:\tools\微信web开发者工具\cli.bat

## §stack

### 前端（微信小游戏）
| Layer | Choice | Rationale |
|---|---|---|
| Runtime | 微信小游戏 JS 环境 (ES2022) | 平台要求，无 DOM，无 document |
| 渲染 | Canvas 2D (wx.createCanvas) | 唯一可用渲染方式，与原版 HTML5 Canvas API 兼容 |
| UI 屏幕 | 纯 Canvas 绘制（替代原版 DOM 屏幕） | 微信小游戏无 HTML/CSS |
| 存储 | wx.setStorageSync / wx.setStorage（本地缓存） + 云端存档 | localStorage → wx API |
| 音频 | wx.createInnerAudioContext | Web Audio API → wx API |
| 网络 | wx.request | fetch → wx API |
| 用户登录 | wx.login() + 主动授权（button open-type=chooseAvatar） | 获取 openid + 昵称/头像 |

### 后端（存档服务）
| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| Database | MySQL 8 |
| Auth | JWT (jsonwebtoken) — openid 换 token |
| Deploy | 用户自有服务器，域名 yiiling.cn，HTTPS |

## §appid
wx122b5c79146de362

## §git
- Strategy: A (auto-commit after each Story Done + each verified bug fix)
- Branch: mini
- Push: push to branch `mini`; if branch doesn't exist remotely, auto-create with `git push -u origin mini`

## §deploy
- 本地开发：微信开发者工具（本地调试模式，不校验域名）
- Sprint 2+：后端部署至 yiiling.cn，配置 HTTPS，微信后台添加 request 合法域名

## §miniprogram-structure
```
miniprogram/
  app.js              ← 小游戏入口，wx.login 流程
  game.json           ← 小游戏配置（appid、deviceOrientation 等）
  js/
    platform/
      wx-adapter.js   ← wx API 封装（storage/audio/network 统一接口）
      auth.js         ← wx.login + token 管理
    engine/           ← 从原版复用的游戏引擎（物理/碰撞/星星数据）
    screens/
      menu.js         ← Canvas 绘制主菜单
      levels.js       ← Canvas 绘制关卡选择
      game.js         ← 游戏主屏幕（复用 engine/）
      complete.js     ← 通关界面
      fail.js         ← 失败界面
      shop.js         ← 商店
      gallery.js      ← 展厅
      achievement.js  ← 成就页
    data/
      constellations.js ← 星座数据（直接复用）
      levels-data.js    ← 关卡配置（直接复用）
  assets/
    images/           ← 精灵图、背景图
    audio/            ← 背景音乐、音效
backend/
  src/
    app.js            ← Express 入口
    routes/
      auth.js         ← POST /api/login
      save.js         ← GET/POST /api/save
    db.js             ← MySQL 连接池
  .env.example
  package.json
```

## §backend-api
```
POST /api/login
  Body: { code: string }         ← wx.login() 返回的 code
  Response: { token: string }    ← JWT，有效期 30 天

GET /api/save
  Header: Authorization: Bearer <token>
  Response: { data: SaveData | null }

POST /api/save
  Header: Authorization: Bearer <token>
  Body: { data: SaveData }
  Response: { ok: true }
```

SaveData 结构（与原版 localStorage 一致）：
```json
{
  "unlockedLevels": [0],
  "levelScores": {},
  "coins": 100,
  "inventory": {},
  "seenScenes": [],
  "nickname": "string",
  "avatarUrl": "string"
}
```

## §viewports
- 微信小游戏：设备全屏（devicePixelRatio aware）
- 主要测试设备：iPhone 14 Pro (390×844)、Android 1080×2400
- 横竖屏：竖屏（portrait）

## §start-script
- 前端：微信开发者工具打开 miniprogram/ 目录
- 后端：`node backend/src/app.js`（开发）/ `pm2 start`（生产）

## §test-runner
File: `scripts/mp_qa_runner.js`

## §test-config
File: `scripts/test_config.json`

## §performance-targets
| Metric | Target |
|---|---|
| 小游戏启动到主菜单 | < 2s |
| 关卡加载 | < 500ms |
| 游戏帧率 | 60fps |
| 后端接口响应 | < 500ms |
| 存档读写 | < 200ms |
| 登录流程 | < 1s（静默登录） |

## §ux-thresholds
- Navigation: max 2 taps from main menu to any feature

## §spike-decision
Sprint 1 包含 Spike：miniprogram-automator 连接微信开发者工具验证、wx.login 真机调试验证。
