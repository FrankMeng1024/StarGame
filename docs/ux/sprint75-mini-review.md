# UX Review — Sprint 75-mini

**Sprint Goal**: 游戏手感精化 — 左臂自然摆动 + 星星抓取动画反馈 + CR-144障碍物系统验收
**Confidence**: MEDIUM (code-path analysis; DevTools blocker prevents live testing)
**Verdict**: No Blocker or Critical friction items

## Friction Items

| Severity | Feature | Description |
|---|---|---|
| Low | Aim guide | Alpha 0.12 may be imperceptible on low-brightness devices. New players who need directional help most may not see the guide. Learnable in 2-3 throws regardless. |
| Low | Star fade-out | 0.4x radius + 0.5x alpha + 250ms makes the fade effectively invisible during gameplay — particle burst dominates attention. Functions as "no harsh vanish" defense rather than a visible feature. |
| Low | HUD bounce | During fast gameplay, player attention is on the net/stars (center screen), not top-right HUD. Bounce reads as peripheral twitch at best. Appropriate — HUD should not compete with gameplay animation. |

## Overall Assessment

The four Sprint 75 features collectively represent a successful "game feel" polish pass:

- **Left arm counter-sway** (strongest): biomechanically correct counter-motion at 30% amplitude makes the girl feel alive. Players will not consciously notice it but will unconsciously feel the character has weight and balance. No friction risk.
- **HUD bounce**: appropriate secondary catch confirmation. Snappy 1.0→1.4→1.0 scale. Correctly subtle.
- **Star fade-out**: perceptually equivalent to instant disappear, but correctly prevents any "pop/vanish" harshness. A valid defensive design choice.
- **Aim guide**: subtlety-first design. At 0.12 alpha, primarily useful after players already know the mechanic. Z-order placement (below stars) is correct.

No features add distraction or confusion. All err toward subtlety, which is correct for a polish Sprint.

## Knowledge Updates
- Left arm counter-sway: lUpper += netDeg * (-0.3) * swingWeight during swing phase only
- HUD bounce: _hudStarFlashT=200 triggers sin-curve scale animation, peaks 1.4x
- Star fade: grey dot (#aaaacc) at r*0.4, alpha=fadeAlpha*0.5, fades over ~250ms
- Aim guide: rgba(255,215,0,0.12), below stars in z-order, swing state only
- Draw order: conLines → aimGuide → stars → obstacles → debris → particles → grass → girl → net
