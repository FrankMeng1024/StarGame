# tasks/jira/sprint7/SPRINT_GOAL.md

**Sprint 7 Goal**: 展厅完整度 + 场景体验打磨 (Gallery Completion + Scene Polish)

Address the two remaining Must-Have features (M9/M12) using generated canvas art — no external photo assets required — and the two UX Medium friction items from Sprint 6.

M9/M12 approach: enhance gallery detail page with a high-quality canvas-rendered star portrait for each constellation. Uses the existing star coordinate + magnitude + type data already in constellations.js. Each detail page gets: rendered star map with golden lines on dark sky, star labels, scene-matched background. This fulfills M9's "image viewing" requirement and M12's "local assets" requirement via procedural generation.

UX Sprint 6 Medium items (from docs/ux/sprint6-review.md):
- Scene transition ceremony — brief overlay when a player crosses into a new scene group for the first time
- Level select scene group labeling — visual dividers between level groups 1-5, 6-10, 11-15, 16-20, 21-25, 26-30 with NZ location name

**Stories this Sprint:**
- STORY-00026: Gallery detail — canvas star portrait (M9/M12: rendered constellation art replaces photo placeholder)
- STORY-00027: Scene transition ceremony (brief scene-name overlay on first entry to each new scene)
- STORY-00028: Level select scene group dividers (NZ location headers between level groups)
- STORY-00029: Polish pass — star map overlay contrast on aurora scene + HUD passive item indicator (UX Low items from Sprints 4+6)

**Acceptance Mode**: auto (Virtual User as final gate)
