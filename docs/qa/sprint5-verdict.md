# QA Verdict — Sprint 5

**Verdict**: PASS  
**Date**: 2026-04-10  
**Bugs found**: 0  
**Arch bugs fixed and re-verified**: 4 (1 blocker, 2 critical, 1 medium)

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|-------|---------|------------|-------|
| STORY-00018 (Web Audio SFX + mute button) | PASS | HIGH | 5 procedural SFX (playCatch, playDebrisCatch, playLevelComplete, startCountdownBeeps, playTimeExt) verified by code review. Mute button toggles icon 🔊/🔇, persists localStorage `starcatcher_muted`. `pointer-events: auto` confirmed. 0 console errors. |
| STORY-00019 (Background music) | PASS | HIGH | Am-F-C-G chord loop (4 sine oscillators/chord, CHORD_VOL=0.04). startMusic on game entry, stopMusic on navigation away. Routed through masterGain for mute respect. Seamless envelope scheduling via AudioContext.currentTime lookahead. 0 console errors. |
| STORY-00020 (High score display) | PASS | HIGH | Level cards show star rating + `最佳: N秒` best time. refreshLevels updates already-unlocked cards live. Complete screen `🏆 新纪录！` badge when isNewRecord=true. Fail screen removes stale badge. Persistence via localStorage confirmed. |
| STORY-00021 (UX polish) | PASS | HIGH | time_ext flash `+20秒` near timer, auto-removed 1.2s. Passive item row in HUD top. Active items toast on level start with `已激活` labels, fades 3s. No row/toast when no passive items. |

## Arch Bugs Fixed and Re-Verified

| Severity | Bug | Fix Verified |
|----------|-----|-------------|
| Blocker | Mute button unclickable (pointer-events inherited `none` from `.hud`) | `pointer-events: auto` on `.hud-mute-btn`, Playwright click toggled icon successfully |
| Critical | refreshLevels not updating score on already-unlocked cards | New `else if (unlocked)` branch removes old score elements, inserts fresh — live update verified |
| Critical | Fail screen shows stale `🏆 新纪录！` badge from prior completion | `showFail()` now explicitly removes `.new-record-badge` — fail screen verified badge-free |
| Medium | Duplicate CSS rules in main.css | Consolidated — grep confirms single definition per selector |

## Evidence Summary

### TC-018 (Audio + Mute)
- TC-018-05: mute button `🔊` visible in HUD on fresh load — PASS
- TC-018-06: click toggles to `🔇`, localStorage `starcatcher_muted=1`; click again restores `🔊` — PASS
- TC-018-08: computed `pointer-events: auto` on button; Playwright click toggles icon — PASS
- No external audio files in network requests (procedural Web Audio API only) — PASS
- 0 JS errors related to audio across entire session

### TC-019 (Background Music)
- startMusic()/stopMusic() wired in game.js — PASS
- stopGame() calls stopMusic(), confirmed on navigation away — PASS
- 0 AudioContext/Web Audio console errors — PASS

### TC-020 (High Score)
- TC-020-04: fresh state — no best time, no score stars on level card — PASS
- TC-020-08: after setScore → card shows `最佳: 55秒` and `★★☆` immediately — PASS
- TC-020-07: fail screen shows no `🏆 新纪录！` badge — PASS
- TC-020-05: complete screen with isNewRecord=true shows `🏆 新纪录！` — PASS

### TC-021 (UX Polish)
- TC-021-02: passive row shows `⚡🔬🧤🗺️` (4 icons) with seeded items — PASS
- TC-021-04: active items toast shows all 4 passive names with `已激活` — PASS
- TC-021-01: time_ext flash `+20秒` appears as `.time-ext-flash` element — PASS
- TC-021-03: no passive row when no passive items — PASS
- TC-021-05: no toast when no passive items active — PASS

### Navigation Regression
All 10 navigation checks passed: levels, game, complete, levels-again, gallery, menu, fail, fail-no-badge, shop, levels-final.  
Console: 0 JS errors across full round-trip.  
Only non-code error: Google Fonts woff2 network error (offline environment).

## Untested Paths
- Actual audible output verification (procedural audio verified by code review — no waveform capture)
- AudioContext suspended state recovery after tab background/foreground cycle
- Mobile 375px viewport layout for passive item row and mute button (tested desktop 1280x720 only)

## Knowledge Updates
- `js/audio.js` new in Sprint 5: lazy AudioContext, masterGain mute chain, 5 SFX exports + ambient music scheduler
- Mute state: localStorage key `starcatcher_muted` (`1`/`0`), updates `_masterGain.gain.value`
- Background music: Am-F-C-G chord loop, 4 sine oscillators/chord, CHORD_VOL=0.04, CHORD_DUR=2.0s
- Countdown beeps: engine `_beeping` flag gates at ≤10s; also stops on engine.stop() and fail
- `refreshLevels()` now has three paths: newly-unlocked (full re-render), already-unlocked (score update), locked (no-op)
- New record detection: `_handleComplete` reads prevScore BEFORE setScore to prevent compare-after-overwrite
- Fail screen cleanup: `showFail()` explicitly removes `.new-record-badge`
