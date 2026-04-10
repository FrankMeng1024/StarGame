# QA Verdict — Sprint 3

**Sprint**: 3
**Date**: 2026-04-10
**Verdict**: PASS
**Confidence**: HIGH

---

## Per-Story Verdicts

| Story | Title | Verdict | Notes |
|-------|-------|---------|-------|
| STORY-00010 | 难度时限 | PASS | Difficulty 1 → 01:30 (90s), Difficulty 2 → 01:20 (80s). TIME_BY_DIFFICULTY mapping verified. |
| STORY-00011 | 星级评分 | PASS | Level cards show earned star rating (★★★, ★★☆) for completed levels; no stars for unplayed levels. Complete screen shows starStr in title. |
| STORY-00012 | 商店UX | PASS | Type legend present, coin balance 200 shown, owned count "持有: ×0" visible by default, updates to "持有: ×1" after purchase, balance deducts correctly (200→180 for 20-coin item). |
| STORY-00013 | HUD警告+垃圾惩罚 | PASS | `.hud-timer.warning` class toggles at ≤10s. `.penalty-text` CSS: animation `penalty-float` active, color rgb(239,68,68). `_showPenaltyText` and `timeLeft -= 1` implemented in engine._processCatch. |

---

## Navigation Regression

All transitions PASS, zero JS runtime errors:
- game → levels: ✓
- levels → game: ✓
- game → shop: ✓
- shop → levels: ✓
- menu → gallery: ✓

Console errors: 44 total — exclusively Google Fonts woff2 network failures (offline env) + 1 favicon 404. Zero JS runtime errors.

---

## AC Coverage

### STORY-00010
- [x] Level difficulty 1 → 90s timer
- [x] Level difficulty 2 → 80s timer
- [x] TIME_BY_DIFFICULTY mapping applied at engine init

### STORY-00011
- [x] Completed level cards display earned star rating
- [x] Unplayed level cards show no score stars
- [x] Complete screen title includes star rating string

### STORY-00012
- [x] Type legend present at top of shop grid
- [x] Coin balance visible in header
- [x] Owned count always visible (×0 when not owned)
- [x] Owned count updates after purchase (×0 → ×1)
- [x] Balance deducted correctly on purchase

### STORY-00013
- [x] HUD timer applies `.warning` class at ≤10s
- [x] `.penalty-text` element styled with red color + float animation
- [x] `penalty-float` keyframe animation defined in CSS
- [x] `_showPenaltyText` method creates DOM element positioned at catch site
- [x] `timeLeft -= 1` applied on debris catch

---

## Bugs Found

None.

---

## Untested Paths

- Difficulty 3/4/5 time limits (no unlocked levels at those difficulties in test state — code logic verified directly in engine.js)
- Penalty text auto-removal after 1200ms (CSS animation handles visually; setTimeout remove verified in code)
- Timer warning pulse animation visual (CSS defined, toggle logic verified)

---

## Knowledge Updates

- `TIME_BY_DIFFICULTY` object in engine.js maps difficulty 1→90, 2→80, 3→70, 4→60, 5→50
- Shop navigation: accessed via `window.__navigate('shop')` or `.btn-shop` click (only on complete screen in normal flow)
- Penalty text positioned at `hit.obj.x`, `hit.obj.y - 20`, appended to `#screen-game`, removed after 1200ms
- Star rating stored as `{ stars: N, time: T }` under `levelScores[idx]` in localStorage key `starcatcher_save`
