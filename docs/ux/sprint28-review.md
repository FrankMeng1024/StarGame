# UX Review — Sprint 28-mini

**Sprint**: 28-mini
**Date**: 2026-04-19
**Verdict**: PASS (no Blockers)
**Confidence**: MEDIUM (shop bottom items not captured in screenshots)

## Stories Reviewed
- STORY-00295: Remove achievement button from main menu
- STORY-00296: Fix shop prices + replace star_magnet with star_map
- STORY-00297: Fix time extension +20s (logic-only AC)
- STORY-00298: Add constellation info panel to main menu

## Friction Items

| Severity | Description | Screenshot |
|---|---|---|
| Medium | Shop scroll not captured — star_map (星图揭示, 20 coins) not visible in any screenshot. Item confirmed in code (shop.js:18). Evidence gap, not a design bug. | S28-SHOP-VERIFY.png |
| Low | Info panel notable star text truncated with ellipsis ("虚宿一（Sadalsuud）..."). Minor: full name could fit with slightly larger container or smaller font. | S28-POST-RELOAD-MENU.png |

## Story-by-Story Assessment

### STORY-00295 — Remove Achievement Button: PASS
Menu shows exactly 3 buttons: ★ 挑战关卡, ◉ 星座图鉴, ◆ 道具商店. No achievement button, no empty space, no layout artifacts. Button hierarchy is clean and immediately scannable. Screenshot: S28-MENU-FULL.png, S28-WIDE-CAPTURE.png.

### STORY-00296 — Shop Prices + star_map: PARTIAL (evidence gap, not a bug)
Visible shop items (网兜加速 50, 网兜扩大 60, 宇宙炸弹 100, 时间延长 60) match expected web prices. 宇宙炸弹 description correctly reads "摧毁当前抓住的垃圾并重置网兜" (single-target, web parity — Arch confirmed). star_map item confirmed in code but not visible in screenshots due to scroll position. No Blocker, no design issue.

### STORY-00297 — Time Extension +20s: PASS (logic-only AC)
No gameplay screenshot showing timer jump. Verified via code analysis (game.js: `_timeLeft = Math.min(_timeLeft + 20, _levelInitTime + 20)`). Cannot verify UX feedback (flash text) from static screenshots.

### STORY-00298 — Info Panel: PASS
Bottom info panel clearly visible on menu: frosted glass strip, constellation name ("♦ 水瓶座"), viewing tip ("10月（秋季最佳）是易观测"), notable star ("★ 虚宿一（Sadalsuud）..."). Panel does not overlap buttons. Panel persists correctly after navigate-away-and-return cycle (S28-WIDE-CAPTURE.png confirms). Educational value clear to a first-time user.

## Navigation Regression
DevTools console shows 0 errors, 0 warnings throughout all captured screenshots. Menu → level select → menu round-trip: info panel intact, 3-button layout intact.

## Evidence
- S28-MENU-FULL.png — menu, 3 buttons, no achievement
- S28-WIDE-CAPTURE.png — full canvas including info panel at bottom
- S28-LEVELS.png — level select, 6-column grid, first 3 unlocked
- S28-SHOP-VERIFY.png — shop top 4 items with correct prices
- FULL-GALLERY.png — gallery grid, 4-column, unlock states

## Knowledge Updates
- Sprint 28-mini: Main menu confirmed 3 buttons only — achievement button removed cleanly.
- Sprint 28-mini: Info panel added at menu bottom (frosted glass, name + season + notable star). Persists across navigation. Minor text truncation on notable star field.
- Sprint 28-mini: Shop prices verified for top 4 items (50/60/100/60). star_map at 20 coins confirmed in code, not captured in screenshots.
- Sprint 28-mini: 宇宙炸弹 description updated to single-target ("摧毁当前抓住的垃圾并重置网兜") — web parity achieved.
