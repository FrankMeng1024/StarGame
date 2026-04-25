# UX Review — Sprint 77-mini

**Date**: 2026-04-24
**Sprint Goal**: 修复结算页按钮无响应 + 提升结算/商店UI质量 + 骨骼动画加肉
**Confidence**: MEDIUM (DevTools base lib blocker — code analysis only)

## Friction Items

| Severity | Description | Story |
|----------|-------------|-------|
| Medium | +5s popup at W*0.08 (far left) is ~280px from timer ring (at W/2). Weak spatial association between combo reward and countdown timer. Combo popup is already at W/2 H*0.25 — +5s should ideally be near the timer, not top-left corner. | STORY-00408 |
| Low | +5s float-upward effect only moves 14px over 1.5s — imperceptible during active gameplay. Effectively static fade. | STORY-00408 |
| Low | Success subtitle: `nameZh + '  ' + icon` uses two Unicode spaces for gap. May render inconsistently across devices. | STORY-00405 |
| Low | Shop: sheet auto-dismisses at 800ms but toast stays visible until 1400ms — creates a brief orphaned text moment. | STORY-00406 |

## Positive Observations

- **STORY-00404**: 50ms→16ms dedup fix is surgically precise. Directly solves result-screen button unresponsiveness without over-correcting. Root cause was correct: skip-animation tap sets timestamp, immediate button tap swallowed.
- **STORY-00405**: 44px buttons meet Apple HIG/Material minimum tap targets. Fail card blue/purple color split creates information architecture: retry (action) vs back (navigation).
- **STORY-00405**: Victory constellation subtitle is a strong "reveal moment" — connects gameplay to astronomy content at the payoff moment.
- **STORY-00406**: "金币不足 (需 🪙 N)" label transforms a dead-end into a goal. Player knows exactly how many more coins needed.
- **STORY-00407**: body_no_arms.png resolves silent asset fallback — armless torso + Canvas bones now work as designed.
- **STORY-00408**: Making the invisible combo time bonus visible is the most impactful UX change this Sprint. Transforms combo from invisible mechanic into learnable skill incentive.

## Overall Assessment

Sprint goal met. The blocking issue (result buttons not responding) is resolved. No Blocker or Critical friction introduced. The +5s popup placement (Medium) should be addressed in a future Sprint to improve spatial association with the timer.

## No Blocker or Critical Bugs

Sprint may proceed to commit.
