# QA Verdict — Sprint 16

**Sprint**: 16
**Date**: 2026-04-12
**Verdict**: PASS
**Service URL**: http://localhost:9090/

---

## Per-Story Results

| Story | Title | Verdict | Confidence |
|-------|-------|---------|------------|
| STORY-00069 | SVG sprites — girl, net, debris | PASS | HIGH |
| STORY-00070 | Constellation reveal animation + sound | PASS | HIGH |
| STORY-00071 | UI fixes (gallery order, shop button, locked cards, scene text) | PASS | HIGH |
| STORY-00072 | Net collision radius + catch naturalness | PASS | MEDIUM |

---

## AC Verification Detail

### STORY-00069 — SVG Sprites
- [x] Girl character renders as anime SVG sprite (brown hair, purple dress, star badge, blue eyes) — `STORY-00069-01-character.png`
- [x] Girl throw frame visible when net extended — `STORY-00069-04-net-fired.png`
- [x] Net renders as SVG golden hoop with mesh — `STORY-00069-04-net-fired.png`
- [x] Debris renders as SVG sprites: rocket (red rocket) and meteor (grey sphere) confirmed — `STORY-00069-02-debris.png`
- [x] All sprites visible without fallback procedural drawing
- [x] Zero console errors during gameplay

### STORY-00070 — Constellation Reveal
- [x] After all stars caught, reveal animation begins with edges lighting sequentially — `STORY-00070-02-reveal-start.png` shows 6/7 stars lit, 1 still dim (Rigel)
- [x] Stars glow brighter as they light up one by one
- [x] Lines draw between lit stars progressively
- [x] Animation completes and transitions to level-complete screen — `STORY-00070-05-reveal-end.png` shows ★★★ complete screen with 7/7 caught
- [x] `playRevealNote` imported and called (ascending pentatonic during reveal)
- [x] `_revealPhase` guard prevents leak after navigation

### STORY-00071 — UI Fixes
- [x] Shop button on main menu has visible purple background at rest (not transparent) — `STORY-00071-01-menu.png`
- [x] Gallery grid: completed cards show icon + name; unlocked-incomplete and locked cards show only ？ — `STORY-00071-02-gallery-grid.png`
- [x] Gallery detail order: Chinese name → English name → Star chart → Astrophoto → Portrait → Meta → Lore — `STORY-00071-05-gallery-detail.png`
- [x] Scene intro: no location text flashing — `STORY-00071-07-scene-intro.png` shows clean game start with no text overlay

### STORY-00072 — Net Collision
- [x] Net SVG hoop visual size matches enlarged collision radius `(r + 26*0.7)` — net hoop clearly extends well beyond procedural radius
- [x] Catch flash particles emit on star catch (particle burst implementation confirmed in code)
- Note: Collision radius confirmed enlarged for both stars and debris per engine.js line fix `(s.r + 26 * 0.7) * catchBonus`

---

## Navigation Regression

All routes tested with console error checks after each navigation:

| Route | Console Errors |
|-------|---------------|
| Menu → Gallery | 0 |
| Gallery → Gallery Detail (Orion) | 0 |
| Gallery Detail → Gallery (back) | 0 |
| Gallery → Menu | 0 |
| Menu → Shop | 0 |
| Shop → Menu (back) | 0 |
| Menu → Levels | 0 |
| Levels → Menu | 0 |

**Total JS errors across full session**: 0 (favicon 404 only — not a JS error)

---

## Evidence Files

```
docs/qa/sprint16-evidence/
  STORY-00071-01-menu.png          — Shop button with purple bg at rest
  STORY-00071-02-gallery-grid.png  — Gallery: completed cards + ？cards
  STORY-00071-05-gallery-detail.png — Gallery detail correct order
  STORY-00071-07-scene-intro.png   — Game start, no scene text
  STORY-00069-01-character.png     — Girl SVG sprite idle
  STORY-00069-02-debris.png        — Rocket + meteor debris SVGs
  STORY-00069-04-net-fired.png     — Net SVG hoop + girl throw frame
  STORY-00070-02-reveal-start.png  — Constellation reveal in progress (6/7 lit)
  STORY-00070-05-reveal-end.png    — Level complete after reveal
```

---

## Bugs Found

None. All Sprint 16 ACs verified PASS.

## Knowledge Updates

- SVG sprites loaded via `new Image()` + `drawImage()` work correctly in canvas; file-cache busting needed for ES module changes during QA (required Chrome restart)
- Constellation reveal animation timing: ~200ms per edge for 7-star Orion level; runs ~1.4s total then transitions to complete screen
- `window._engine` exposure pattern useful for QA testing game state; must be removed from production code after use (confirmed removed)
- Navigation regression confirmed: all SPA routes stable with zero JS errors post-Sprint-16 changes
