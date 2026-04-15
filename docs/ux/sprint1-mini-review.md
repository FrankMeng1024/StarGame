# UX Review — Sprint 1-mini
**Sprint**: Sprint 1-mini
**Date**: 2026-04-14
**Verdict**: UX issues found — 1 Medium fixed (button overflow)
**UX Subagent model**: claude-opus-4-6

## Friction Items Found

| ID | Severity | Description | Screenshot | Status |
|----|----------|-------------|------------|--------|
| UX-01 | Medium | 主菜单第3个按钮("道具商店")底部超出屏幕，iPhone 12/13 无法看到 | smoke-01-menu.png | Fixed (menu.js) |
| UX-02 | Medium | 第1关解锁图标看起来像"✗"(截图渲染问题) | smoke-02-levels.png | Closed — emoji 🐏 渲染问题，非设计错误 |
| UX-03 | Low | 30个锁定关卡构成"padlock wall"，可加视觉分组提升感知进度 | smoke-02-levels.png | Backlog |
| UX-04 | Low | "← 返回"按钮视觉上偏小，tap 区域需确认 ≥44px | smoke-02-levels.png | Backlog |

## Fix Applied — UX-01
`menu.js`: `startY = H * 0.84` → `startY = H - 180`（固定像素保证三个按钮始终在屏幕内）
同时将标题从 `H * 0.76` 上移到 `H * 0.72`，保持视觉间距。

## Evidence
- `docs/qa/sprint1-mini-evidence/smoke-01-menu.png`
- `docs/qa/sprint1-mini-evidence/smoke-02-levels.png`
- `docs/qa/sprint1-mini-evidence/levels-full.png`

## Confidence: MEDIUM
核心屏幕已验证。游戏玩法、通关界面、展厅、商店未在本 Sprint 实现，无法验证。
