# Arch Code Review — Sprint 45-mini

**Sprint**: Sprint 45-mini
**Date**: 2026-04-21
**Verdict**: PASS

## Changes Reviewed

### STORY-00341: 主菜单布局均衡化

**What changed** (`miniprogram/js/screens/menu.js` — `_loop()` layout sections only):

**Landscape layout block** — replaced hardcoded y-percentage positions with dynamic centering algorithm:
- `usableH = H - safeT - safeB - INFO_RESERVED(58)` — correct subtraction of safe areas + info panel
- `titleSize = clamp(H*0.13, 22..32)` — proportional to usable height
- `BH = clamp(usableH*0.115, 32..44)` — button height responsive, not fixed
- `contentTop = usableTop + (usableH - totalH) / 2` — mathematically centers title block + buttons in usable area
- `btnStartY = contentTop + titleBlockH + TITLE_GAP` — positional derivation from contentTop, no hardcoded values

**Portrait layout block** — same algorithm applied:
- `uiH = (H - safeB - 8) - H*0.60` — correct: area below constellation (H*0.60) to safe bottom
- `BW = W*0.72` — wider button (was W*0.60) for better mobile proportion
- Centering formula identical to landscape
- Fixes 28px portrait overflow (btnGroupH no longer hardcoded against H-160 offset)

## Contract Compliance
- No API_SPEC.md changes required (layout-only change)
- No UI_SPEC.md deviations — centering improves alignment with sprint 0 visual spec
- Changes isolated to `_loop()` layout calculation sections — no other functions touched
- No new external dependencies

## Issues
None.

## Spec Drift
None.
