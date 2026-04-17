# UX Review — Sprint 25-mini
**Date**: 2026-04-17
**Sprint Goal**: 修复9项用户反馈 — 开场动画黑屏/比例/动画消失修复、关卡导航死锁、星座展厅重命名+缩小卡片、女角色重绘、星星闪烁感
**Method**: Code-path review (WeChat Mini Game — no visual screenshots available)
**Confidence**: MEDIUM

## Friction Items

| Severity | Description |
|----------|-------------|
| Medium | Gallery 4-column grid on 375px screen: each card ~85-90px wide. May make astronomy photos harder to appreciate. Net improvement over overly-large 3-col cards, but needs visual verification. |
| Low | Rename '星座展厅'→'星座图鉴' only verified in menu.js buttons. If any other screens/hints still say '星座展厅', naming is inconsistent. |
| Low | Intro constellation at H*0.28 could be clipped on very short landscape viewports, but standard portrait 375×667 layout should be clear. |

**No Blocker or Critical friction items.** All changes are directionally correct.

## Per-Change Assessment

| Change | UX Assessment |
|--------|---------------|
| STORY-00290: Intro black screen fix + two-zone layout | Critical fix. Two-zone (upper constellation / lower title) is a clear improvement over cramped middle. |
| STORY-00291: Level nav debounce 300→100ms + reset | Right fix — deadlock was a real Blocker for players. 100ms should feel instant. |
| STORY-00292: 图鉴 rename + COLS=4 | 图鉴 is semantically better. Smaller cards improve harmony. |
| STORY-00293: Girl v5 (rim light, hair shine, ribbon) | Thematically appropriate anime polish. Details may be subtle at game scale. |
| STORY-00294: Star twinkle enhanced | Multi-speed + deep alpha + 8-point peak should create magical feeling. |

## Untested Paths
- Actual visual rendering of two-zone layout on real device
- Gallery 4-col card readability on 320px-wide screens
- Naming consistency '星座图鉴' across all screens/hints
- Star twinkle at 3.9 cycles/s — pleasant twinkling vs anxious flickering
- Girl character detail visibility at actual game scale

## Knowledge Updates
- Sprint 25-mini polish sprint: resetFade() pattern prevents stale-state black screen — applicable to other screens using fadeNavigate
- Gallery: COLS=4, named '星座图鉴'. Level debounce: 100ms + entry reset.
- Two-zone intro: H*0.28 (constellation) / H*0.68 (title) / H*0.68+38 (subtitle)
- Girl v5: purple rim light, hair shine bezier, pink waist ribbon bow
- Stars: 1.5-3.9 cycles/s, 0.35-1.0 alpha, pulsing arms, 8-point at peak
