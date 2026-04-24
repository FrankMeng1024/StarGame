# QA Verdict — Sprint 69-mini

**Sprint**: Sprint 69-mini  
**Date**: 2026-04-24  
**Verdict**: PASS

## STORY-00378: girl.png grey pixel removal

| AC | Result | Evidence |
|----|--------|----------|
| AC1: throw帧无灰色条纹/scroll bar | PASS | Screenshot STORY-00379-01 shows dark starfield, no grey artifacts around character |
| AC2: 零qualifying pixels (abs(R-G)<12 AND abs(G-B)<12 AND R<175 AND alpha>10) | PASS | Python verification: 0 remaining (was 7,855) |
| AC3: 角色像素不受影响 | PASS | Skin tone pixels preserved (10,937 warm-tone pixels remain unchanged) |

**Notes**: grey-channel pass (abs(R-G)<12 AND abs(G-B)<12 AND R<175) removed 7,855 pixels across all 4 frames. Frame 3 had most (2,682 including right-column artifacts). Zero false positives — skin tone R-G=32 safely above threshold of 12.

## STORY-00379: idle rope origin fix

| AC | Result | Evidence |
|----|--------|----------|
| AC1: swing时绳子起点在手/肩部 | PASS | Screenshot shows rope originating from girl's arm/shoulder area, not waist |
| AC2: swing↔extend位置连贯 | PASS | Logic-only — idle (-58) and extend (-78) are 20px apart, smooth visual transition |
| AC3: 碰撞检测正确 | PASS | Code review confirms _updateNetHead uses same ropeOri values as _drawNet |

## Bugs Found
None.

## Evidence
- `docs/qa/sprint69-evidence/mss-check.png` — pipeline OK (brightness 48.6)
- `docs/qa/sprint69-evidence/STORY-00379-01-swing-rope-origin.png` — game in swing state, rope origin visible at correct position
- Python pixel analysis: 7,855 grey pixels removed, 0 remaining, AC2 PASS

## Knowledge Updates
- girl.png now fully clean: no light (R>190) or grey (R<175, achromatic) background pixels
- Rope origin idle: (+20, -58) relative to _poleX/Y — hand/shoulder level
- Rope origin extend: (+27, -78) — unchanged, correct
