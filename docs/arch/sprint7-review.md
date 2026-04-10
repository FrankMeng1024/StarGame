# Arch Code Review — Sprint 7

**Verdict**: FAIL  
**Reviewer**: Arch subagent (claude-opus-4-6)  
**Date**: 2026-04-10

---

## Issues

### BLOCKER — STORY-00027: Timer drains 2.5s on first scene entry

`start()` sets `this.lastTick = performance.now()` before the intro plays. When `onDone()` fires 2500ms later and calls `this._loop(performance.now())`, the first `dt = now - this.lastTick` ≈ 2500ms, immediately subtracting 2.5s from `timeLeft`. For difficulty-5 levels (50s limit), this is a 5% unfair penalty.

**Fix**: reset `this.lastTick = performance.now()` inside the `onDone` callback.

### CRITICAL — STORY-00027: Input accepted during intro, involuntary net-fire

`addEventListener` for click/keydown is registered at the top of `start()`, before `_showSceneIntro`. `_handleInput` has no intro guard — any click/space during the 2500ms intro sets `this.netState = 'extend'`. When the game loop begins, the net fires without player intent.

**Fix**: add guard `if (this._introPlaying) return;` at top of `_handleInput`, clear the flag in `onDone`.

### MEDIUM — STORY-00027: Orphaned rAF chain on early stop()

`_showSceneIntro` uses its own `requestAnimationFrame` loop not tracked in `this.rafId`. If `stop()` is called mid-intro, the rAF chain continues painting for up to 2.5s. Not a crash — `_loop` checks `this.running` — but causes unnecessary rendering.

### MEDIUM — STORY-00027: `seenScenes` not documented in API_SPEC.md State Contract

New field added to `state.js` and `storage.js` but `docs/API_SPEC.md` State Contract not updated.

### MEDIUM — STORY-00028: No bounds clamping on SCENE_PALETTES in levels.js

`levels.js` accesses `SCENE_PALETTES[idx / 5]` without `Math.min(..., SCENE_PALETTES.length - 1)`. All other callers (engine.js, gallery.js) use defensive clamping. Currently safe with 30 constellations / 6 palettes.

---

## Spec Drift

- `API_SPEC.md` documents `lines` as `[[string, string]]` but data uses `[[number, number]]` — pre-existing, all consumers correct.
- `API_SPEC.md` documents star fields as `{id, nameCN, magnitude, spectralType}` but data uses `{name, mag, x, y, type}` — pre-existing.
- `seenScenes: Set<number>` not in API_SPEC.md State Contract — new drift from STORY-00027 (not fixed).
- `lore` and `icon` fields undocumented in API_SPEC — pre-existing.

---

## Positive Findings

- STORY-00026 gallery portrait: correct `Math.min` clamping, safe line-index guard, clean canvas rendering.
- STORY-00028 scene dividers: `grid-column: 1/-1` correct, `innerHTML` from dev-controlled data only (no XSS risk).
- STORY-00029 aurora line color: simple, correct, safe falsy fallback.
- `storage.js` seenScenes round-trip: `[...state.seenScenes]` / `new Set(data.seenScenes || [])` correct with legacy-save fallback.
