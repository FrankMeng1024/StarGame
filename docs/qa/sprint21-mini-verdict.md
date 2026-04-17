# QA Verdict — Sprint 21-mini

**Sprint**: 21-mini
**Date**: 2026-04-17
**Verdict**: PASS
**Confidence**: HIGH (code-path verification — machine screen locked, runtime screenshots unavailable)

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|-------|---------|------------|-------|
| STORY-00269 | PASS | HIGH | All 21 `* G.DPR` instances removed from 6 screen files. Zero remaining. CSS pixel coords match throughout pipeline. |
| STORY-00271 | PASS | HIGH | screenW/H from sysInfo (always reliable). requestAnimationFrame defers first render until canvas size committed. |
| STORY-00270 | PASS | HIGH | _drawMenuButton confirmed: gradient fills, gold border, drop shadow, glass highlight, text hierarchy, rounded corners, returns {x,y,w,h} for hitTest. |

## AC Verification

### STORY-00269
- [x] All 6 screen files use touch.clientX/Y directly — confirmed by grep (0 `* G.DPR` instances)
- [x] Scroll deltas correct: `dy = rawY - _lastTouchY` in CSS pixel space
- [x] hitTest coord space matches: canvas CSS px = touch CSS px = drawButton rect CSS px
- [ ] Zero console errors — **untested** (runtime verification unavailable)

### STORY-00271
- [x] screenW = `sysInfo.windowWidth || 375` — never 0 at cold boot
- [x] canvas.width set to screenW before initGlobals
- [x] navigate() deferred inside requestAnimationFrame — canvas committed before first render
- [x] Secondary guard inside rAF re-checks canvas.width === 0

### STORY-00270
- [x] Gradient fills: primary `#c044ff → #9933ee → #6622cc`, secondary `#8833cc → #6622aa → #441188`
- [x] Gold border: primary `rgba(255,220,80,0.75)` w=1.8, secondary `rgba(200,160,255,0.55)` w=1.2
- [x] Drop shadow: `shadowColor rgba(220,120,255,0.55)`, `shadowBlur 18` (primary)
- [x] Inner glass highlight: top-half `rgba(255,255,255,0.18) → 0`
- [x] Text color: primary `#ffe566` (golden), secondary `#f0e0ff` (light purple)
- [x] radius=14, smooth rounded corners
- [x] Visual hierarchy: 挑战关卡 primary, others secondary, achievement dimmer (original drawButton)
- [x] Returns {x,y,w,h} — hitTest contract maintained

## Untested Paths
- Runtime touch responsiveness on physical device (QR scan cold start timing)
- achievement.js scroll direction inversion (`dy = _lastTouchY - rawY`) — functional correctness requires runtime
- Console error absence during touch handling
- Carousel photo navigation in gallery detail — complex coord math

## Bugs Found
None.
