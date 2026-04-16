# UX Review — Sprint 12-mini

**Sprint**: Sprint 12-mini
**Story**: STORY-00241
**Confidence**: MEDIUM (code-path only — WeChat mini game Canvas architecture)
**Date**: 2026-04-16

## Sprint Goal
关闭VU差距 — 展厅多图轮播（PRD F-007：5-10张真实图片+轮播交互）

## Friction Items

| Severity | Description |
|----------|-------------|
| **Medium** | Carousel arrow buttons are 32×44px — functional but below the 44×44px recommended minimum touch target. The 4px edge padding compounds this on small devices. Risk: mis-taps, especially for users with large fingers. |
| Low | Boundary buttons use opacity 0.25 (faded) but give no feedback on tap — button silently does nothing. A user may tap multiple times thinking the tap didn't register. |
| Low | No swipe gesture for photo navigation — carousel relies entirely on ‹/› buttons. Swiping is the dominant mobile convention for image galleries; first-time users will try swipe before looking for arrows. |
| Low | "N/total" indicator uses 11px font — may be difficult to read on high-DPI screens. Consider 12-13px minimum or dot indicators. |

## What Works Well
- ‹/› buttons overlaid directly on photo area — discoverable without prior knowledge
- Boundary state communicated by opacity difference (0.85 active vs 0.25 at boundary)
- "1/3" indicator gives clear positional context
- Loading state "加载中..." is clear and expected
- Carousel resets to 1/3 on constellation change — consistent, no confusing state carry-over

## Untested Paths
- Actual visual rendering at various device pixel ratios
- Touch conflict between vertical scroll and diagonal carousel tap
- Photo loading responsiveness on slow networks
- Rapid repeated tap behavior on › button

## No Blocker or Critical friction items found.
