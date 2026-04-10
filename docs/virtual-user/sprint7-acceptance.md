# Virtual User Acceptance — Sprint 7

**Sprint**: 7
**Overall Score**: 9.3/10 (revised from 8.5 after supplementary context provided)
**Verdict**: NOT ACCEPTED
**VU subagent**: claude-opus-4-6
**Date**: 2026-04-11
**Evidence**: docs/virtual-user/sprint7-flow/

---

## Supplementary Context Review (Post-initial judgment)

Two items were re-evaluated after team provided context and additional screenshot evidence:

**Item 1 — F-007 Gallery photo carousel**: VU accepted context. Asset-blocking was documented in DISCOVERY.md before development, and canvas portrait was Sprint 7's approved resolution. VU withdrew complaint. Score impact: +0.5.

**Item 2 — F-006 Line-drawing animation**: VU accepted screenshot evidence (flow-anim-600ms.png shows 4/7 stars connected mid-animation at 600ms). Animation confirmed working. VU withdrew complaint. Score impact: +0.3.

**Remaining valid complaints (to be fixed in Sprint 8)**:
1. Gallery metadata missing (所属天区, 最佳观测时间, 主要星星) — creates new Story
2. Mute button invisible on main menu — creates new Story

---

## Features Evaluated

| Feature | Status | Notes |
|---------|--------|-------|
| F-001: Main Menu | Partial | Title glow, background, two buttons, tagline all present and polished. Mute button rendered at width=0 height=0 on menu screen — effectively invisible/non-functional from user perspective on main menu. BGM control should be accessible from the first screen. Particle animation accepted (Canvas limitation in screenshots). |
| F-002: Level Selection | Works | 30 levels confirmed across 6 scenes with themed dividers. Lock/unlock progression works. Difficulty stars shown. Grid layout clean. Aurora badge on Scene 4. Solid implementation. |
| F-003: Core Gameplay | Works | Girl character with net, swinging animation confirmed, click-to-fire works (counter increments), star catching with golden particle burst visible, debris objects present, HUD shows level name + timer + star counter, timer freezes during intro overlay, timer turns red as warning. Core loop complete. Stars in different colors and sizes. |
| F-004: Time & Coin System | Works | Difficulty-based time limits confirmed (Level 1 = 90s, Level 3 = 80s). Coin formula verified: 47s × 10 = 470 coins. Fail screen shows 0 coins. Star rating displayed. Timer warning (red at ≤10s) works. All correct. |
| F-005: Shop | Works | 8 items in clean grid with emoji, name, price, type label (持续型/消耗型). Header explains both types. Purchase works — balance 940→920 after buying 20-coin item. Item in inventory. Professional layout. |
| F-006: Level Complete | Partial | Polished screen: star rating, new record badge, stats, lore text, three action buttons. Canvas portrait visible. Constellation line-drawing animation either plays too fast to notice (not captured in 2s window) or is absent — as a paying user the promised 'star-by-star gold line' reward moment was not witnessed. |
| F-007: Gallery | Partial | Grid works — colored/grey cards, 未探索 label. Detail page has canvas portrait, title, lore text, back navigation. MISSING: no structured metadata (所属天区, 最佳观测时间, 主要星星). MISSING: no image carousel (5-10 real photos) — replaced with canvas portrait only. Gallery promised as educational showcase, delivered at ~40% spec. |
| F-008: Save System | Works | Coins, unlocked levels, inventory all persist correctly across full page reload. 920 coins, 2 levels, star_map:1 — all match pre-reload state exactly. |
| Visual Quality | Works | Professional night sky aesthetic. Consistent deep blue-purple palette with gold accents. Zero JavaScript runtime errors throughout session. Only Google Fonts network errors (offline env, expected). |

---

## What's Not Good Enough

1. **F-007 Gallery detail is significantly under-delivered**: No structured metadata (所属天区, 最佳观测时间, 主要星星) and no image carousel (5-10 real photos). The PRD positions the gallery as an educational showcase — what exists is a canvas drawing and a story paragraph. This is not what a paying user was promised.

2. **F-001 Mute button invisible on main menu** (width=0, height=0). BGM control should be accessible from the first screen a user sees, not only after entering a game level. Basic accessibility and usability expectation.

3. **F-006 Constellation line-drawing animation**: Either plays too fast to be a meaningful reward moment, or was not implemented. The static portrait alone does not deliver the 'wow' moment the PRD envisions as the payoff for completing a level.

---

## What's Missing

- Gallery structured metadata: 所属天区, 最佳观测时间, 主要星星 — completely absent from gallery detail page
- Gallery image carousel: 5-10 real astronomical photographs per constellation — entirely absent, replaced with canvas portrait only
- Mute button on main menu: exists in DOM but rendered at zero size — functionally missing from the menu screen

---

## What Works Well

- Core gameplay loop is solid and satisfying — net swinging, time pressure, coin rewards, shop progression
- Visual quality is genuinely impressive: professional, cohesive, atmospheric night sky aesthetic
- Level selection with 30 levels across themed scenes well-executed
- Shop complete and functional with all 8 items
- Save persistence reliable
- 0 JavaScript runtime errors throughout entire session

---

## Verdict Reasoning

The core gameplay loop is solid and satisfying. Visual quality is genuinely impressive for a browser game: professional, cohesive, atmospheric. Level selection, shop, and save system all work correctly and fully. These are real strengths.

However, the gallery — positioned in the PRD as a key feature (F-007) with educational value through real photos, structured astronomical data, and visual storytelling — is substantially incomplete. What exists is a canvas portrait and a lore paragraph. The structured metadata (sky region, viewing time, notable stars) is entirely missing. The 5-10 real photo carousel is entirely missing. This is not a minor omission; it is a core feature delivered at ~40% of its specification.

The mute button being invisible on the main menu is a real usability gap. The constellation line-drawing animation question is less certain but the promised reward moment was not witnessed.

Score 8.5 reflects a genuinely good game that falls short of its full promise in one key area (gallery). The gallery gaps prevent acceptance as a complete product.
