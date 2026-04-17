# UX Review — Sprint 24-mini
**Date**: 2026-04-17  
**Method**: Code-path review (WeChat Mini Game — first-time user perspective)

## Friction Items

| # | Severity | Area | Description |
|---|----------|------|-------------|
| 1 | Medium | Net physics | Debris drag-back at 20% speed (0.8 px/frame) immobilizes net for 3.4–6.9s per hit. Double punishment (time penalty + immobilization) is harsh for casual players. Recommend testing 30-40% retract speed. |
| 2 | Medium | Net physics | Base NET_SPEED=4 (240px/s) gives ~2.76s round-trip. First-time players may perceive sluggish feel vs Gold Miner genre norm (~400-500px/s). |
| 3 | Medium | Achievement button | Touch target 20-24px height, 10px font — below Apple HIG (44pt) and Material (48dp) minimums. Secondary feature, not blocking critical path. |
| 4 | Low | Intro skip hint | 13px, alpha 0.75, bottom-right corner — may be missed by first-time players. Not blocking (animation auto-completes at 13s). |
| 5 | Low | Level name text | Minimum 7px at small card widths — very small on 1x DPI screens. Rescued by larger abbreviation and level number above it. |
| 6 | Low | Title spacing | Double-spaced "追  星  少  女" is unconventional Chinese typography — purely aesthetic, no functional impact. |

## What's Working Well
- Intro animation: 4 pre-spawned meteors + portal glow + twinkling stars = professional first impression
- Girl character: substantially improved with eye anatomy, wider dress, polygon hat star
- Menu buttons: solid gradient fills read clearly as actionable, proper visual hierarchy (primary vs secondary)
- Level cards: 6-column grid with 2-char abbreviation is cleaner than emoji, 100px touch targets are excellent
- Debris drag visual: caught debris following net head is a clear physical signal

## Untested Paths
- Portrait orientation 5-column card grid
- Devices with large safe areas reducing 6-column card widths
- Net speed item interaction with debris drag (speed item doesn't speed up debris retract)
- Intro animation performance on low-end WeChat clients (80 stars + 3 gradients)

## Knowledge Updates
- Menu buttons changed from ghost/transparent to solid purple gradient — Sprint 22 ghost-button notes are OBSOLETE
- Net physics fundamentally changed: NET_SPEED 9→4 px/frame; debris retract 20% speed
- Girl character 130px tall (was ~81px); full eye anatomy; polygon hat star
- Level grid: 6 cols landscape, 2-char nameZh abbreviation
- Achievement button touch target is a known tradeoff (compact layout priority)
