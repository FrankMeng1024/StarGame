# QA Verdict — Sprint 8-mini

**Date**: 2026-04-16
**Sprint**: Sprint 8-mini
**Verdict**: PASS

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|---|---|---|---|
| STORY-00226 | PASS | HIGH | globals.js: 4 safe area constants exported, initGlobals() accepts safeArea 5th arg, app.js passes sysInfo.safeArea, fallback to 0 when undefined |
| STORY-00227 | PASS | HIGH | HUD bar at ST+52, text at ST+26, bomb at ST+58, stars skyY0 = ST+60, debris skyY0 = ST+70 |
| STORY-00228 | PASS | HIGH | menu startY = H - G.SAFE_BOTTOM - 180 |
| STORY-00229 | PASS | HIGH | All 3 screens: back buttons at G.SAFE_TOP+14, PAD_TOP local variables, _totalH includes G.SAFE_BOTTOM |

## Bugs Found

| Priority | Description |
|---|---|
| Medium (benign) | gallery.js detail view: _detailTotalH is relative content height; maxScroll could be negative for very short content, but Math.max(0,...) clamps it. No functional impact. |

## Untested Paths (require real device)
- Visual rendering on notch devices (iPhone 14 Pro, safeArea.top=59)
- Visual rendering on non-notch devices (iPhone SE, fallback to 0)
- Touch hit-test accuracy on back buttons at G.SAFE_TOP+14
- Scroll near bottom safe area boundary on real hardware

## Knowledge Updates
- Safe area support centralized in G.SAFE_TOP/BOTTOM/LEFT/RIGHT, fed from wx.getSystemInfoSync().safeArea at boot
- SAFE_BOTTOM = h - safeArea.bottom (wx safeArea.bottom is absolute y coordinate, not inset)
- All back buttons consistently at G.SAFE_TOP + 14 across all screens
- Gallery detail scroll model: fixed header at G.SAFE_TOP+14, clip from G.SAFE_TOP+58
