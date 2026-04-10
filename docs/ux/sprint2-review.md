# UX Review — Sprint 2

**Sprint**: 2
**Date**: 2026-04-10
**Reviewer**: UX subagent (claude-opus-4-6)
**Confidence**: MEDIUM (text-described UI; screenshots unavailable in this subagent round)

## Friction Items Found

| Severity | Description | Story |
|---|---|---|
| Medium | Shop shows no ownership indicator before purchase — user cannot tell how many of an item they already own until after buying (owned badge only appears after re-render) | STORY-00005 |
| Medium | Shop type system (持续型 / 消耗型) unexplained — first-time user does not know the difference between passive and active items | STORY-00005 |
| Low | No purchase confirmation step — mis-taps deduct coins with no undo | STORY-00005 |
| Low | Gallery grid shows no "newly unlocked" badge after completing a level — first-time gallery visit after winning is visually indistinct from repeat visits | STORY-00006 |
| Low | Gallery detail lore text has no scroll affordance — longer lore blocks may be silently clipped on shorter viewports | STORY-00006 |
| Low | Tutorial hint 5-second auto-dismiss may be too short for players who haven't fired yet — hint disappears before they act | STORY-00008 |

## Sprint 1 Friction Resolved This Sprint

| Item | Resolution |
|---|---|
| No in-game tutorial hint | ✓ Fixed — STORY-00008: animated hint overlay with 5s auto-dismiss and click-to-dismiss |
| Fail screen shows "—" stats | ✓ Fixed — STORY-00007: actual caught/total and elapsed seconds now displayed |

## Features Verified (text-based review)

| Feature | Status | Notes |
|---|---|---|
| Tutorial hint overlay | OK | Appears on first game load, dismisses on click or after 5s, does not block gameplay |
| Fail screen stats | OK | Shows actual caught/total and elapsed seconds |
| Shop navigation | OK | Reachable from complete screen and main menu (if wired) |
| Shop purchase flow | OK | Coins deducted, owned badge appears after purchase |
| Shop disabled state | OK | Buy button disabled when coins < price |
| Gallery grid | OK | 30 cards in 6×5 grid; locked show silhouette + 未探索 |
| Gallery unlocked cards | OK | Show icon + name (ZH/EN), clickable |
| Gallery detail view | OK | Icon, name (ZH+EN), lore text |
| Gallery back navigation | OK | Back button uses navigate() router, no page reload |
| Gallery back to menu | OK | 返回 button uses navigate() |

## Actions Required

| Priority | Item | Disposition |
|---|---|---|
| Medium | Shop: show pre-purchase ownership count on card | Backlog |
| Medium | Shop: add type system tooltip or legend (持续型/消耗型 explanation) | Backlog |
| Low | Shop: confirmation dialog for purchases ≥ 50 coins | Backlog |
| Low | Gallery: "new unlock" badge on first visit after level completion | Backlog |
| Low | Gallery: ensure lore text container is scrollable on all viewports | Backlog |
| Low | Hint: consider extending auto-dismiss to 8s, or keep until first click only | Backlog |
