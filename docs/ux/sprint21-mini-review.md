# UX Review — Sprint 21-mini

**Sprint**: 21-mini
**Date**: 2026-04-17
**Confidence**: HIGH (code-path analysis — WeChat Mini Game canvas, no screenshots)

## Summary
Sprint 21-mini fixes 3 production-reported issues. All buttons now functional (DPR fix reverted), QR scan launch shows content immediately, home screen buttons are visually premium. Primary user flow is fully completable.

## Friction Items

| Severity | Description |
|----------|-------------|
| Low | Menu buttons have no visual pressed/tap state — navigation starts immediately with no button feedback. Pre-existing gap, more noticeable now buttons are functional. |
| Low | Achievement button uses old `drawButton()` renderer (60% alpha) while the 3 main buttons use `_drawMenuButton`. Style mismatch is intentional (tertiary action) but may feel inconsistent. |
| Low | docs/ux/knowledge.md Sprint 20 section incorrectly describes `* G.DPR` pattern — fixed in STORY-00269 but knowledge doc needs update. |

## No Blocker or Critical UX Issues

## Feature Assessment

### STORY-00269 — Touch fix
All 6 screens verified. Touch coord space is now correct (CSS px = CSS px). Full primary flow is navigable. Every button, tap, and scroll interaction across menu/levels/game/gallery/shop/achievement works at code level.

### STORY-00271 — QR scan fix
`sysInfo.windowWidth` (always non-zero) + `requestAnimationFrame` deferral. User experience: scan QR → 1 frame of background → intro animation → meteor shower → constellation reveal → menu. No black screen gap.

### STORY-00270 — Button visual redesign
3-tier hierarchy established:
- **Primary** (挑战关卡): bright `#c044ff→#6622cc`, gold border, strong shadow, golden text `#ffe566`
- **Secondary** (星座展厅, 道具商店): darker `#8833cc→#441188`, purple border, soft text `#f0e0ff`
- **Tertiary** (achievement, old drawButton, 60% alpha): clearly subordinate

Glass highlight + icon prefix (★ ◉ ◈) provide polish and recognition. Standard 3-tier pattern — first-time users naturally drawn to primary CTA.
