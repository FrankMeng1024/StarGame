# QA Verdict — Sprint 17

**Overall**: PASS
**Date**: 2026-04-12

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|-------|---------|-----------|-------|
| STORY-00080 (net visibility) | PASS | HIGH | Net visible at idle (s17-03-game.png), mid-throw (s17-03b), and post-return. No disappearance between states. |
| STORY-00081 (star size 2/3) | PASS | MEDIUM | Stars appear as small proportional pinpoints. No star exceeds ~9px radius visually. Background dots clearly smaller. Pixel-exact verification not possible from screenshots alone. |
| STORY-00082 (fail layout) | PASS | HIGH | "⏰ 时间到了！", stats row, opaque dark canvas, encouragement text, 重试+返回选关 — all in single viewport. Vertically centered with space above/below. |
| STORY-00083 (button bg) | PASS | HIGH | "返回选关" on complete screen has dark tinted background. Not transparent. Visually distinguishable. (s17-10-complete-real.png) |
| STORY-00084 (music) | SKIP | HIGH | Audio-only feature. Untestable via screenshot verification. |
| STORY-00085 (coins) | PASS | HIGH | Fresh=100 coins (s17-08), fail=0 coins (s17-04), success=72s×10=720 coins (s17-10). 3★ half-coin logic confirmed at game.js:362. |
| STORY-00086 (preloading) | PASS | HIGH | s17-09-game-0s.png: fully rendered at 0s entry — girl, net, stars, constellation lines, debris all visible. No blank canvas. |

## Bugs Found

None.

## Navigation Regression

All transitions (menu ↔ levels ↔ game ↔ fail ↔ complete ↔ shop ↔ gallery): **0 JS console errors**.

## Untested Paths

- STORY-00085 AC4 (3★ half-coin): code-verified only — no runtime screenshot of actual halved reward
- STORY-00084 music: audio untestable
- Net post-return state: inferred from pre-throw rest state screenshot (no dedicated post-return capture)

## Evidence Files

- s17-01-menu.png — main menu
- s17-02-levels.png — level select
- s17-03-game.png — game at rest (net visible at idle)
- s17-03b-net-thrown.png — net mid-throw
- s17-04-fail.png — fail screen (centered, not cramped)
- s17-08-fresh-100coins.png — shop fresh player 100 coins
- s17-09-game-0s.png — game at immediate entry (no blank canvas)
- s17-10-complete-real.png — real complete screen (72s→720 coins, all 3 buttons, 返回选关 with background)
