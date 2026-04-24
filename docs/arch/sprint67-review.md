# Arch Code Review — Sprint 67-mini

**Sprint**: 67-mini  
**Story**: STORY-00375  
**Verdict**: PASS  
**Reviewed by**: Arch subagent (claude-opus-4-6)

## Changes Reviewed

1. `miniprogram/assets/sprites/girl.png` — transparency flood-fill (binary asset, 129,520 bg pixels → alpha=0)
2. `miniprogram/js/screens/game.js` — three changes:
   - Added `_girlPrevFrame`, `_girlTransT`, `_girlTransStart`, `_GIRL_TRANS_MS=180` for cross-fade
   - `_drawGirl()` refactored: cross-fade via globalAlpha blend of prev+new frame in ctx.save/restore
   - `_drawNet()`: `showLen` 20→28 for swing, `swingAlpha=0.55`, removed early-return guard, bamboo always drawn

## Issues

None.

## Spec Drift

All three changes correct existing deviations from UI_SPEC, not introduce new drift:

| Deviation | Fix | Confirmed Fixed |
|-----------|-----|----------------|
| girl.png had opaque white/grey background, breaking sprite overlay on deep navy starfield | BFS flood-fill from 4 corners | ✅ |
| Net bag invisible during swing state — contradicted UI_SPEC "girl visibly swings her net" | Removed early-return guard, bamboo always drawn with swingAlpha | ✅ |
| Girl pose transitions were instantaneous frame-swaps — jarring, inconsistent with 奇幻+温暖 tone | 180ms cross-fade with alpha interpolation | ✅ |

## Notes

- Cross-fade math is correct: `t = min(1, (now - start) / 180)`, linear 0→1, clamped
- `ctx.save()/restore()` properly isolates globalAlpha changes from rest of draw pipeline
- `_cleanup()` resets `_girlTransT = 1.0` — no stale animation state on game reset
- All changes are pure Canvas 2D rendering: no new platform APIs, no security concerns
