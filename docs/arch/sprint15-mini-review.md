# Arch Code Review — Sprint 15-mini

**Sprint**: Sprint 15-mini  
**Date**: 2026-04-17  
**Initial Verdict**: FAIL → **Final Verdict**: PASS (after 3 fixes)

## Stories Reviewed
- STORY-00245: 游戏音效 — SFX calls in game.js
- STORY-00246: 通关卡片展示星座照片
- STORY-00247: wx.onHide 自动暂停游戏
- STORY-00248: 关卡难度指示条
- STORY-00249: 成就页 — 30星座通关网格

## Issues Found and Fixed

### Blocker (Fixed) — drawBgStars wrong signature in achievement.js
**Story**: STORY-00249  
**Description**: `achievement.js _loop()` called `drawBgStars(ctx, W, H)` but the function signature is `drawBgStars(ctx, t)` where `t` is time in seconds. Passing screen width (~844) as the time parameter caused stars to animate at extreme speed.  
**Fix**: Changed `_loop()` to `_loop(now)`, computed `t = (now || 0) * 0.001`, called `drawBgStars(ctx, t)`.

### Critical (Fixed) — wx.onHide listener leak
**Story**: STORY-00247  
**Description**: `wx.onHide()` stacks callbacks — every call to `showGame()` (retry, replay, next level) added another listener. After N retries, N callbacks fire on hide.  
**Fix**: Stored callback in `_onHideCb` module variable, called `wx.offHide(_onHideCb)` in `_cleanup()`, called `wx.onHide(_onHideCb)` in `showGame()` after deregistering previous.

### Critical (Fixed) — AudioAdapter.playSFX() ignored mute state
**Story**: STORY-00245  
**Description**: `playSFX()` unconditionally played SFX even when user muted audio.  
**Fix**: Added `if (AudioAdapter.isMuted()) return;` at top of `playSFX()`.

### Medium (Acceptable) — Inline _roundRect in achievement.js
**Story**: STORY-00249  
**Description**: achievement.js has its own `_roundRect()` helper instead of importing from canvas-utils.  
**Verdict**: Acceptable — avoids potential circular dependency; behavioral equivalence confirmed. Deferred to backlog as minor duplication.

## Verdict
PASS — All Blocker and Critical issues fixed. Code is architecturally sound.
