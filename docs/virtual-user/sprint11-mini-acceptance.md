# Virtual User Acceptance — Sprint 11-mini

**Sprint**: Sprint 11-mini  
**Overall Score**: 9.0/10  
**Verdict**: NOT ACCEPTED  
**Date**: 2026-04-16

## Features Evaluated

| Feature | Status | Notes |
|---------|--------|-------|
| F-001 Main Menu | Works | Starfield, title "追星少女" (CR-009 rename), two buttons, BGM, mute, intro animation |
| F-002 Level Selection | Works | 30 cards, difficulty bar, locked/unlocked states, scene dividers removed |
| F-003 Core Gameplay | Works | Net swing 3.5s, stars at real RA/Dec, debris rotating, girl character, guide lines, pause system |
| F-004 Time & Coins | Works | Difficulty-scaled timer, coin formula, dynamic BGM ramp, half-coins for re-clears |
| F-005 Item System | Works | All 8 items, pre-level selection, situation recommendations, all effects verified |
| F-006 Level Complete | Works | Particles, line-draw, settlement, paginated lore, "完成✓" now correctly dismisses lore and reveals action buttons |
| F-007 Gallery | **Partial** | Grid + detail with metadata + lore + 1 CDN photo (160px). PRD promises 5-10 photos in a carousel; delivers 1 static image per constellation. |
| F-008 Save System | Works | wx.setStorageSync for all state, silent degradation |
| CR Features (009-086) | Works | All CRs (rename, speed, visual upgrades, items, intro, dynamic BGM, etc.) functioning |

## What's Not Good Enough

1. **F-007 Gallery Photo Carousel**: PRD F-007 explicitly promises "图片轮播（5-10张真实图片，包含：星空实拍、星座连线图、神话插图等）". CR-015 reinforces with "horizontal CSS scroll carousel showing multiple astrophotos". CR-029 adds visual polish to this carousel. Three product documents describe a multi-photo browseable experience. The implementation delivers 1 static CDN image per constellation — not 5-10 in a carousel. 

   Sprint 11 made significant progress (0 photos → 1 photo per constellation). But the promise was never "at least 1 photo" — it was "5-10 photos in a browseable carousel." If remote CDN loading works for 1 image, it can work for multiple images per constellation.

## What's Missing

- Multi-photo carousel in gallery detail (PRD F-007 + CR-015 + CR-029 all specify 5-10 images per constellation in carousel format — not a single static image)

## What Works Well

- Core gameplay loop is polished and satisfying — net swing, star capture, particle effects, constellation line-draw create a genuinely rewarding experience
- Item system with pre-level selection, situation recommendations, and diverse effects adds strategic depth
- Level complete experience with paginated lore and victory animation is excellent — "完成✓" fix removes the last interaction friction
- Intro animation with meteor shower and constellation reveal sets a premium tone
- Menu cover with geolocation-based constellation display is a standout feature
- 30 constellations with real astronomical data (RA/Dec, magnitude mapping) is impressive educational content
- BGM dynamic speed ramp at 15 seconds creates genuine tension
- Overall visual quality — glassmorphism UI, ground silhouettes, star twinkling — feels like a premium mobile game
- The addition of even 1 real astrophoto per constellation is a significant step forward from the text-only gallery

## Verdict Reasoning

The product is excellent across 7 of 8 feature areas and dozens of CRs. The core gameplay, item system, level progression, UI polish, and educational content all meet or exceed promises. F-007 remains partially fulfilled.

Score 9.0/10. Going from 0 photos (Sprint 10 blocker score: 8.8) to 1 photo per constellation is real progress — but the PRD + CR-015 + CR-029 promise 5-10 photos in a browseable carousel. The gap is narrower but the carousel promise remains unfulfilled. Cannot accept at 9.5+ with a clear PRD+CR commitment to 5-10 photos that delivers only 1.
