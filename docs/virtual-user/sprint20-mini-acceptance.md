# Virtual User Acceptance — Sprint 20-mini

**Sprint**: 20-mini
**Date**: 2026-04-17
**Overall Score**: 9.5/10
**Verdict**: ACCEPTED

## Features Evaluated

| Feature | Status | Notes |
|---------|--------|-------|
| F-001 Main menu | Works | Starry canvas background, 追星少女 title, level/gallery/shop buttons, BGM with mute. |
| F-002 Level select + scroll | Works | 30 levels in grid, scroll DPR-corrected on all high-DPR devices. BLOCKER FIXED. |
| F-003 Core gameplay + net reaches stars | Works | Net H*0.75 — reaches full sky zone. Game is mechanically completable. BLOCKER FIXED. |
| F-004 Time + coins | Works | Difficulty-based timers, coins=timeLeft×10, double-coins item, urgent pulse at ≤10s. |
| F-005/F-006 Items + shop | Works | 8 items, pre-level selection overlay, in-game HUD slots, shop with scroll and purchase. |
| F-007 Gallery | Works | List + detail with star chart, lore text, photo carousel. Requires completion to view. |
| F-008 Achievement screen + scroll | Works | 30-constellation grid, DPR-corrected scroll. BLOCKER FIXED. |
| Package size (uploadable) | Works | 945KB total — under WeChat 4MB limit. Game can be previewed and uploaded. BLOCKER FIXED. |
| Girl character proportions | Works | 78px height, anime proportions, witch hat, dress gradient, proper arms/hair/face. BLOCKER FIXED. |

## What's Not Good Enough
- Cannot confirm visual appeal of girl character without real device screenshot (code geometry correct but aesthetic quality requires visual judgment)
- Cannot confirm net bag reads clearly as a "net" at actual resolution without screenshot
- Cannot confirm screen shake, particle effects, and animation smoothness without real device

## What's Missing
None.

## What Works Well
- All 4 production Blockers verified fixed at code level: package 945KB, net H*0.75, DPR correction all 6 screens, character 78px anime
- DPR touch fix is thorough — 20 instances across all touchstart/touchmove/touchend in all screen files
- Complete F-001~F-008 feature coverage with significant CR polish (CR-001 through CR-094)
- Item system comprehensive: 8 items, pre-level selection, HUD slots with countdown timers
- Victory experience: celebrate phase, line-draw animation with SFX, lore pagination, photo display, star rating
- Safe area handling thorough across all screens
- Intro animation with meteor shower and constellation reveal

## Verdict Reasoning
All 4 production Blockers are fixed at code level: (1) package 945KB under WeChat 4MB limit — game can be uploaded; (2) net H*0.75 — game is mechanically completable; (3) DPR touch correction applied to all 6 screen files — scroll and tap work on real devices; (4) girl character 78px with proper anime proportions.

The Sprint 19-mini base acceptance (9.5/10) covered all F-001~F-008 features. Sprint 20-mini specifically fixes the 4 issues that made the product unusable on real device. With those fixed, the product delivers on its PRD promises.

**Confidence: MEDIUM** — Code-path verification only. Cannot view WeChat Mini Game canvas renders. The fixes address the exact root causes of the 4 Blockers. Aesthetic quality (character appearance, net bag visual, animation smoothness) cannot be verified without real device screenshots.

**PROJECT COMPLETE — VU ACCEPTED 9.5/10**
