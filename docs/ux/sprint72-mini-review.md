# UX Review — Sprint 72-mini

**Sprint**: 72-mini  
**Story**: STORY-00385  
**Date**: 2026-04-25

## Sprint Goal
Replace HTTP photo URLs with local assets in 图鉴 (constellation gallery), confirming package size stays ≤ 4MB.

## Interaction Test Plan (First-time User Perspective)

*Starting from: gallery entry point*

1. **Find gallery**: Navigate to 星座图鉴 from menu → visible node map with constellation circles → *reachable in ≤ 2 taps*
2. **Open constellation**: Tap any node → detail panel slides in with star chart + info + photo carousel
3. **Browse photos**: Tap `›` / `‹` buttons or observe auto-advance → 4 distinct local photos cycle
4. **Return**: Tap `← 返回图鉴` → back to node map

## Findings

### What Works Well
- Star chart and constellation name are prominent and clear (猎户座 visible in header)
- Constellation detail includes rich information: region, best view month, main stars, description
- 4 local photos load without HTTP network requests — no blank/broken image states observed
- Galaxy/nebula photos are visually appropriate and high quality for a space-themed game

### Friction Items

| Severity | Description |
|----------|-------------|
| Low | Photo carousel `N/4` indicator text is inside the photo area at bottom — slightly hard to see against dark/complex photo backgrounds |
| Low | Photos 2, 3, 4 for Orion are visually similar (all Orion nebula variants) — user may not notice carousel advancing |

### Visual Fidelity
No deviation from confirmed Sprint 0 style direction observed. Dark space theme, cyan/blue constellation colors, and typography maintained.

### Navigation Regression
- Gallery boots and renders without errors
- Star chart animation runs smoothly
- Detail panel scroll area renders correctly

## UX Problem List

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1 | Carousel `N/4` indicator readability over complex photo backgrounds | Low | Deferred to backlog |
| 2 | Similar-looking photos may not signal carousel advancement to user | Low | Deferred (content-dependent, not a code issue) |

**No Blocker-level UX friction found.**

## Evidence References
- `docs/qa/sprint72-mini-evidence/STORY-00385-01-gallery-list.png` — detail page with photo
- `docs/qa/sprint72-mini-evidence/STORY-00385-04-photo2.png` — photo 2 loaded
- `docs/qa/sprint72-mini-evidence/STORY-00385-05-photo3.png` — photo 3 loaded
- `docs/qa/sprint72-mini-evidence/STORY-00385-06-photo4.png` — photo 4 loaded
