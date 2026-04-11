# UX Review — Sprint 10

**Sprint**: 10
**Reviewer**: UX Subagent (first-time user perspective)
**Date**: 2026-04-11
**Confidence**: HIGH

## Sprint 10 Goal
Reduce net swing speed, persist constellation lines, add ground silhouette backgrounds, rename to 追星少女, redesign item system with pre-level selection and manual activation.

## Friction Items

| Severity | Description | Screenshot |
|----------|-------------|------------|
| Medium | Level fail screen: lore text is cut off at the bottom and requires scrolling. The truncated text competes with action buttons (Retry/Back). The user's primary need after failure is to retry or exit — the lore block should either fit within the viewport or be collapsed behind a 'read more' toggle. | UX-06-level-fail.png |
| Medium | In-game item slot HUD: no visible label or tooltip reminding the user which keys activate the slots. A new user who forgot the modal instruction has no in-game reminder of the 1/2/3 activation keys. Small key labels directly on/below each slot icon would reduce cognitive load. | UX-05-slot-active.png |
| Low | Gallery detail page: the Star Chart section is only partially visible at the bottom of the viewport — only the header bar shows. A first-time user might miss that more content exists below. | UX-09-gallery-detail.png |
| Low | Item selection modal: the passive item section (双倍金币) cannot be selected/deselected. A first-time user may be confused about why this item behaves differently. A brief "自动激活" label or help icon would improve clarity. | UX-03-item-modal.png |
| Low | Passive coin badge (🪙) in game HUD is very small and unlabeled. Its meaning is not self-evident during gameplay. | UX-05-slot-active.png |

## What Works Well

- **Rename to 追星少女**: Beautifully executed with gold calligraphy treatment and warm glow. Immediately sets the tone. Visible clearly on both desktop and mobile (390px).
- **Item selection modal**: Clean design with clear active/passive categorization. Numbered slot badges (1, 2) map directly to keyboard activation keys. Dynamic button text ("开始关卡 (2个道具)") gives confirmation of selection state.
- **Ground silhouette**: Rolling hills with amber horizon glow add atmospheric depth. Stars spawn only in the sky area.
- **Item slot HUD**: Draining progress bar on activation is clear visual feedback. Depleted vs ready states are visually distinct.
- **Navigation**: All routes clean with zero console errors. No dead-ends found.
- **Mobile**: Menu renders well at 390px viewport.

## Untested Paths
- Shop screen (not in evidence set)
- Level completion success screen (only fail screen tested)
- Item activation visual feedback moment (only post-activation state shown)
- Constellation line persistence with 3+ caught stars
- Mobile viewport for non-menu screens

## Knowledge Updates
- Sprint 10 rename to 追星少女 complete; gold calligraphy title with warm glow is the new brand identity
- Item system: pre-level modal separates active (1/2/3 keys) from passive (auto) items; numbered badges on selected cards; skipped correctly when no items owned
- Ground silhouette: rolling hills + amber horizon glow; stars restricted to sky area above ground
- Gallery detail: constellation animation, metadata table, star chart section; requires scroll to see chart content
- Navigation regression clean across all tested routes (0 console errors)
