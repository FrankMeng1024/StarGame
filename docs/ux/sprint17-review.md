# UX Review — Sprint 17

**Sprint Goal**: Fix 7 user-reported issues: net invisible at rest, stars too large, fail screen cramped, 返回关卡 button missing background, incoherent background music, coin system rework, level loading delay.

**Verdict**: PASS
**Confidence**: HIGH

## Friction Items

| Severity | Description | Screenshot |
|----------|-------------|------------|
| Low | Complete screen button hierarchy pulls user toward shop — '去商店' is large/primary, '下一关' secondary, '返回选关' subtle. Intentional monetization design, not a defect. | s17-10-complete-real.png |

## Issue-by-Issue Assessment

| Issue | Status | Evidence |
|-------|--------|----------|
| 1. Net invisible at rest | FIXED | s17-03-game.png: net visible at idle (golden ring to girl's right) before any input |
| 2. Stars too large | FIXED | s17-03-game.png: stars are small proportional glowing dots, not oversized blobs |
| 3. Fail screen cramped | FIXED | s17-04-fail.png: centered layout with generous spacing, hierarchy is clear |
| 4. 返回选关 button no background | FIXED | s17-10-complete-real.png: darker tinted background, visually distinct as a button |
| 5. Music incoherent | UNTESTED | Audio cannot be verified via screenshots |
| 6. Coin system rework | FIXED | 100 coins on fresh start (s17-08), 72s×10=720 coins on complete (s17-10), 0 coins on fail (s17-04) |
| 7. Level loading delay | FIXED | s17-09-game-0s.png: fully rendered game at entry — no blank canvas |

## Navigation Regression

All transitions (menu→levels→game→complete→shop→gallery) produced **zero JavaScript console errors**.

## Untested Paths

- Audio music coherence — untestable via screenshots
- Actual manual gameplay catch interaction
- Shop purchase flow
- 3-star repeat half-coin rule

## Knowledge Updates

- Sprint 17: Net confirmed visible at idle — golden ring on pole, positioned to girl's right side. Issue resolved.
- Sprint 17: Game preloading working — all assets visible at 0s entry. No blank canvas.
- Sprint 17: Coin formula confirmed: fail=0, success=remaining_seconds×10. Initial 100 coins for fresh players.
- Sprint 17: Complete screen button set: 去商店 (primary), 下一关 (secondary), 返回选关 (tertiary with dark tint).
- Sprint 17: Zero console errors across all navigation transitions.
