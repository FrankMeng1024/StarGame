# Arch Code Review — Sprint 8-mini

**Date**: 2026-04-16
**Sprint**: Sprint 8-mini
**Verdict**: PASS

## Issues

| Severity | Description | Story Ref |
|---|---|---|
| Medium | Bottom safe area not applied to scroll extent in levels.js, gallery.js (list view), and shop.js. Max scroll is computed as `_totalH - G.SCREEN_H` without adding `G.SAFE_BOTTOM`, meaning the last row of content can be partially obscured by the home indicator on notch devices (e.g. iPhone X+ has ~34px home indicator). Fix: add `G.SAFE_BOTTOM` to `_totalH` in each `_computeLayout()`. | STORY-00229 |

## Spec Drift
None.

## Notes
- Safe area inset math in globals.js is correct for wx API's safeArea object.
- Fallback for undefined safeArea (older wx SDK) handled correctly.
- All HUD elements, back buttons, titles, star/debris spawn zones properly offset.
- Portrait orientation decision confirmed and documented.
