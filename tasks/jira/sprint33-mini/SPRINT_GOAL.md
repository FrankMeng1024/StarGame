# Sprint 33-mini — Sprint Goal

**Sprint**: 33-mini
**Branch**: mini
**Date**: 2026-04-20

## Goal

Web vs Mini cross-platform parity — align mini-game visual quality and UX to match the web game across all screens: shop layout, fail screen, game HUD, and menu styling.

## Stories

| Story | Title | Points | Owner | Status |
|---|---|---|---|---|
| STORY-00309 | 商店网格布局 — mini版与web版2×N卡片对齐 | 3 | Frontend Dev | Todo |
| STORY-00310 | 失败界面增强 — 统计行+个性化鼓励文字 | 2 | Frontend Dev | Todo |
| STORY-00311 | 游戏HUD对齐 — 顶部计时器居中+星标右侧 | 2 | Frontend Dev | Todo |
| STORY-00312 | 主菜单视觉对齐 — 按钮样式/背景层级与web一致 | 2 | Frontend Dev | Todo |

## Gap Analysis (from screenshots)

### Screenshot Evidence
- Web screenshots: `docs/qa/sprint33-evidence/s33-web-*.png`
- Mini screenshots: `docs/qa/sprint33-evidence/s33-mini-*.png`

### Identified Gaps

**GAP-1: Shop layout** (Critical)
- Web: 2×4 grid of rich cards (icon + name + description + 主动/被动 badge + duration + price + 购买 button)
- Mini: Vertical list rows (smaller, less detail, no 主动/被动 badge, no duration badge)
- Missing in mini: grid layout, 主动/被动 badge, duration badge (15秒/即时/30秒 etc.)

**GAP-2: Fail screen** (Medium)
- Web: card with stats row (0/7已抓 · 0秒剩余 · 0金币), constellation silhouette image, personalized flavor text ("猎户座跑得太快了，再来一次！✨"), two pill buttons
- Mini: dialog with "还差6颗星" text + constellation line art + 重试/选关 buttons
- Missing in mini: stats row (已抓/剩余秒/金币), personalized flavor text, pill-style buttons

**GAP-3: Game HUD** (Medium)
- Web: timer circle in top-center, star count top-right (★ 0/7), level name top-left, ⚙ + 🔇 icons
- Mini: star count top-left (✦ 0/7 + 猎户座), timer top-center (1:24 plain text), ··· top-right
- Gap: star count position (left vs right), timer style (plain text vs circle), no pause ⚙ icon on mini

**GAP-4: Menu button style** (Low)
- Web: buttons have gradient purple fill + slightly transparent dark background
- Mini: buttons are solid purple with no transparency, slightly different proportions
- Gap: minor style difference, acceptable given platform constraints

## Capacity Decision
4 Stories × ~2-3 days each = fits in one Sprint (8-9 points total).
GAP-4 is Low priority — included as STORY-00312 but can be descoped if needed.
