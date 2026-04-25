# UX Review — Sprint 76-mini

**Confidence**: MEDIUM (code-path analysis; DevTools simulator blocked)
**Sprint Goal**: 游戏性核心机制首Sprint — 动态难度+连击奖励+充能特效+里程碑动画

## Friction Items

| Severity | Description |
|----------|-------------|
| Medium | Combo x3+ time bonus (+5s) is invisible — popup says 'x3 连击!!' but shows no '+5s' indicator. Player never learns that combos give time. Core reward of combo play is hidden. |
| Medium | 75% milestone reuses debris screen shake (same _updateShake ±3px). Player has already learned 'shake = bad thing happened'. Milestone popup appears but shake signal dominates — confusion risk. |
| Low | 50% white flash (alpha 0.25, 0.15s) on dark background. Brief, but may startle; reads as rendering glitch on first encounter. Constellation line alpha boost (0.22→0.45) already provides the same milestone signal. |
| Low | Net charge has no distinct activation signal. SFX_CATCH plays twice in rapid succession (indistinguishable from normal catch). White glow on small moving object is subtle — player may not notice the 1.2x speed reward. |
| Low | Up to 5 simultaneous visual events if combo and 50% milestone fire on same catch: white flash + combo text + milestone text + rainbow particles + constellation brightness. 200ms overload. |
| Low | Dynamic difficulty (0.5x–1.5x obstacle speed) is invisible. Skilled players may feel punished as difficulty increases with accuracy improvement. Philosophical design note, not a bug. |

## Verdict
PASS — no Blocker or Critical friction. 2 Medium items are backlog candidates.

## Untested Paths
- Actual visual appearance of combo popup on dark background (contrast)
- Net charge glow against aurora scene (Scene 4 teal tones)
- Milestone triggers on levels with very few stars (early trigger)
- Simultaneous combo + milestone + charge convergence
- Rainbow particle performance on low-end devices (144 total particles per burst)
