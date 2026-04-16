# Arch Code Review — Sprint 12-mini

**Sprint**: Sprint 12-mini
**Story**: STORY-00241
**Verdict**: PASS
**Date**: 2026-04-16

## Issues
None.

## Spec Drift
- `constellations.js` migrated from single `photo: url` field to `photos: [url1, url2, url3]` array. `gallery.js` preserves backward compatibility via `c.photos || (c.photo ? [c.photo] : [])` fallback. API_SPEC.md documents `photos: []` (or legacy `photo:`), so this is an expected evolution. Confirmed fixed.

## Notes
- Stale-callback guard correct: `_carouselForIdx === constellationIdx` check inside onload/onerror
- Carousel state reset on all three navigation paths verified
- Scroll offset math `ty + _detailScrollY - (G.SAFE_TOP + 58)` geometrically correct
- Boundary clamping at pos 0 and pos < photos.length - 1 correct
- All Wikimedia Commons CDN URLs (proven safe from Sprint 11)
