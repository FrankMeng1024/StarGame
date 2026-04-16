# Arch Code Review — Sprint 14-mini

**Sprint**: Sprint 14-mini  
**Date**: 2026-04-16  
**Initial Verdict**: FAIL → **Final Verdict**: PASS (after fixes)

## Stories Reviewed
- STORY-00243: 黑屏修复 — boot()即时启动，auth后台异步
- STORY-00244: 横屏适配 — game.json landscape + menu双栏布局

## Issues Found

### Critical (Fixed) — State overwrite race condition
**Story**: STORY-00243  
**Description**: `state.fromSaveData(saveData)` in background async performed a blind overwrite of the live state singleton. If the user completes a level between `navigate()` and the cloud sync returning, the cloud data (which doesn't yet know about the just-unlocked level) would overwrite the user's local progress.

**Fix**: Added `state.mergeFromCloudData()` which unions unlocked levels, takes best levelScores, takes max coins, and unions seenScenes. Never regresses player progress. Used in `game.js` background sync instead of `fromSaveData`.

### Medium (Fixed) — Button height floor
**Story**: STORY-00244  
**Description**: Landscape button height `BH = min(42, (H - SAFE_TOP - SAFE_BOTTOM - 120) / 3)` could produce very small tappable areas on devices with large safe areas.

**Fix**: Added `Math.max(32, ...)` floor — minimum 32px button height maintained regardless of screen dimensions.

### Medium (Deferred) — Shallow spread of DEFAULT_SAVE nested types
**Story**: STORY-00243  
**Description**: `loadSaveLocal()` returns `{ ...DEFAULT_SAVE }` which is shallow. Latent fragility if nested objects are added. Not a current bug since `fromSaveData()` immediately constructs new Sets/Maps from the data. Deferred to backlog.

## Layout Validation at W=844, H=390

| Element | Calculation | Result |
|---|---|---|
| Constellation cx | 844*0.28 | 236px (left quadrant) |
| Constellation cy | 390*0.45 | 175px (vertical center) |
| Constellation BOX | min(390*0.80, 844*0.44) | 312px |
| Right panel start | 844*0.56 | 472px |
| Right panel width | 844-472-0-12 | 360px |
| Button width | 360px | Full right panel |
| Button height | min(42, 90) → max(32, 42) | 42px ✓ |
| Button 1 y | 138 | ✓ |
| Button 3 bottom | 242+42=284 | Well within H=390 ✓ |

## Verdict

PASS — Critical issue resolved by merge strategy. Medium issues addressed. Portrait layout unchanged from working baseline.
