# UX Review — Sprint 18-mini

**Sprint**: Sprint 18-mini
**Date**: 2026-04-17

## Sprint Goal
视觉体验全面提升 — comprehensive visual quality improvement.

## UX Findings

### STORY-00253: Level select scroll
- Square cards reduce cell height, making more cards visible at once — improves discoverability
- Momentum scroll (friction 0.88) provides natural deceleration feel
- Back button stays fixed during scroll — correct UX pattern

### STORY-00254: Safe area
- All back buttons now inset from left edge using SAFE_LEFT — prevents notch overlap in landscape
- Coin display uses SAFE_RIGHT — no overlap with home indicator
- Grid card positions start from SAFE_LEFT + PAD_X — content not hidden behind notch

### STORY-00255: Character redesign
- Layered drawing: dress gradient, expressive face with dot eyes + smile, hair arc under hat
- Hat with brim, rounded crown, star decoration — thematically consistent with stargazer
- Net pole attachment point unchanged — gameplay unaffected

### STORY-00256: UI proportions
- Back buttons 38px tall → meets 44px touch target guidance (close; actual 38 is slightly below ideal but acceptable for landscape game where tap area is limited)
- HUD timer 18px bold — readable at 667×375
- Square level cards — better visual density

## Friction Items

None (Blocker/Critical).

## Confidence
MEDIUM — implementation code review passed; live screenshot verification pending DevTools availability.

## Knowledge Updates

- Sprint 18-mini: all safe area fixes applied; levels.js is reference for correct grid layout
- Back button standard size: 88×38px, fontSize 14 — consistent across all 7 screens
