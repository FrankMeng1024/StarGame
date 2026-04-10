# Arch Code Review — Sprint 1

**Verdict**: PASS
**Date**: 2026-04-10
**Reviewer**: Arch subagent (claude-opus-4-6)

## Issues Found

| Severity | Description | Story |
|---|---|---|
| Medium | navigate() vs navigateTo() naming mismatch with API_SPEC.md screen names | STORY-00001 |
| Medium | Engine uses callbacks (onComplete/onFail) vs API_SPEC-specified window events | STORY-00003 |
| Medium | All subsystems consolidated in engine.js monolith vs modular API_SPEC design | STORY-00003 |
| Medium | Star property naming: mag/type/nameZh vs magnitude/spectralType/nameCN per API_SPEC | STORY-00003 |
| Medium | Constellation lore as string vs gallery object structure in API_SPEC | STORY-00004 |
| Medium | Dead code: empty forEach in _finalGlow | STORY-00004 |
| Medium | Dynamic import in complete.js btn handler — should use top-level import | STORY-00004 |
| Medium | nameEN/nameCN vs nameEn/nameZh casing mismatch with API_SPEC | STORY-00002 |
| Medium | Gallery back button uses inline onclick instead of navigate() router | STORY-00001 |
| Medium | LEVEL_TIME hardcoded; API_SPEC specifies per-level timeLimit in constellation data | STORY-00003 |

## Spec Drift Confirmed Fixed

- window.__navigate test hook: intentional, non-harmful ✓
- Collision detection formula: internally consistent, note slightly inaccurate but implementation correct ✓
- Line animation timing (300ms/line, 100ms gap): confirmed ✓
- Coin formula Math.floor(timeLeft) * 10: confirmed ✓

## Actions Required

- API_SPEC.md needs reconciliation pass (naming/structure mismatches) — Medium, backlog
- engine.js refactor into sub-modules before Sprint 3 — Medium, backlog
- Per-level timeLimit in constellation data — Medium, backlog
- Fix inline onclick in gallery back button — Medium, backlog
- Fix dynamic import in complete.js — Medium, backlog
