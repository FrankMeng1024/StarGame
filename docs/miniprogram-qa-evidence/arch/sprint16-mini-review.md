# Arch Code Review — Sprint 16-mini

**Sprint**: Sprint 16-mini  
**Date**: 2026-04-17  
**Initial Verdict**: FAIL → **Final Verdict**: PASS (after 2 fixes)

## Stories Reviewed
- STORY-00250: 开场动画 — 流星雨+星座揭示+标题淡入
- STORY-00251: 展厅星座星图 — 连线+光晕绘制
- STORY-00252: 游戏内道具计时HUD槽 — 触屏激活+倒计时
- STORY-00253: 道具ID对齐Web版

## Issues Found and Fixed

### Blocker (Fixed) — Time base mismatch in slot expiration
**Story**: STORY-00252  
**Description**: `_updateSlots(nowMs)` received RAF DOMHighResTimeStamp (~ms since page load, e.g. 50000 at 50s), but `slot.endTime` was set via `Date.now()` (Unix epoch, ~1.7 trillion). The comparison `nowMs >= slot.endTime` could never be true — timed item effects (net_speed, net_enlarge, shrink_debris, star_magnet, glove) would remain active for the entire level instead of their intended 15-30s.  
**Fix**: Added `const wallMs = Date.now()` at top of `_updateSlots`, comparison now uses matching wall clock.

### Critical (Fixed) — Double item consumption
**Story**: STORY-00252  
**Description**: `_activateSlot()` already calls `state.useItem(slot.id)` when an item is tapped. The old `_triggerResult()` code still iterated `state.selectedItems` and called `useItem()` again for all items — causing double consumption of activated items and incorrect consumption of un-activated items.  
**Fix**: Removed the `for...useItem` loop in `_triggerResult()`. Now only `state.selectedItems = []` is called. Items not activated (never tapped) are retained in inventory — deliberate design improvement (consume on use, not on select).

### Design note — Behavioral change (Acceptable)
**Story**: STORY-00252  
Previously: all selected items consumed at level end (win or lose). Now: only tapped items consumed. Un-activated items remain in inventory. No spec document mandates original behavior; this is better UX. Noted for traceability.

### Medium (Acceptable) — Intro meteor not dt-based
**Story**: STORY-00250  
**Description**: Meteor movement uses `m.vx * (1/60)` fixed step per frame. On 30fps devices meteors move at half speed; on 120fps at double speed. Accepted — cosmetic cinematic with skip, not gameplay.

## Verdict
PASS — All Blocker and Critical issues fixed. Code is architecturally sound.
