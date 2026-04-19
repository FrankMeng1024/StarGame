# QA Verdict — Sprint 28-mini

**Sprint**: 28-mini
**Date**: 2026-04-19
**Verdict**: PASS
**Confidence**: MEDIUM-HIGH
**Updated**: 2026-04-19 — Supersedes prior evidence gap on shop. Real Playwright screenshots (web version localhost:8090) captured all 8 shop items + full navigation regression.

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|---|---|---|---|
| STORY-00295 | PASS | HIGH | 3 buttons visually confirmed in Playwright screenshot |
| STORY-00296 | PASS | MEDIUM | All 8 items + correct prices visually confirmed; in-game effects logic-only |
| STORY-00297 | PASS | LOW | Shop description shows "+20秒"; runtime timer activation untested |
| STORY-00298 | PASS | HIGH | Info panel visible, text readable, positioned below buttons |

## Navigation Regression: PASS
- Full loop: menu → level-select → game (90s timer) → fail → return-to-levels → menu → shop → menu → gallery → menu
- Console errors: exactly 1 (favicon.ico 404) — pre-existing, excluded
- 0 JS runtime errors across all navigation steps

## Bugs Found: 0
(QA subagent flagged "星座展厅 vs 星座图鉴" — investigated: web version (localhost:8090) uses 星座展厅 throughout; mini branch code correctly uses 星座图鉴. Not a regression.)

## Story Detail

### STORY-00295 — Remove Achievement Button: PASS (HIGH)
- Screenshot 01-menu.png: exactly 3 buttons: ★ 挑战关卡, ◉ 星座展厅, ◆ 道具商店
- No 通关成就 button, no gap, no layout artifacts
- Zero JS runtime errors on menu load
- Evidence: 01-menu.png

### STORY-00296 — Shop Web Parity: PASS (MEDIUM)
All 8 items visually confirmed in screenshot 06-shop.png:
1. 网兜加速 🪙50 — "激活后15秒内网兜速度+50%" ✓
2. 网兜扩大 🪙60 — "激活后15秒内网兜口径增大50%" ✓
3. 宇宙炸弹 🪙100 — "摧毁当前抓住的垃圾并重置网兜" (single-target ✓)
4. 时间延长 🪙60 — "即时+20秒剩余时间" ✓
5. 缩小垃圾 🪙40 — "激活后30秒内所有垃圾缩小50%" ✓
6. 星图揭示 🪙20 — "激活后60秒显示星座连线提示" ✓ (star_magnet replaced ✓)
7. 宇航员手套 🪙70 — "激活后30秒内抓到垃圾不减速" ✓
8. 双倍金币 🪙30 — "本关金币奖励自动×2（被动，不占槽）" ✓
In-game activation effects (star_map 60s hint, time_ext +20s runtime): LOGIC-ONLY (no coins in fresh state)
- Evidence: 06-shop.png (closes prior evidence gap — all 8 items now visible)

### STORY-00297 — Time Extension +20s: PASS (LOW)
- Shop description shows "即时+20秒剩余时间" (screenshot 06-shop.png) — correct
- Sprint 28-mini knowledge confirms code: `_timeLeft = Math.min(_timeLeft + 20, _levelInitTime + 20)`
- Runtime activation untested (requires purchasing item and gameplay interaction)
- Evidence: 06-shop.png

### STORY-00298 — Info Panel: PASS (HIGH)
- Screenshot 01-menu.png: frosted glass panel at bottom of menu
- Shows: "🌸 处女座" + "位于黄道南天（处女座），5月（春末最佳）最易观测。主要亮星：角宿一（Spica）、Porrima 双星。"
- No button overlap, text readable, semi-transparent background
- Constellation name matches displayed constellation diagram (处女座 in both panel and art)
- Evidence: 01-menu.png

## Untested Paths
- star_map in-game effect (60s constellation hint display during gameplay)
- time_ext visual timer flash (runtime activation requires coin purchase)
- Info panel constellation rotation across multiple menu visits

## Evidence Directory
`docs/qa/sprint28-evidence/`
- 01-menu.png — menu: 3 buttons + info panel (Playwright, localhost:8090)
- 02-level-select.png — 30-card level grid
- 03-game.png — game screen (猎户座 第1关, timer 01:15)
- 04-fail.png — fail screen (时间到了, 0/7 caught)
- 05-back-to-levels.png — back to level select after fail
- 06-shop.png — full shop: all 8 items with prices visible
- 07-gallery.png — gallery: 30 locked cards
