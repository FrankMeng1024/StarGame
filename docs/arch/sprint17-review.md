# Arch Code Review — Sprint 17

**Verdict**: PASS  
**Reviewer**: Arch subagent  
**Date**: 2026-04-12

## Issues

| Severity | Description | Story |
|----------|-------------|-------|
| Medium | Sub-drone gain node not faded on stop — `subGain` is local to `_startDrone()`, bypasses `_droneGain` fade, causes audible pop/click when music stops. Fix: route subOsc through `_droneGain`. | STORY-00077 |
| Medium | Audio intervals not cleared on page unload (theoretical — no real impact in current architecture). | STORY-00077 |
| Medium | Dead code in `_handleFail` elapsed fallback — `engine?.startTime` evaluates to undefined when engine is already null. Harmless. | STORY-00078 |

## Spec Drift Fixes Confirmed

| Fix | Confirmed |
|-----|-----------|
| `_drawFailConstellation` canvas background: transparent → `rgba(5,8,30,0.85)` fillRect | ✓ |
| `fail-mode` class toggle in showFail/showComplete | ✓ |
| `.btn-back-levels` explicit background (was transparent ghost) | ✓ |

## Per-Story Verdict

| Story | Verdict | Notes |
|-------|---------|-------|
| STORY-00073 (CR-050) Net idle visibility | PASS | `len<2 + netState==='swing'` guard correct, 32px offset clean |
| STORY-00074 (CR-051) Star 2/3 size | PASS | MAX_STAR_R=9, visualR=1× proportional |
| STORY-00075 (CR-052) Fail layout | PASS | fail-mode class system correct, showComplete restores properly |
| STORY-00076 (CR-053) Button background | PASS | CSS override correct |
| STORY-00077 (CR-054) Music rework | PASS* | Sub-drone pop Medium issue; fix in sprint |
| STORY-00078 (CR-055) Coin system | PASS | Half-coins logic + initial 100 correct |
| STORY-00079 (CR-056) Preloading | PASS | Promise.race + 400ms timeout pattern correct |
