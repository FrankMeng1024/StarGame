# UX Review — Sprint 8-mini

**Date**: 2026-04-16
**Sprint**: Sprint 8-mini
**Overall**: No Blocker friction items

## Friction Items
None.

## Notes
- All interactive elements (back buttons, menu buttons, HUD) shifted below notch — first-time users on notch phones will see full UI without obstruction
- On non-notch phones: G.SAFE_TOP = 0, identical to previous layout
- Menu buttons above home indicator: startY = H - G.SAFE_BOTTOM - 180 ensures 3 buttons + 8px margin above home bar
- Orientation stays portrait — correct for vertical pendulum throw mechanic

## Knowledge Updates
- Safe area handling now covers all 5 screens. No screen has hardcoded y=14 for back buttons; all use G.SAFE_TOP + 14.
- Device-specific safe areas are transparent to gameplay logic — only layout positions change.
