# UX Review — Sprint 3-mini

**Sprint**: Sprint 3-mini
**Sprint Goal**: 游戏体验闭环 — 通关屏幕完整、新手可上手、物理帧率无关、危险视觉语言清晰
**Reviewer**: UX subagent (claude-opus-4-6)
**Date**: 2026-04-15

## Verdict

No Blocker-level friction. One Critical friction item.

## Friction Items

| Severity | Description | Screenshot |
|---|---|---|
| **Critical** | Tutorial hint permanent gate — `__hintSeen` stored in wx storage means the "点击屏幕发射网兜！" hint shows ONCE across all sessions. Any user who missed the 3-second window has zero recovery path: no help button, no HUD hint, no pause-menu tutorial. Storage key should be session-scoped or a persistent help option added. | STORY-00213-01-hint.png |
| **Medium** | Level select header shows "超凡天下" (WeChat DevTools frame or canvas text) vs. game name "星捕少女". Title mismatch from Sprint 2-mini not yet resolved. | STORY-00215-00-after-reload.png |
| **Medium** | Failure screen "重试" and "选关" buttons still equal visual weight. Both use similar purple-blue tones — no clear primary/secondary hierarchy. Sprint 2-mini issue remains. | (fail screen not captured this sprint) |
| **Medium** | Debris red glow (rgba 255,40,40,0.28) is visible but subtle against dark sky. Some overlap with warm star glow tones. Clear improvement over Sprint 2-mini but danger language still weak for first-time user without context. | STORY-00216-01-debris-glow.png |
| **Low** | Right-edge triangular debris partially clips off-screen in gameplay — could read as UI navigation element rather than hazard. | STORY-00213-01-hint.png |
| **Low** | Girl character at idle has no visible net/pole — no visual cue connecting her to the catching mechanic. Appears as decorative avatar. | STORY-00213-01-hint.png |
| **Low** | HUD catch counter "已抓 0/7" has no color or icon link to star targets — requires inference. | STORY-00213-01-hint.png |

## Confirmed

- Level select: level 1 shows large bold gold "1" — clearly playable. RESOLVED from Sprint 2-mini. ✅
- Debris danger visual: red/orange glow halos visible on satellite and rocket debris objects. Clear improvement. ✅
- Level icon fix: locked levels show 🔒, constellation nameZh visible on all cards. ✅
- Physics dt-based: verified in code (dt×60 normalization). No visual regression. ✅

## Untested Paths

- Tutorial hint on truly fresh session (storage already gated in test environment)
- Victory screen (no catch automation available)
- Net launch animation and catch visual in mid-throw state
- Debris collision penalty visual feedback
- Fail screen current button layout (fail screenshot not captured)
- Tapping a locked level — silence vs. feedback
- Game behavior during last-10s timer warning

## Knowledge Updates

- Sprint 3-mini: Tutorial hint permanent gate confirmed. Use session equivalent (new visit) or add persistent "?" help button in HUD for Sprint 4-mini.
- Sprint 3-mini: Level 1 icon fix CONFIRMED working — gold "1" clearly readable.
- Sprint 3-mini: Debris red glow improvement visible. Inner alpha 0.28 is subtle — Sprint 4-mini could increase to 0.45+ for stronger signal.
- Sprint 3-mini: Fail screen button hierarchy gap persists from Sprint 2-mini. drawButton default styling creates equal-weight buttons.
- Sprint 3-mini: "超凡天下" vs "星捕少女" title mismatch — may be WeChat DevTools chrome overlay (not canvas text). Needs investigation.
