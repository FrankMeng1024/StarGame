# Sprint 8-mini Sprint Goal

**Sprint**: 8-mini
**Goal**: 刘海屏安全区适配 — 全屏幕 UI 元素避开刘海/Home条/状态栏，任何手机完整体验

## Orientation Decision (Arch, recorded 2026-04-16)

**Decision: 保持竖屏 (portrait)**

Rationale:
- 核心游戏机制 = 网兜向**上**摆动投掷，星星分布在屏幕**上方** 70% 区域
- 竖屏 iPhone 14 Pro：高度 844px → 游戏有效区 ~590px（角色以上）
- 横屏 iPhone 14 Pro：高度降至 ~390px → 游戏有效区仅 ~280px，星星拥挤，瞄准感差
- 参考游戏黄金矿工（相同摆动抓取机制）= 竖屏
- game.json `deviceOrientation: portrait` 保持不变

## Stories
- STORY-00226: 安全区全局常量 — globals.js 注入 SAFE_TOP/BOTTOM/LEFT/RIGHT
- STORY-00227: game.js HUD 适配安全区
- STORY-00228: menu.js 按钮/标题适配安全区
- STORY-00229: levels.js / gallery.js / shop.js 适配安全区
