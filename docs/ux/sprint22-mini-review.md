# UX Review — Sprint 22-mini

**Sprint**: 22-mini
**Date**: 2026-04-17
**Confidence**: MEDIUM (home screen visual verified; in-game states code-path only)

## Summary
Sprint 22-mini fixes gameplay and visual polish. Ghost buttons are a clear improvement — home screen feels like a cohesive starscape scene. Victory linger phase is exactly the right emotional design. All changes are player-positive.

## Friction Items

| Severity | Description |
|----------|-------------|
| Medium | Button icons (★ ◉ ◈ 🏆) have no consistent system — four different symbols add visual noise without aiding scanability. First-time user must read text; icons don't help. Pre-existing issue now more visible. |
| Low | Primary "挑战关卡" gold text vs secondary light purple text — contrast is present but subtle on a dark background. Could be stronger if button were slightly larger. |
| Low | Right half (title + subtitle + 4 buttons) is doing more work than left half (one constellation graphic). Slight asymmetry — not a usability problem. |

## No Blocker or Critical Issues

## Feature Assessment

### STORY-00275 — Ghost buttons (HIGH confidence)
Screenshot confirms star background visible through all button fills. Two-column layout not crowded. Visual hierarchy clear: one primary CTA, two secondaries, one tertiary. A first-time user would naturally tap 挑战关卡 first. Ghost style is exactly right for a stargazing game — the art shows through, creating one cohesive scene.

### STORY-00272 — Net reachability (MEDIUM confidence — code-path)
Extending the net is purely player-friendly. A game where level 2 is impossible causes immediate abandonment. Change is invisible to first-time users (they never knew the old limit). Math verified.

### STORY-00273 — Star sizing (MEDIUM confidence — code-path)
Smaller, non-overlapping stars are a pure improvement. Overlapping stars create visual confusion and make catch targeting ambiguous. Clear individual stars let the player plan moves.

### STORY-00274 — Victory linger (MEDIUM confidence — code-path)
The 1.5-second pause after constellation lines complete is exactly the right design choice. Constellation completion IS the reward — letting it breathe gives the player "I built that" satisfaction. Previous immediate-result behavior was too abrupt.
