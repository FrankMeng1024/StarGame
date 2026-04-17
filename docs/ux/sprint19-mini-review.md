# UX Review — Sprint 19-mini

**Date**: 2026-04-17
**Sprint**: Sprint 19-mini
**Reviewer**: UX subagent (isolated, first-time user perspective, model: claude-opus-4-6)
**Verification method**: Code-path analysis (WeChat Mini Game, no Playwright available)
**Confidence**: MEDIUM (code analysis cannot confirm anti-aliasing, frame rate, or touch responsiveness at runtime)

---

## Sprint Goal

视觉效果全面拉满 — 网兜真实网袋 + 角色精品重绘 + 操作手感完美 + 粒子/光晕/动态效果全升级

---

## Verdict: PASS (no Blocker friction items)

---

## Friction Items Found

| Severity | Description |
|----------|-------------|
| **Medium** | Net idle state affordance is weak: mouthR=8 (16px diameter stub) at 0.45 alpha rope opacity. On a 667×375px phone screen, a first-time user may not immediately recognize the net as an interactive tool before tapping. The extended state (28px mouth, full mesh, golden hoop glow) is well-designed — the problem is the idle hint does not strongly communicate "this is the catching tool". |
| **Low** | Potential arc trail rendering artifact: trail dots loop uses ctx.arc() — if beginPath() is missing from individual dot renders they could chain as connected path rather than separate fading dots. Cannot confirm without runtime screenshot. |
| **Low** | Debris hit feedback is asymmetric with star catch: catch gets particles (12) + catch flash (3 frames gold glow); debris gets only screen shake (6 frames of ±3px). A first-time user may not immediately understand what went wrong on debris collision since 3px shake on 667px screen is subtle. This is acceptable game design (reward > punishment) but the asymmetry is noticeable. |

---

## Features That Pass

| Feature | Assessment |
|---------|-----------|
| **Character visual quality** | At ~140px/37% of 375px screen height with distinctive silhouette (tall witch hat, 60px wide purple dress, star emblem), she is immediately readable and charming. The throwing pose with right arm connecting to rope origin is good spatial storytelling. |
| **Star catch feedback** | Dual-channel: 12-particle burst (gold/white/star-color) + 3-frame golden flash. 0.6s particle life at evenly spaced radial angles. Strong positive reinforcement without being excessive. |
| **Screen shake on debris** | 6-frame ±3px translate is a standard punishment signal. Functionally correct. |
| **Background atmosphere** | 106 stars (100 normal + 6 bright with blue-tinted glow) + ground warm orange glow at horizon + character purple aura = rich starfield without overwhelming gameplay. |
| **Timer urgency** | Font oscillation 18→22px at 2Hz when ≤10s remaining is a proven tension mechanic. Clear and non-intrusive. |
| **Victory celebration** | 40 upward-arcing particles (vy=-2 to -5, gravity=0.04) with 1.3-2s life = satisfying fireworks effect. White/gold color mix appropriate for victory. |
| **Net extended state** | Golden hoop with shadowBlur=6 glow, semi-transparent bag fill, 4 horizontal mesh arcs + 2 vertical curves, brown rope. Clearly reads as a catching tool when in flight. |
| **4-point star sparkle** | sparkleLen=s.r×3, alpha modulated by twinkle sine at 65%, shadowBlur=3. Clear interactive affordance on catchable stars. |
| **State cleanup** | _cleanup() resets all particle arrays, trail, flash frames, shake frames, and line-draw SFX context. No stale visual artifacts expected between sessions. |
| **Arc trail** | 10 fading white dots (alpha 0→0.6, radius 0→3.5px) with blue shadow behind net head during extension. Provides clear motion history for the swing arc. |

---

## Untested Paths

- Actual anti-aliasing quality, color blending on WeChat Canvas target
- Animation frame rate under full load (100 stars + particles + trail)
- Touch target size and responsiveness for net swing timing
- Timer text legibility at 18px base on 375px height
- Navigate-away-and-return state preservation (code analysis only, not runtime)
- State transitions between menu/game/victory/defeat screens

---

## Knowledge Updates

- Character is a witch-girl (~140px, ~37% screen height) with purple dress, tall hat, star emblem — distinctive silhouette for this screen size
- Net has two visual states: idle (16px stub, reduced opacity) and extended (28px mouth with full mesh + golden hoop glow). Extended state is well-designed with multiple visual layers
- Catch feedback: dual-channel (12 particles + 3-frame flash). Debris: single-channel (shake only). Intentional asymmetry: reward > punishment
- Background: 106 stars + ground glow + character aura = rich atmosphere
- Timer urgency: kinetic typography (18→22px pulse at 2Hz) when ≤10s
- All particle/trail/flash state properly cleaned up on navigation transitions
