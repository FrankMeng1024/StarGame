# UX Review — Sprint 19

**Sprint**: 19
**Date**: 2026-04-12
**Confidence**: HIGH

## Friction Items

| Severity | Description | Screenshot |
|----------|-------------|------------|
| Low | Net-throw interaction was not directly observed — game session timed out before capture. Evidence gap, not a confirmed problem. | ux-05-net-throw.png |

## No Blocker or Critical Friction Found

## Untested Paths
- Actual net-throw mid-game interaction (session timed out before capture)
- 道具商店 (item shop) screen — not visited in this test session
- Using an item during gameplay (selecting an item from item-select and seeing its effect in-game)
- Successful level completion flow (catching all stars → victory screen → reward)
- Gallery lightbox interaction (tapping a photo to enlarge)

## Knowledge Updates
- Sprint 19: Item-select overlay has clear "← 返回" back button top-left — dismisses cleanly, no friction.
- Sprint 19: Stars appear immediately on game entry (<50ms) — no blank canvas delay. Major improvement.
- Sprint 19: Gallery detail layout confirmed photos (天文摄影) above star chart (星图) — correct hierarchy.
- Sprint 19: Full navigation regression passed with 0 console errors across all tested paths. SPA routing is stable.
- Sprint 19: Fail screen is clean — shows star count, clear message, two unambiguous action buttons.
- Sprint 19: Levels grid shows 30 constellations in 6-column layout with star ratings and best times.
