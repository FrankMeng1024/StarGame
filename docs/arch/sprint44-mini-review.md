# Arch Code Review — Sprint 44-mini

**Sprint**: Sprint 44-mini
**Stories**: STORY-00338, STORY-00339, STORY-00340
**Verdict**: PASS

## Review Summary

Changes span `miniprogram/js/screens/menu.js` and `miniprogram/js/engine/canvas-utils.js`.

### STORY-00338 — Ma Shan Zheng font in menu
- `wx.loadFontFace()` wrapped in `try/catch` + `typeof` guards (identical defensive pattern to intro.js)
- Module-level `_maShanZhengLoaded` flag prevents redundant network requests
- Title rendered directly in `_loop()` with `font='Ma Shan Zheng', serif`, `fillStyle='#e8d5ff'`, `shadowColor='#b090ff'`
- `drawTitle()` shared function in canvas-utils.js unchanged — no regression risk for other screens

### STORY-00339 — Random constellation + reveal animation
- `_pickCon()` uses `Math.random()` with `_lastConIdx` dedup guard — correct
- `revealTime = i * 0.12` stagger added at `_buildConLayout()` time
- `_drawConBg(t, elapsed)` gates star and line drawing on elapsed time — mirrors intro.js Phase 2 logic
- Line reveal uses `ln.ai/ln.bi` indices stored on line objects — correct, no out-of-bounds risk (`filter(Boolean)` before storage)
- `_menuStartTime` reset in both `showMenu()` and `_cleanup()` — no stale state on re-entry

### STORY-00340 — Sin-hash starfield in canvas-utils
- `_bgHash()` function added to canvas-utils.js — same formula as intro.js, no divergence
- `initBgStars(w, h, seed)` signature change: `seed` is optional (default 0) — backwards compatible
- All call sites in menu.js updated to pass `Date.now() % 100000`
- 3-tier structure (105+45+18=168) matches intro.js exactly
- Large stars bias toward upper 80% of screen (`h * 0.8`) — preserves sky feel

### Issues
None.

### Spec Drift
None — canvas-utils.js changes are backwards compatible; `drawTitle()` not modified.
