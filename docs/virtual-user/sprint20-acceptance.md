# Virtual User Acceptance — Sprint 20

**Sprint**: 20
**Overall Score**: 9.5/10
**Verdict**: ACCEPTED
**Date**: 2026-04-13

## Features Evaluated

| Feature | Status | Notes |
|---------|--------|-------|
| CR-062: Net rope connects to hand + wide swing | Works | flow-04 shows rope originating from girl's raised arm extending to net basket. flow-05/06 confirm wide arc reaching left and right screen extremes. |
| CR-063: Star sizing appropriate (not giant) | Works | 7 stars in constellation pattern at proportional scale — celestial objects, not blobs. |
| CR-064: Gallery layout (name→chart→photos→lore) | Works | flow-13 confirms: name, English name, nav row, large SVG star chart. flow-14 confirms: photos (fully loaded, no spinner) → meta facts → lore text. No portrait canvas. |
| CR-065: Preloading — no delay/flash | Works | flow-03 shows meteors, satellite, girl sprite ALL rendered immediately on game entry. flow-07/08/09 sequential: zero white frames across 6s. flow-14 NASA photos fully loaded. |
| F-001: Core Gameplay (girl, net, stars, debris, timer, win/lose) | Works | Smooth gameplay confirmed. Victory screen: ★★★ 关卡完成！, 7/7 caught, 42s remaining, 70 coins, Orion photo + lore. |
| F-002: Level progression (30 levels, sequential unlock) | Works | 30 levels in grid. Completed show star ratings + best times. Locked show 🔒. |
| F-003: Constellation Encyclopedia (gallery, detail, star chart, photos, lore) | Works | Rich detail pages: labeled SVG star chart, NASA/ESA Hubble photos with credits, Chinese mythology lore, astronomical metadata. |
| F-004: Shop | Works | 8 items with names, descriptions, prices, coin balance. Purchase interaction functional. |
| F-005: Audio (mute button visible) | Works | Mute 🔊 on main menu and gameplay. Pause ⚙ during gameplay. |
| F-006: Navigation + performance | Works | Full circuit (menu→levels→game→gallery-detail→gallery→shop→menu) — 0 console errors, clean return to home state. |

## What's Not Good Enough

None.

## What's Missing

None.

## What Works Well

- Gallery detail layout change (CR-064) is immediately noticeable: star chart occupies prominent position, photos appear below without any loading delay
- Net-to-hand connection (CR-062) gives the throwing animation a natural, physical feel
- Preloading (CR-065) makes the entire game feel snappy — entering gameplay and gallery pages is instant
- Victory screen reward loop remains satisfying: NASA nebula photo + Chinese mythology lore
- Navigation stability: zero console errors across entire session

## Verdict Reasoning

Score 9.5/10. All four Sprint 20 CRs deliver exactly what was promised. The net rope visually connects from the character's hand to the net basket with a clear rope/line, and the swing arc reaches screen extremes. Stars are appropriately sized. Gallery layout follows the correct order — name, star chart, photos, lore — with no layout anomalies. All sprites and photos load instantly with zero loading flashes. The overall product is polished, educational, and culturally authentic. This is a complete, satisfying product.

## Evidence Files

- `docs/virtual-user/sprint20-flow/flow-01-menu.png`
- `docs/virtual-user/sprint20-flow/flow-02-levels.png`
- `docs/virtual-user/sprint20-flow/flow-03-gameplay-idle.png`
- `docs/virtual-user/sprint20-flow/flow-04-net-throw.png`
- `docs/virtual-user/sprint20-flow/flow-05-swing-left.png`
- `docs/virtual-user/sprint20-flow/flow-06-swing-right.png`
- `docs/virtual-user/sprint20-flow/flow-07-perf-01.png`
- `docs/virtual-user/sprint20-flow/flow-08-perf-02.png`
- `docs/virtual-user/sprint20-flow/flow-09-perf-03.png`
- `docs/virtual-user/sprint20-flow/flow-10-complete.png`
- `docs/virtual-user/sprint20-flow/flow-11-levels-after.png`
- `docs/virtual-user/sprint20-flow/flow-12-gallery.png`
- `docs/virtual-user/sprint20-flow/flow-13-detail-top.png`
- `docs/virtual-user/sprint20-flow/flow-14-detail-photos-lore.png`
- `docs/virtual-user/sprint20-flow/flow-15-detail-ursa.png`
- `docs/virtual-user/sprint20-flow/flow-16-shop.png`
- `docs/virtual-user/sprint20-flow/flow-17-shop-purchase.png`
- `docs/virtual-user/sprint20-flow/flow-18-menu-final.png`
