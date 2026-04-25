# UX Review — Sprint 79-mini

**Sprint**: 79-mini
**Sprint Goal**: UI全局风格统一化 — 商店/选关/图鉴页面视觉语言一致，消除割裂感
**Confidence**: LOW (DevTools 3.15.2 black-canvas blocker — 10th+ consecutive Sprint, code-path analysis only)
**Date**: 2026-04-25

## Summary

Sprint 79 addresses five stories covering header bar unification, shop redesign, level node visual upgrades, gallery hex edge refinement, and combo achievement positive feedback. The goal — eliminating visual fragmentation across screens — is the right priority for a game that wants to feel cohesive and premium.

However, **all visual assessments are LOW confidence**. The DevTools base library 3.15.2 dialog continues to block game loading (confirmed in screenshots: black canvas with "Download Base Lib Version 3.15.2 Fail" dialog and HTTP 500 error in console). No live interaction or visual rendering could be verified. All assessments below are derived from code-path analysis provided by the Arch subagent.

**No Blocker friction items identified from code analysis.** Several Medium and Low risks are noted that require live verification.

## Overall UX Assessment

From a structural perspective, the Sprint's approach is sound:

- **Correct instinct**: extracting `drawHeaderBar()` as a shared function eliminates the "two different apps" feeling that inconsistent headers create. A first-time user should now perceive levels and gallery as pages within one coherent product.
- **Correct instinct**: replacing emoji lock (unicode glyph) with canvas-drawn lock icon. Emoji rendering varies wildly across devices and OS versions — a canvas primitive will render identically everywhere.
- **Correct instinct**: addressing the Sprint 78 feedback asymmetry (combo break red flash vs. text-only combo achievement). Adding a green achievement flash creates symmetry in the reward/punishment feedback loop.

**Concern**: Several visual parameters are tuned to extremely subtle levels (hex edges at 10-18% alpha, green flash at 12% max opacity). Subtlety is elegant, but if these effects are imperceptible on real devices, they serve no user-facing purpose. This cannot be judged without live rendering.

## Per-Feature UX Analysis

### STORY-00414: Header Bar Unification (drawHeaderBar)

**What was verified (code-path)**:
- Both `levels.js` and `gallery.js` call `drawHeaderBar(ctx, W, H, title, opts)` — same function, same API
- Return value `backRect` is correctly captured as `_backRect` in both screens — back button touch target is wired
- Title text: "选择关卡" for levels, "星座图鉴" for gallery — clear, descriptive Chinese labels
- Right-side progress text: "X/30 星座" for levels, "X/N 已解锁" for gallery
- `titleFont` is declared before use in both files (no reference error risk)

**What could NOT be verified**:
- Actual visual weight and proportion of the header bar
- Whether the back button touch area is large enough for comfortable tapping (especially on smaller devices)
- Whether progress text truncates or overlaps on narrow viewports
- Whether the header feels visually identical across screens or has subtle differences in spacing/alignment
- Font rendering at the specified sizes across different device DPRs

**Friction risks**:
- (Medium) The progress text labels differ in format: "X/30 星座" uses a fixed denominator, "X/N 已解锁" uses a dynamic one. A first-time user seeing "0/30 星座" may not immediately understand what "星座" refers to or what the 30 represents. Consider whether a brief contextual label (e.g., "已解锁 0/30") would be clearer.
- (Medium) Back button hit area sizing is critical. The `backRect` is returned from the function, but its physical size in pixels at various device widths is unknown. If under 44x44 logical pixels, it will cause tap frustration on touch devices.

### STORY-00415: Shop Deep-Space Cards + Nebula Background

**Assessment**: This story was part of the Sprint scope (CR-135/136/137/141), but the evidence provided focused on levels.js and gallery.js changes. Shop (`shop.js`) modifications were not included in the Arch code-path analysis summary provided to me. **Cannot assess this story.**

### STORY-00416: Level Node Constellation Patterns + Pulse Glow

**What was verified (code-path)**:
- Canvas lock icon replaces emoji: arc + rect drawn with canvas primitives
- Node gradient uses deep dark purple tones: `rgba(12,8,40,0.90)` to `rgba(30,18,70,0.88)` to `rgba(8,5,28,0.92)`
- Pulse ring uses sin oscillation with +/-3px amplitude, 30% alpha, 2px line width

**What could NOT be verified**:
- Whether the canvas lock icon is recognizable at actual node size (small canvas drawings can become muddy)
- Whether the deep purple gradient reads as "premium space theme" or just "dark blob" on lower-brightness screens
- Whether the pulse ring animation is perceptible at 30% alpha and 3px variation — this is very subtle
- Whether constellation micro-patterns inside nodes are visible and add value or create visual noise

**Friction risks**:
- (Low) Lock icon clarity: a small arc+rect at node scale against a dark purple gradient may lack sufficient contrast. If users cannot tell locked from unlocked at a glance, level selection becomes frustrating.
- (Low) Pulse ring subtlety: sin oscillation of +/-3px at 30% alpha is at the edge of perceptibility. If the animation is invisible in practice, it adds code complexity without user benefit.

### STORY-00417: Gallery Hex Edge Refinement

**What was verified (code-path)**:
- `_drawHexEdges` rewritten: `lineWidth=1`, no shadow blur, solid lines
- Unlocked connection pairs: `rgba(160,120,255,0.18)` with 1.5px endpoint dots
- Locked connection pairs: `rgba(80,70,120,0.10)` at 50% alpha
- Completed nodes: 2px gold stroke + 4 decorative corner dots

**What could NOT be verified**:
- Whether 18% alpha lines are visible on actual device screens (especially OLED panels at low brightness)
- Whether 10% alpha locked connections are perceptible at all — this is extremely faint
- Whether the 1.5px endpoint dots read as intentional design or rendering artifacts
- Whether gold borders on completed nodes create sufficient visual hierarchy distinction

**Friction risks**:
- (Low) Hex edge visibility: `rgba(160,120,255,0.18)` is an 18% opacity purple line. On many devices, particularly at lower brightness settings, this may be completely invisible. The constellation connection pattern is presumably a core visual identity element — if users cannot see it, the gallery loses its thematic purpose.
- (Low) Locked vs unlocked distinction: the difference between 18% and 10% alpha on the same color family is approximately 8 percentage points of opacity. This is likely imperceptible to most users, meaning locked and unlocked connections will look identical (or both invisible).

### STORY-00418: Combo Achievement Green Flash

**What was verified (code-path)**:
- `_comboAchieveFlash` counter triggers at multiples of 3 combo count
- Green overlay: `rgba(0,200,80,alpha)` at maximum 12% opacity
- Fades over 8 frames

**What could NOT be verified**:
- Whether 12% max opacity is perceptible during fast gameplay (player's attention is on falling stars, not screen tint)
- Whether the green color reads as "positive" rather than confusing/alarming
- Whether 8-frame fade duration feels like a "flash" or is too slow/fast
- Whether the trigger threshold (multiples of 3) feels rewarding or too frequent/infrequent

**Friction risks**:
- (Low) The combo break red flash was noted in Sprint 78 review. If the green achievement flash at 12% max opacity is substantially less visible than the red break flash, the feedback asymmetry remains in practice even though it is technically addressed. The fix exists in code but may not exist in the user's perception.

## Friction Items

| Severity | Description | Evidence |
|---|---|---|
| Medium | Header progress text ("X/30 星座", "X/N 已解锁") may be unclear to first-time users. The denominator formats differ, and "星座" as a unit label requires domain knowledge. At 0 unlocked, the cold numbers provide no motivational context. | Code analysis only — no live screenshot |
| Medium | Back button (`backRect`) touch area sizing unverifiable. If physical hit area is below 44x44 logical pixels on any target device, navigation will be frustrating. | Code analysis only — no live screenshot |
| Low | Canvas lock icon (arc+rect) at node scale may lack contrast against dark purple gradient background (`rgba(12,8,40,0.90)`). Users may not distinguish locked from unlocked levels at a glance. | Code analysis only — no live screenshot |
| Low | Gallery hex edges at 18% alpha (unlocked) and 10% alpha (locked) are near or below perceptibility thresholds on many devices. The constellation connection visual identity may be invisible in practice. | Code analysis only — no live screenshot |
| Low | Combo green flash at 12% max opacity risks being imperceptible during gameplay, leaving the feedback asymmetry unresolved in the user's actual experience despite being addressed in code. | Code analysis only — no live screenshot |

## Untested Paths

All paths below require live rendering to verify and are currently blocked by the DevTools 3.15.2 infrastructure issue:

- Live visual rendering of unified header bar on levels, gallery, and shop screens
- Back button touch responsiveness and hit area adequacy across device sizes
- Header text truncation/overflow behavior on narrow viewports (e.g., iPhone SE width)
- Canvas lock icon visual clarity and recognizability at rendered node size
- Level node pulse ring animation smoothness and perceived quality
- Gallery hex edge visibility on actual device screens (especially low-brightness / OLED)
- Gold border + decorative dots rendering quality on completed gallery nodes
- Combo green flash perceptibility during actual gameplay at speed
- Navigation flow: levels back button to menu, gallery back button to menu
- State preservation: navigate away from levels/gallery and return
- Visual cohesion between unified screens — do they actually feel like one app?
- Performance impact of new gradient/animation additions on lower-end WeChat clients
- Shop screen (STORY-00415) was not included in the code-path evidence provided

## Confidence and Reasoning

**Overall Confidence: LOW**

This is a visual polish and consistency Sprint. By its nature, the value proposition is almost entirely visual — "do these screens feel unified?" is a question that can only be answered by looking at them. Code analysis can confirm:

- Functions are called correctly (verified)
- Return values are wired properly (verified)
- No obvious runtime errors (verified)
- Parameters are within reasonable ranges (verified)

Code analysis **cannot** confirm:
- Whether the visual result looks good, cohesive, or premium
- Whether subtle effects (18% alpha lines, 12% green flash, 3px pulse) are perceptible
- Whether touch targets are adequately sized
- Whether the overall "feel" matches the Sprint Goal of eliminating fragmentation

For a Sprint whose entire purpose is visual unification, the inability to see the visuals makes confidence inherently LOW. The code structure appears correct and the architectural approach (shared `drawHeaderBar`, canvas primitives replacing emoji, consistent color palettes) is sound. But "correct code" and "good UX" are not the same thing — the gap between them is exactly what live testing would reveal.

**Recommendation**: When the DevTools base library issue is resolved, prioritize a focused visual verification session covering all five stories. Pay special attention to the subtle effects (hex edge alpha, combo flash, pulse ring) that are most at risk of being imperceptible.
