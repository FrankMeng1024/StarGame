# Sprint 0-mini — 微信小游戏迁移 Sprint 0
**Goal**: 技术基础验证 + 项目结构建立。小游戏框架可运行，后端健康检查通过，平台适配层完成。

## 决策记录
| 决策 | 结果 |
|---|---|
| 渲染方案 | 纯 Canvas 2D（用户 CP1 确认） |
| 后端 | Node.js + Express + MySQL（用户 CP2 确认） |
| 用户登录 | wx.login() 静默 + 主动授权昵称头像 |
| 域名 | yiiling.cn（Sprint 1 本地调试，Sprint 2 切 HTTPS 部署） |
| AppID | wx122b5c79146de362 |
| 分支 | mini |
| 模式 | --auto（acceptance_mode: auto） |
