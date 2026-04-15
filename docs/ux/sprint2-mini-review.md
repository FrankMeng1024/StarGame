# UX Review — Sprint 2-mini

**Sprint**: Sprint 2-mini
**Sprint Goal**: 核心游戏完整可玩 — 点击发射网兜、抓星星、避垃圾、计时/金币结算、通关/失败屏幕
**Reviewer**: UX subagent (claude-opus-4-6)
**Date**: 2026-04-15

## Verdict

No Blocker-level friction. One Critical friction item.

## Friction Items

| Severity | Description | Screenshot |
|---|---|---|
| **Critical** | No tutorial or onboarding — a first-time user is dropped into gameplay with zero explanation of the tap-to-launch-net mechanic. "How do I catch stars?" is completely unanswered. Will cause near-universal first-attempt failure. A single text prompt ('点击屏幕发射网兜！') or pulsing tap indicator would resolve this. | STORY-00207-01-game-play |
| **Medium** | Title mismatch: game is 星捕少女 but level select header shows '超凡天下'. First-time user cannot confirm they are in the right game or understand the relationship. | STORY-00206-00-level-select-full |
| **Medium** | Unlocked level 1 uses a crossed-swords icon which reads as 'combat/battle' rather than 'play this level.' Standard game UX uses a level number, star, or play arrow for available levels. | STORY-00206-00-level-select-full |
| **Medium** | Failure screen buttons '重试' and '选关' have nearly identical visual weight. Primary action (Retry) should be visually dominant — brighter, larger, or higher contrast. | STORY-00211-01-failure-screen |
| **Medium** | Debris objects (brown triangle, blue satellite) lack clear danger visual language. Stars glow with gold connections (positive), but debris has no red tint, warning markers, or hostile animation to signal 'avoid this.' | STORY-00207-01-game-play |
| **Low** | Failure screen shows no performance summary — no coins earned, no partial credit. For a game with coin settlement mechanics, zero reward feedback is a missed motivational loop. | STORY-00211-01-failure-screen |
| **Low** | Girl character at bottom is very small — hard to appreciate for a game named after her. No visible net/tool in hand to hint at the catching mechanic. | STORY-00207-01-game-play |
| **Low** | 30 levels displayed simultaneously creates a dense grid where the single unlocked level gets visually lost among 29 locked tiles. | STORY-00206-00-level-select-full |

## Untested Paths

- Victory/success screen (could not automate — requires catching all 7 stars with precise net timing)
- Tapping a locked level — unknown whether feedback is provided
- Net launch mechanic — could not observe the net animation during gameplay
- Star catch feedback — could not observe counter update or visual feedback on catch
- Debris collision feedback — could not observe what happens when debris is hit
- Retry button behavior — could not verify it restarts the same level correctly
- Navigation regression — navigate-away-and-return for any screen not tested

## Confirmed

- Level select renders 30 constellation levels correctly — level 1 unlocked, 2-30 locked
- Game canvas renders: starry sky, constellation stars connected by gold lines, girl character, debris objects
- HUD visible: catch counter (已抓 0/7), countdown timer (0:53), DevTools overlay buttons
- Failure overlay renders correctly: time's up message, short count, retry + level-select buttons
- Navigation level-select → game → (timer expires) → failure screen → level-select: WORKS

## Knowledge Updates

- Sprint 2-mini introduces Canvas-based mini game with level select (30 constellations), gameplay (net-catching mechanic), and failure overlay screens
- Critical UX gap: zero onboarding/tutorial for core tap-to-launch-net mechanic — top priority for Sprint 3-mini
- Failure screen overlay pattern works well — good foundation for victory screen
- Visual language for stars (glowing, connected) is adequate; debris lacks danger signaling (Medium priority)
- Title '超凡天下' on level select does not match game name '星捕少女' — branding consistency issue
