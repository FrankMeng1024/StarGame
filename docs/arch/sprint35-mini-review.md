# Arch Code Review — Sprint 35-mini

**Verdict**: PASS
**Sprint**: Sprint 35-mini
**Stories**: STORY-00316, STORY-00317, STORY-00318, STORY-00319

## Issues

| Severity | Story | Description |
|---|---|---|
| Medium | STORY-00319 | `_wrapText` called with `cardW` (no padding). Lore text renders edge-to-edge within content area. Not a bug — deliberate change from `cardW-16`. Consider adding 8px left padding in lore text rendering for visual breathing room. |
| Medium | STORY-00319 | `_computeDetailHeight` still uses hardcoded `contentW = W - 32` while draw code uses safe-area-aware `cardW = W - SL - SR`. On notched landscape devices, scroll limit may be slightly under-estimated. Minor clip at bottom on notch devices. |

## Spec Drift
None.

## Review Notes

**STORY-00316**: Fixed Orion (`CONSTELLATIONS[0]`) is safe and matches HTML version intent. Star radius range `[3,8]` handles all magnitude values correctly. No crash risk.

**STORY-00317**: Button height and spacing increases are pure layout constants. Portrait `3*52 + 2*16 = 188px` comfortably fits within screen height minus safe areas.

**STORY-00318**: `nameZh.slice(0,2)` is safe on all constellation entries. 5-column grid with dynamic card width computes correctly for 88 constellations across 18 rows.

**STORY-00319**: Safe area lifecycle for `_detailBottomBackRect` (init → draw → hitTest → cleanup) is complete and correct. Scroll-adjusted touch `scrolledTY = ty + _detailScrollY - CLIP_TOP` correctly maps screen-space to content-space. Security: no XSS vectors, `wx.createImage()` has 8s timeout + error handler.

All changes are Canvas 2D only, no DOM ops, no API calls. Touch coordinates follow STORY-00269 convention (clientX/clientY, no DPR scaling).
