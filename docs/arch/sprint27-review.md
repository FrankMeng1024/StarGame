# Arch Code Review — Sprint 27

**Sprint**: 27  
**Story**: STORY-00126  
**Commit**: 8903cd9  
**Date**: 2026-04-19  
**Verdict**: PASS

## Issues
None.

## Spec Drift
- `initMenuSky(conDef)` signature simplified — removed `altitudeDeg` and `isDefault` params. API_SPEC.md documents `initMenuSky(conDef)` which matches. **confirmed_fixed: true**
- Achievement button handler and `state.js` import removed from menu.js. Dead code removal, no contract impact. **confirmed_fixed: true**

## Review Notes
All 7 ACs of STORY-00126 verified against the diff:
- AC1 (no-location → random constellation, no text): Correct — `hasLocation=false` suppresses `locationLine`.
- AC2 (location available → lat/lon + 📍): Correct — `hasLocation=true` renders coordinates.
- AC3 (full-screen constellation): `BOX=0.82×min-dim`, `cy=H*0.46` — correct for Sprint 27 scope.
- AC4 (menu overlaid cleanly): Frosted glass strip at `z-index:1`, mute button at `z-index:10`. Correct.
- AC5 (全天星图 button removed): Button element physically removed from `index.html`. Correct.
- AC6 (zero console errors): No obvious error paths introduced. Runtime check = QA domain.
- AC7 (info panel shows name + tip): `_renderInfoPanel` receives `conDef` in both paths. Correct.

No logic errors, no security issues, interface contracts fully compliant.

Note: Later Sprints (28–31) made further changes to menu-sky.js under their own CRs (CR-081/082/083/084). Those changes are out of scope for this Sprint 27 review.
