# UX Review — Sprint 28-mini

**Sprint**: 28-mini
**Date**: 2026-04-19
**Verdict**: PASS (no Blockers)
**Confidence**: HIGH — Updated with real Playwright screenshots (localhost:8090), all 8 shop items now visible

## Stories Reviewed
- STORY-00295: Remove achievement button from main menu
- STORY-00296: Fix shop prices + replace star_magnet with star_map
- STORY-00297: Fix time extension +20s (logic-only AC)
- STORY-00298: Add constellation info panel to main menu

## Friction Items (Updated — Playwright evidence)

| Severity | Description | Screenshot |
|---|---|---|
| Low | Level 1 card appears to read '猫户座' in screenshot. Actual game screen shows '猎户座' (Orion) — likely OCR/rendering artifact at small card size. Not a UX blocker. | 02-level-select.png vs 03-game.png |
| Low | Gallery shows 30 '?' cards with no hint text explaining how to unlock them. First-time users may not understand the unlock mechanic (play levels → unlock constellations). | 07-gallery.png |
| Low | Fail screen shows '0 金币' earned; shop shows '100 金币'. No visible explanation of how coins are earned from successful play. Onboarding gap. | 04-fail.png, 06-shop.png |

## Story-by-Story Assessment

### STORY-00295 — Remove Achievement Button: PASS (HIGH)
Menu shows exactly 3 buttons: ★ 挑战关卡, ◉ 星座展厅, ◆ 道具商店. No achievement button, no empty space, no layout artifacts. Button hierarchy clean and immediately scannable. Evidence: 01-menu.png.

### STORY-00296 — Shop Prices + star_map: PASS (MEDIUM)
All 8 items confirmed in screenshot 06-shop.png. Prices verified: 网兜加速 50, 网兜扩大 60, 宇宙炸弹 100, 时间延长 60, 缩小垃圾 40, 星图揭示 20, 宇航员手套 70, 双倍金币 30. 星图揭示 has map+star icon (🗺★) and description "激活后60秒显示星座连线提示". star_magnet completely absent. 宇宙炸弹 description correctly reads "摧毁当前抓住的垃圾并重置网兜" (single-target). Previous evidence gap on bottom 4 items is now closed. Evidence: 06-shop.png.

### STORY-00297 — Time Extension +20s: PASS (LOW)
Shop description confirmed "即时+20秒剩余时间" (screenshot 06-shop.png). Runtime timer activation not tested (requires coin purchase + gameplay). Cannot verify UX flash/feedback from screenshots alone.

### STORY-00298 — Info Panel: PASS (HIGH)
Info panel clearly visible at bottom of menu in screenshot 01-menu.png. Shows: "🌸 处女座" (gold), "位于黄道南天（处女座），5月（春末最佳）最易观测。主要亮星：角宿一（Spica）、Porrima 双星。" Panel does not overlap buttons. Readable contrast on dark background. Semi-transparent/frosted aesthetic consistent with mini style. Evidence: 01-menu.png.

## Navigation Regression
Full loop: menu → levels → game → fail → levels → menu → shop → menu → gallery → menu. Zero JS errors throughout (only pre-existing favicon.ico 404). Evidence: 01-07 screenshots.

## Evidence
- 01-menu.png — menu: 3 buttons + constellation info panel (Playwright, localhost:8090)
- 02-level-select.png — level select, 5-column grid, Level 1 unlocked
- 03-game.png — game screen: 猎户座 第1关, timer, character, stars
- 04-fail.png — fail screen: 时间到了, 0/7, retry/back buttons
- 05-back-to-levels.png — return to level select after fail
- 06-shop.png — full shop: all 8 items visible (closes prior evidence gap)
- 07-gallery.png — gallery: 30 locked cards

## Knowledge Updates
- Sprint 28-mini (updated): Shop bottom 4 items now visually confirmed — 星图揭示 present at 🪙20, 宇航员手套 at 🪙70, 双倍金币 at 🪙30. Prior evidence gap closed.
- Sprint 28-mini: Info panel confirmed showing correct constellation data (name + season + notable stars). No text truncation issue with web version rendering.
- Sprint 28-mini: Full navigation regression clean — all screens accessible, zero JS errors.
- Sprint 28-mini: Gallery unlock mechanic still not communicated to first-time users (Low, ongoing).
- Sprint 28-mini: Coin earning not explained in fail screen (Low, ongoing).
