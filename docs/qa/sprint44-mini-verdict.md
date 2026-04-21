# QA Verdict — Sprint 44-mini

**Sprint**: Sprint 44-mini
**Stories**: STORY-00338, STORY-00339, STORY-00340
**Verdict**: PASS

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|-------|---------|------------|-------|
| STORY-00338 | PASS | HIGH | Title "追星少女" in calligraphy style, #e8d5ff color, purple glow visible |
| STORY-00339 | PASS | HIGH | 小熊座 random constellation shown; stars all revealed with connecting lines |
| STORY-00340 | PASS | HIGH | Varied star sizes, no diagonal streaks, natural distribution |

## AC Verification

### STORY-00338
| AC | Status |
|----|--------|
| `wx.loadFontFace()` with defensive try/catch | PASS — code verified |
| Menu title font: Ma Shan Zheng / serif | PASS — screenshot shows calligraphic rendering, not sans-serif |
| Title: '追星少女' tight, color #e8d5ff | PASS — light purple visible in screenshot |
| Title shadow: #b090ff, shadowBlur=18 | PASS — purple glow halo visible |
| Font size responsive (portrait H*0.045) | PASS — proportional size visible |
| Subtitle unchanged sans-serif | PASS — "探索88星座的奇妙旅程" in smaller plain text |

### STORY-00339
| AC | Status |
|----|--------|
| `_pickCon()` uses Math.random() | PASS — code verified |
| Consecutive duplicate avoided (_lastConIdx) | PASS — code verified |
| Star revealTime stagger 0.12s | PASS — code verified |
| Stars hidden until revealTime | PASS — code verified |
| Lines gated on both endpoint stars | PASS — code verified |
| _menuStartTime reset on showMenu() | PASS — code verified |

### STORY-00340
| AC | Status |
|----|--------|
| initBgStars uses sin-hash for x/y | PASS — code verified, _bgHash() added |
| 168 stars total (105+45+18) | PASS — code count verified |
| 3 size tiers with distinct radius ranges | PASS — tiny 0.4-0.7, medium 1.0-1.5, large 1.8-2.6 |
| Distinct seed offsets per tier | PASS — +0/+200/+400 base offsets |
| Seed includes Date.now() component | PASS — `Date.now() % 100000` passed from menu.js |
| No diagonal streak | PASS — screenshot shows natural scattered distribution |
| Large stars retain soft glow | PASS — bright:true for 18 large stars |

## Evidence
- `docs/qa/sprint44-mini-evidence/STORY-00338-01-menu.png` — b=44.1, calligraphy title, 小熊座 constellation, scattered starfield
- `docs/qa/sprint44-mini-evidence/STORY-00339-01-menu-2s.png` — b=43.9, same session, stars fully revealed with connecting lines

## Bugs
None.

## Knowledge Updates
- Menu title rendering now bypasses `drawTitle()` from canvas-utils — direct ctx calls in menu.js `_loop()`
- `initBgStars()` signature changed to accept seed — all callers in menu.js updated
- Random constellation on every showMenu() call — `_lastConIdx` persists across calls (module-level)
