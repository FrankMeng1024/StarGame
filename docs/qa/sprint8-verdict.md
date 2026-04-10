# QA Verdict — Sprint 8

**Sprint**: 8
**Sprint Goal**: VU closure — gallery metadata + menu mute button
**Verdict**: PASS
**QA Subagent**: claude-opus-4-6
**Date**: 2026-04-11

## Per-Story Results

| Story | Verdict | Confidence | Failing ACs |
|-------|---------|------------|-------------|
| STORY-00030 | PASS | HIGH | none |
| STORY-00031 | PASS | HIGH | none |

## STORY-00030: Gallery Detail Structured Metadata

All ACs verified:
- ✅ Metadata section visible with 3 rows: 所属天区, 最佳观测时间, 主要星星
- ✅ All 30 constellations have non-empty values (verified via DOM check: total=30, missing=[])
- ✅ Orion metadata displays correctly after completing Level 1
- ✅ Styled with dark card background, gold labels, white values — consistent with design system
- ✅ Zero JS errors in console after gallery-detail navigation

Evidence: docs/qa/sprint8-evidence/STORY-00030-03.png (Orion detail with metadata), STORY-00030-05.png (locked state)

## STORY-00031: Mute Button Accessible from Main Menu

All ACs verified:
- ✅ Mute button (#menu-mute-btn) visible on main menu screen, non-zero size (confirmed via accessibility snapshot showing 🔊 text)
- ✅ Toggle works: 🔊 → 🔇 → 🔊 — icon updates on each click, no JS errors
- ✅ Mute state persists when entering a level — in-game HUD shows 🔇 after menu mute set
- ✅ Button styled consistently — top-right corner of menu card, dark semi-transparent background
- ✅ Zero JS errors after clicking mute button on menu

Note: Custom star cursor (★ element) visually overlaps button in screenshots at natural resting position — this is the pre-existing cursor, not a button issue. Button content confirmed via accessibility snapshot (DOM text 🔊/🔇).

Evidence: docs/qa/sprint8-evidence/STORY-00031-01.png (🔊 visible), STORY-00031-02a.png (after toggle), STORY-00031-02b.png (restored), STORY-00031-03.png (state persisted in-game), NAV-C4.png (mute preserved after nav round-trip)

## Navigation Regression

Menu→Levels→Game→Complete→Levels→Menu→Gallery→Gallery-Detail→Gallery→Menu: ALL CLEAN, 0 JS console errors.
Mute state round-trip: mute on menu → enter game → return to menu → state preserved. ✓

## Bugs Found

None.

## Untested Paths

- Actual audio muting behavior (audio not testable via screenshots — visual toggle confirmed)
- Metadata for all 30 constellations individually (DOM batch check confirmed all non-empty)
- Narrow viewport metadata card readability (primary viewport 390×844 tested)
