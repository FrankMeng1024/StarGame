# Arch Code Review — Sprint 21-mini

**Sprint**: 21-mini
**Date**: 2026-04-17
**Verdict**: PASS

## Issues

| Severity | Description | Story |
|----------|-------------|-------|
| Medium | Stale comment in globals.js line 17: `DPR: 1, // device pixel ratio — clientX/Y must be multiplied by this to get canvas px` contradicts STORY-00269 fix. Updated to clarify canvas and touch coords are both CSS pixels, no scaling needed. | STORY-00269 |

## Spec Drift Confirmed Fixed

- **STORY-00269**: All 21 instances of `* G.DPR` removed across 6 screen files. Coordinate system is fully consistent: canvas.width = CSS px, touch.clientX/Y = CSS px, hitTest = CSS px rects. No DPR conversion in pipeline. ✓
- **STORY-00271**: game.js now uses `sysInfo.windowWidth || 375` (reliable at cold boot) instead of `canvas.width || sysInfo.windowWidth`. `navigate()` deferred to `requestAnimationFrame` so canvas dimensions are committed before first render. ✓
- **STORY-00270**: `_drawMenuButton` returns `{x,y,w,h}` — identical contract to `drawButton`. hitTest unchanged. Shadow reset before stroke/text prevents bleed. Colors consistent with UI_SPEC (purple primary, gold accents). ✓

## Logic Analysis
All three changes are mechanically correct. No security issues. Interface contracts maintained.
