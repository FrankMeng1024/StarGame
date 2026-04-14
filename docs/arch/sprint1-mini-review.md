# Arch Code Review — Sprint 1-mini

**Verdict**: FAIL → fixed → **PASS (post-fix)**
**Reviewer**: Arch subagent
**Date**: 2026-04-14

## Issues Found

### Blockers (2) — all fixed

| # | Description | Fix |
|---|-------------|-----|
| B1 | Circular module dependency: `app.js` ↔ `screens/*.js` ↔ `canvas-utils.js` via `../../app.js` imports. `SCREEN_W/SCREEN_H` consumed at module-level in `levels.js` for `CARD_W/CARD_H`, would be `undefined` at evaluation time → `NaN` layout. | Extracted to `js/engine/globals.js`. `initGlobals()` called by `app.js` on first line. All modules import from `globals.js`. |
| B2 | `typeToColor()` returns hex `#rrggbb` but `menu.js _drawConBg` assumed `rgb()` format for gradient alpha injection. Produced invalid colorStop strings → constellation glow broken every frame. | Added `_hexToRgba(hex, alpha)` helper in `menu.js`, replaced broken string manipulation. |

### Critical (3) — 2 fixed, 1 false positive

| # | Description | Resolution |
|---|-------------|------------|
| C1 | Save data double-wrapping concern (POST `{data:save}` stored as `{data:save}` in JSON col). | **False positive**: backend extracts inner `data` field before `JSON.stringify`. MySQL JSON col auto-parses on SELECT. Client `remote.data` correctly receives the flat save object. No fix needed. |
| C2 | Missing env var validation at startup — `JWT_SECRET` undefined could cause `jwt.sign` to throw; undefined secret is security risk. | Fixed: `REQUIRED_ENV` check array added to `backend/src/app.js`, process exits with clear error if any missing. |
| C3 | `playSFX` leaked `InnerAudioContext` on play failure (no `onError` handler). | Fixed: added `sfx.onError(() => sfx.destroy())`. |

### Medium (6) — logged, lower priority

| # | Description | Action |
|---|-------------|--------|
| M1 | `canvas-utils.js` had unused imports from `app.js`. | Removed entirely (fixed as part of B1). |
| M2 | `_roundRect` duplicated in `levels.js` and `canvas-utils.js`. | Deferred to Sprint 2 cleanup. |
| M3 | `state.currentScreen` defined in `API_SPEC.md` but not in miniprogram `state.js`. | Mini game uses `navigate()` function for routing — `currentScreen` state is unnecessary. Logged as spec drift: `API_SPEC.md` is the original HTML5 contract, not the mini game contract. Not a defect. |
| M4 | Navigate key `'levels'` vs `API_SPEC.md` `'levelSelect'`. | Mini game uses new naming convention. `API_SPEC.md` reflects original HTML5 project. Not a defect. |
| M5 | Button layout fixed pixel sizes may overflow on very short screens (iPhone SE). | Deferred to Sprint 2 — percentage-based layout is used for Y positions; risk is low. |
| M6 | `wx.getStorageSync` may return corrupted values without validation in `loadSave()`. | `fromSaveData()` uses `??` fallback on every field — partial corruption handled gracefully. |

## Spec Drift

| Description | Status |
|-------------|--------|
| `API_SPEC.md` navigate keys (`levelSelect` vs `levels`) | Expected: mini game uses new routing. Not drift. |
| `state.currentScreen` not in mini game state | Expected: mini game uses function-based routing. Not drift. |
| `typeToColor` hex format assumption | Fixed (B2). |

## Final Verdict: PASS
All Blockers and Critical issues resolved. Medium items logged for Sprint 2.
