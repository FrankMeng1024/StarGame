# UX Review — Sprint 5-mini

**Sprint**: Sprint 5-mini  
**Date**: 2026-04-15  
**Method**: Code-path verification (first-time user perspective)

## Friction Items Found and Resolved

| Severity | Item | Status |
|----------|------|--------|
| Critical | Bomb activation: zero visual feedback — debris vanish silently | Fixed: explosion particles (8 orange/yellow per debris location) |
| Critical | Double coins: applied silently, no annotation on result card | Fixed: "🪙×2" shown in result text when _coinsMult > 1 |
| Critical | No debounce on navigate() — double-tap could fire twice | Fixed: 300ms debounce guard in navigate() |
| Medium | Tap-outside overlay silently dismisses with no feedback | Backlog — acceptable for now |
| Medium | Gallery detail back returns to list (2 taps to reach levels) | Accepted as intentional hierarchy design |

## UX Verdict: No Blocker-level friction after fixes

All Critical issues resolved. The item system provides:
- Clear overlay with icon/name/qty/description before game
- Visual toggle feedback (green highlight + checkmark)
- Explicit "跳过" / "确定出发 →" actions
- Bomb explosion particle feedback
- Double coins "×2" annotation on result
- Items correctly consumed with subtitle "(本关结束后自动消耗)" setting expectations

## Knowledge Updates

- Item selection overlay: modal over levels screen; scroll blocked behind overlay
- Bomb item now has explosion particle burst at debris positions (orange/yellow)
- Double coins now annotated on result card with "🪙×2"
- Navigate debounce 300ms prevents double-tap navigation issues
- Gallery prev/next is unlocked-only; no dead-end buttons

## UX Problem List (All Resolved or Backlogged)

### Resolved
- Bomb feedback (Critical)
- Double coins annotation (Critical)
- Navigation debounce (Critical)

### Backlogged
- Tap-outside overlay dismiss — silent cancel; could show brief "已取消" toast (Medium)
- Gallery detail requires 2 taps to return to levels (Medium) — by design
