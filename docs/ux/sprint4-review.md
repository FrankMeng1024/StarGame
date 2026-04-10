# UX Review — Sprint 4

**Sprint**: 4  
**Verdict**: No Blockers, No Criticals  
**Confidence**: MEDIUM

## Friction Items

| Severity | Description |
|----------|-------------|
| Medium | Passive item toast lacks explicit "already active" framing — first-time user may not understand items are working. |
| Medium | No persistent passive item indicator after toast fades (~3.8s) — user has no on-screen reminder buffs are running. |
| Low | time_ext adds 20s but no visual flourish (flash/overlay) to draw attention to the timer jump — user must self-discover. |
| Low | space_bomb button hides on consumption but visual explosion evidence was confidence=MEDIUM (animation exists in code but not directly observed in evidence screenshots). |
| Low | No item preview on level select screen — user cannot see which items will activate before entering. |

## What Was Tested
- Mobile 375×667 and desktop 1280×720 viewports
- Passive items toast at game start (all 6 passive items active)
- Active item HUD buttons: space_bomb (💣 炸弹) and time_ext (⏱️ +20秒)
- time_ext: timer confirmed to jump +16s net (01:05 → 01:21 after 600ms elapsed)
- space_bomb: button consumed and hidden after click ✓
- Navigation game→levels→menu: zero console errors ✓
- HUD button sizes: 64-68×68px — above 44px touch target minimum ✓

## Untested Paths
- Passive item visual gameplay effects (magnet pull, debris size reduction) not directly observed
- space_bomb visual explosion animation not captured in evidence
- Zero-item scenario (toast suppression)

## Knowledge Updates
- Active item buttons use emoji+Chinese text, ~64-68px — adequate touch targets
- Passive item feedback is toast-only, ~3.5s window, no persistent HUD row
- Navigation regression Sprint 4: CLEAN — zero console errors across all routes
- Shop access remains level-complete-only (pre-existing Sprint 3 low item)
