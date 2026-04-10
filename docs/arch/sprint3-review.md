# Arch Code Review — Sprint 3

**Sprint**: 3
**Date**: 2026-04-10
**Initial Verdict**: FAIL (1 Critical, 3 Medium)
**Final Verdict**: PASS (after fixes)

---

## Initial Review Findings

| Severity | Story | Description | Status |
|----------|-------|-------------|--------|
| Critical | STORY-00012 | `--text-secondary` undefined in CSS (`.shop-type-legend`, `.shop-owned-count`) — should be `--text2` | Fixed |
| Medium | STORY-00010 | `_handleFail` elapsed time hardcoded to `90 - engine.timeLeft` instead of `engine.startTime - engine.timeLeft` | Fixed |
| Medium | STORY-00010 | Null-engine fallback also hardcoded to `90` | Fixed |
| Medium | STORY-00011 | `refreshLevels()` re-render missing `.card-score-stars` span | Fixed |
| Medium | STORY-00013 | Penalty text uses canvas pixel coordinates as CSS position — potential misalignment | Investigated: not a bug — canvas.width = screen.clientWidth, coordinate spaces match. Logged in Story Notes. |

---

## Fixes Applied

1. `css/main.css`: `.shop-type-legend` and `.shop-owned-count` color → `var(--text2)`. Consistent with all other secondary text usages.
2. `js/screens/game.js` `_handleFail`: `Math.floor(engine.startTime - engine.timeLeft) : (engine?.startTime ?? 90)`. Correctly uses variable start time.
3. `js/screens/levels.js` `refreshLevels()`: Added `state.getScore(idx)` and conditional `card-score-stars` span. Now mirrors `initLevels()` template exactly.

---

## Spot-check Result

All fixes confirmed clean. No new issues introduced. No contract violations.

**Final verdict: PASS**
