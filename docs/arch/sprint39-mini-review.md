# Arch Code Review — Sprint 39-mini

**Sprint**: 39-mini
**Date**: 2026-04-21
**Verdict**: PASS

## Issues

None.

## Spec Drift

| Description | Status |
|-------------|--------|
| STORY-00329: ITEMS array already had `desc` field — no data change needed (all 8 items confirmed) | confirmed_fixed |
| STORY-00331: spread operator `{ ...s, mapped: mappedStars[i] }` on plain objects — valid ES6+ in WeChat mini game | confirmed_fixed |
| STORY-00332: wx.downloadFile DevTools sandbox may differ from real device — _loadPhotoFallback implemented for both fail callback and catch block | confirmed_fixed |

## Logic Review
- STORY-00329: CARD_H 100→116, badge Y 57→74, buy button auto-adapts via `cardY + CARD_H - btnH2 - 6`. Truncation loop guards empty string. No off-by-one.
- STORY-00330: `c.icon || ''` null-safe. Font size capped at 18px. Locked cards unchanged.
- STORY-00331: brightStars `.filter(s => s.mapped)` guards index mismatch. `ctx.setLineDash([])` reset after use. Nesting: outer clip save → label save → label restore → outer clip restore — correct. Anti-overlap single-pass greedy adequate for ≤5 labels; overflow auto-clipped by circle clip.
- STORY-00332: `wx.downloadFile` correct API signature. `res.statusCode === 200` check. Stale-check `_carouselForIdx !== constellationIdx` prevents race conditions. All `clearTimeout(timer)` calls present in all paths. No timer leak.

## Security
No eval(), no user input in canvas operations, no injection vectors. Photo URLs from static data file only.

## Performance
- STORY-00329: 1 measureText per frame for truncation check (if text doesn't fit) — negligible for 8 cards
- STORY-00331: brightStars computed per frame (sort+filter on ≤7 stars) — negligible
- STORY-00332: wx.downloadFile is one-shot per photo per constellation detail visit — not per-frame
