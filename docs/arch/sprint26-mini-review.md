# Arch Code Review — Sprint 26-mini

**Sprint**: 26-mini  
**Date**: 2026-04-18  
**Verdict**: PASS  
**Reviewer**: Arch (subagent, isolated context)

---

## Diff Summary Reviewed

Commit `1ab5f37` — 7 bug fixes across 6 screen files:

### Bug #1 — achievement.js: Title scrolled with grid (fix: extract to fixed header)

**Before**: `ctx.save(); ctx.translate(0, -_scrollY)` was applied BEFORE drawing the title, causing the title to scroll off-screen.

**After**: Title and subtitle count drawn before the `ctx.save/clip/translate` block. The scrollable grid now has an explicit `ctx.rect(0, clipTop, W, H - clipTop); ctx.clip()` followed by `ctx.translate(0, -_scrollY)`.

**Verdict**: ✅ PASS. Standard pattern: fixed header drawn in screen space before clip region established. No contract deviation.

---

### Bug #2 — game.js: HUD jitter during screen shake

**Before**: `_drawHUD(ctx, W)` was called inside the shake `ctx.save/translate` block.

**After**: The shake `ctx.restore()` is called before `_drawHUD(ctx, W)`. Comment added: "HUD and overlays drawn after shake restore — always screen-space fixed". `_drawHint` and `_drawPauseOverlay` also remain after restore.

**Verdict**: ✅ PASS. Correct canvas state machine. No security or contract issues.

---

### Bug #3 — game.js: Victory card buttons overlap content

**Before**: `const bY = cardY + cardH - 112` — fixed offset from card top, could overlap lore text.

**After**: `const bY = Math.max(cy + 8, cardY + cardH - 112)` — buttons positioned after last content element (`cy`) OR at fixed offset, whichever is lower on screen.

**Verdict**: ✅ PASS. Standard layout guard using `Math.max`. No regression risk.

---

### Bug #4 — menu.js: Achievement button label incorrect

**Before**: `'🏆 星座图鉴'` — duplicated the gallery label.

**After**: `'🏆 通关成就'` — correct label both landscape (L311) and portrait (L341).

**Verdict**: ✅ PASS. Text-only change, no logic impact.

---

### Bug #5 — shop.js: Toast uses `performance.now()` (not available in WeChat mini game)

**Before**: `until: performance.now() + 1200` and `now < _feedback.until` where `now` was the RAF timestamp.

**After**: `expiresAt: Date.now() + 1200` and `Date.now() < _feedback.expiresAt`. Field renamed from `until` to `expiresAt` for clarity.

**Verdict**: ✅ PASS. `Date.now()` is universally available in WeChat mini game context. Consistent comparison (both sides use wall-clock time). No security issue.

---

### Bug #6 — intro.js: Meteor animation uses fixed `1/60` dt

**Before**: `m.x += m.vx * (1 / 60)` — hardcoded frame time, causes slow animation when RAF fires at less than 60fps.

**After**: `const dt = _lastNow > 0 ? Math.min((now - _lastNow) / 1000, 0.05) : 1 / 60`. All physics updates use `dt`. `_lastNow` tracked per frame. Cap at `0.05s` (20fps minimum) prevents physics explosion on tab switch.

**Verdict**: ✅ PASS. Correct real-time dt computation pattern. Cap at 0.05s is appropriate. Same pattern as game.js `_dt`. `_lastNow = 0` reset in `_cleanup()` correctly ensures first-frame fallback.

---

### Bug #7 — levels.js: Item overlay rows overflow clip region

**Before**: Overlay scroll not clamped; rows drew outside card boundaries; touch events did not account for overlay scroll offset.

**After**: 
- `_overlayTotalRowsH`, `_overlayRowsClipY/H` computed per frame
- `maxRowScroll = Math.max(0, _overlayTotalRowsH - rowsAreaH)` clamps scroll
- `_overlayScrollTarget` clamped in `_drawItemOverlay` and in `_onTouchMove`
- Touch hit testing uses `scrolledTY = ty + _overlayScrollY`
- Dedicated scroll variables (`_overlayScrollY`, `_overlayScrollTarget`) isolated from level list scroll

**Verdict**: ✅ PASS. Well-isolated overlay scroll state. Clip region established before translate. Touch coordinate correction is correct. No API contract change.

---

## Overall Assessment

| Category | Result |
|---|---|
| Logic errors | None found |
| Security issues | None found |
| Interface contract compliance | PASS — no API_SPEC.md changes |
| Spec drift | None |

**All 7 fixes are correct, minimal-scope changes. No new issues introduced.**

```json
{
  "verdict": "PASS",
  "issues": [],
  "spec_drift": []
}
```
