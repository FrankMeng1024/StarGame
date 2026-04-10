# UX Review — Sprint 1

**Date**: 2026-04-10
**Sprint Goal**: 建立可玩的游戏核心
**Confidence**: HIGH

## Friction Items

| Severity | Description | Screenshot |
|---|---|---|
| Medium | No tutorial/control hint on game screen — first-time player doesn't know to click to fire the net | STORY-00003-01-game.png |
| Medium | Fail screen shows "—" and "0秒" instead of actual caught count and time spent — feels like a data bug | STORY-00004-01-fail-screen.png |
| Low | Locked level cards have no constellation name/silhouette — 29 cards are visually dead space | STORY-00002-01-levels.png |
| Low | Debris objects have no visual cue indicating they are bad to catch | STORY-00003-01-game.png |
| Low | Gallery button leads to placeholder with no guidance for first-time user with no unlocked constellations | STORY-00001-01-menu.png |

## Overall Assessment
No Blocker friction items. Main menu is polished and communicates game theme within 5 seconds. Navigation flow is correct. Two Medium friction items worth filing as backlog stories: tutorial hint and fail screen stat display.

## Untested Paths
- 星座展厅 when no constellations are unlocked
- Locked level card click behavior
- Game mid-level exit
- Mobile/touch viewport
- Rapid double-click on net fire

## Knowledge Updates
- Main menu visual quality is strong — star-catching theme understood within 5s ✓
- Level select lock/unlock visual distinction is clear
- Game HUD provides essential feedback (level name, timer, star count)
- Fail screen stat display is confusing (showing dashes/zeros)
- No in-game tutorial for controls — discoverable but adds friction on first play
- localStorage persistence confirmed across page reload
