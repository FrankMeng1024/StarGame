# Arch Code Review — Sprint 10

**Verdict**: FAIL
**Reviewed by**: Arch subagent (claude-opus-4-6)
**Date**: 2026-04-11

---

## Issues

### Critical

**STORY-00038 — net_speed never reverts**
`_applySlotEffect('net_speed')` does `this.netSpeed *= 1.5` with no setTimeout or revert. Duration = 15s but speed multiplier is permanent for the rest of the level. Fix: add setTimeout revert (same pattern as shrink_debris).

**STORY-00038 — refreshLevels() bypasses showItemSelect**
`levels.js` `refreshLevels()` path (wires newly-unlocked cards) dispatches `level-select` CustomEvent directly instead of calling `showItemSelect(() => navigate('game'))`. After completing a level, clicking a freshly-unlocked card skips item selection — `state.selectedItems` retains stale values from previous game. `initLevels()` path is correct; `refreshLevels()` is not.

**STORY-00036 — star_magnet modifies s.x/s.y but not origX/origY**
After a magnetized star is caught, the particle burst fires at the magnetized position (s.x/s.y) but the dim persistence dot renders at the original spawn position (origX/origY). If the magnet moved the star substantially, the star "teleports" to its original position on catch — contradicts the constellation formation intent.

### Medium

**STORY-00038 — _isSlotActive returns true forever for instant items**
`duration === 0` short-circuits the time check, so space_bomb and time_ext slots appear "active" forever after use. Currently harmless but architecturally fragile.

**STORY-00034 — 星捕少女 still in spec docs**
API_SPEC.md line 1, PRD.md lines 1 and 31, UI_SPEC.md line 106 still reference old name. PRD.md line 31 is user-visible spec drift.

**STORY-00038 — shrink_debris setTimeout fires on stale engine**
If level ends before the 30s revert timer fires, the callback executes on a stopped engine. No throw, but a leak pattern.

---

## Spec Drift

- `selectedItems: []` not documented in API_SPEC.md state contract — **not fixed**
- Old name 星捕少女 still in API_SPEC.md header, PRD.md, UI_SPEC.md line 106 — **not fixed**
- API_SPEC GameEngine lifecycle `init/pause/resume/destroy` vs actual `constructor/start/stop` — **not fixed** (pre-existing)
- Net physics states in API_SPEC don't match engine — **not fixed** (pre-existing)
- STORY-00038 AC says skip modal if no active items owned; actual code shows modal if passive items owned — **not fixed**
- HUD item bar placement matches UI_SPEC intent — **confirmed fixed**

---

## Required Before Proceeding

Fix the 3 Critical issues then re-verify.
