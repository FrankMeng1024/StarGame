# tasks/lessons.md — 星捕少女 (StarCatcher)

## Sprint 0 — 2026-04-10
- [archived: TECH_SPEC.md §spike-decision] 这是一个纯前端 Canvas 游戏，没有后端。Sprint 1 Spike 已跳过（Arch声明）。

## Sprint 2 — 2026-04-10
Sprint 2: clean Sprint, no retrospective actions.
- Zero bugs found by QA/UX during Integration. 2 Critical bugs found+fixed during development (ES module split-state, hint dismiss race condition).
- QA verdict: PASS. UX verdict: no Blockers. Arch review: PASS.
- Lightweight retro rule applied: steps 1-3 skipped.

## Sprint 4 — 2026-04-10
Sprint 4: clean Sprint, no retrospective actions.
- Zero bugs found by QA/UX. Arch review: PASS (3 Medium notes, no Blockers).
- QA verdict: PASS (0 bugs). UX verdict: no Blockers (2 Medium, 3 Low).
- Key debugging note: ES module cache requires script src version bump (not just page query param) to force fresh evaluation. `window.__state` exposure added for test injection.
- Lightweight retro rule applied: steps 1-3 skipped.
## Sprint 3 — 2026-04-11
Sprint 3: clean Sprint, no retrospective actions.
- Zero bugs found by QA/UX. Arch review found 1 Critical + 3 Medium — all fixed before QA verdict.
- QA verdict: PASS. UX verdict: no Blockers. Arch spot-check: PASS.
- Lightweight retro rule applied: steps 1-3 skipped.

## Sprint 5 — 2026-04-10
Full retrospective required: Arch found 1 Blocker + 2 Critical + 1 Medium pre-demo bugs.

**What worked:**
- Arch subagent code review caught all 4 bugs before QA ran — process worked correctly as designed
- QA/UX ran clean (0 bugs) once Arch bugs were fixed — demonstrates Arch gate is effective
- Navigation regression: all 10 routes clean, 0 JS errors across full round-trip

**What failed (root causes):**

1. **[archived: Arch code review checklist]** CSS pointer-events inheritance on overlay children
   - `.hud` overlay uses `pointer-events: none` to pass clicks through to canvas
   - Interactive children (mute button, active item buttons) inherit this and become unclickable
   - Root cause: developer did not account for pointer-events inheritance when placing interactive elements inside a pass-through overlay
   - Rule added to Arch review: whenever a parent element has `pointer-events: none`, ALL interactive children need explicit `pointer-events: auto`.

2. **[archived: Frontend Dev rule]** Exported function not wired into SPA router
   - `refreshLevels()` was exported from `levels.js` but `main.js` never called it on `navigate('levels')`
   - Root cause: function written in isolation without verifying the call site exists
   - Rule: when writing a function meant to be triggered by a router event, verify the router actually calls it before marking the Story Done.

3. **[archived: Frontend Dev rule]** Stale UI state not cleaned on screen re-use
   - `showFail()` reused the same `#screen-complete` DOM; `.new-record-badge` injected by `showComplete()` persisted
   - Root cause: screen teardown logic not updated when new dynamic elements were added
   - Rule: when adding new dynamic DOM elements to a screen, immediately check whether any sibling screen path (complete/fail) needs to clean them up.

4. **[archived: Frontend Dev rule]** CSS deduplication — bash `cat >>` appended duplicate blocks
   - 6 selectors defined twice due to multiple append operations
   - Root cause: incremental CSS editing via append without checking for existing definitions
   - Rule: when adding CSS, grep for existing selectors before appending. Prefer Edit tool over bash append for CSS modifications.

## Sprint 7 — 2026-04-11
Full retrospective required: Arch found 1 Blocker + 1 Critical pre-demo bugs.

**What worked:**
- Arch subagent code review caught both bugs before QA ran — gate working as designed
- QA/UX ran clean (0 bugs, 0 console errors) once Arch bugs were fixed
- Navigation regression: all 6 routes clean across gallery-detail, levels, game, shop, gallery, complete, fail
- seenScenes persistence pattern (Set → array → Set) worked correctly on first attempt

**What failed (root causes):**

1. **[archived: Frontend Dev rule]** Timer drain during deferred game loop start
   - Whenever game loop start is deferred by any async operation (scene intro, tutorial), `lastTick` must be reset at the deferral completion point, not at the deferral initiation point.

2. **[archived: Frontend Dev rule]** Input listeners active before game is ready to receive input
   - Any pre-game state (cutscene, intro overlay, tutorial) must set a boolean guard before registering or activating input listeners. `_handleInput` must check this guard before acting.

**Rule updates made:**
- Lessons 1 and 2 promoted to Frontend Dev rules (confirmed no exceptions in Sprint 8).

## Sprint 8 — 2026-04-11
Sprint 8: clean Sprint (QA/UX/Arch), but VU NOT ACCEPTED (8.5/10).

**What worked:**
- Both stories (STORY-00030, STORY-00031) implemented cleanly — Arch PASS, QA PASS (HIGH confidence, 0 bugs), UX no Blockers
- VU score improved from 9.3 (Sprint 7) to — wait, Sprint 8 VU scored 8.5. Sprint 7 VU scored 9.3.
- VU supplementary evidence round resolved 3 of 5 complaints (grid column count, completion flow evidence, star differentiation evidence)

**What failed (root causes):**

1. **[pending]** PRD content depth underestimated at Sprint 0
   - PRD F-007 promises "图片含星空实拍、星座连线图" and "神话故事500-800字". These content requirements were accepted at Sprint 0 but never fully scoped as Stories.
   - Root cause: content requirements (image depth, text length) were not translated into measurable ACs. "Gallery detail shows lore text" passed QA without checking character count against the PRD spec.
   - Rule candidate: **Text-length PRD requirements must be translated to specific character-count ACs at Sprint Planning. QA must verify against the count, not just that text is present.**

2. **[pending]** VU evidence gaps caused initial score deflation
   - VU initial score 7.8 included 3 items that were actually implemented but not evidenced in the initial flipbook (completion flow, star differentiation, grid column count). Score needed a supplementary round to reach 8.5.
   - Root cause: main agent assembled VU flipbook using only navigate() calls without completing the game naturally — completion flow screenshot was missing entirely.
   - Rule candidate: **VU flipbook must include a completion-screen screenshot obtained by navigating to the complete screen, not just game + levels + gallery. PRD completion flow (F-006) is always a required VU evidence item.**

## Sprint 6 — 2026-04-10
Sprint 6: clean Sprint, no retrospective actions.
- Arch found 1 Medium (empty-Set guard) fixed before QA — caught at correct gate.
- QA verdict: PASS (all 4 stories, HIGH confidence, 0 bugs).
- UX verdict: 0 Blockers, 2 Medium (scene transition ceremony, level grouping labels), 2 Low.
- Navigation regression: all screens clean, 0 JS errors.
- Lightweight retro rule applied: steps 1-3 skipped. Sprint 5 pending items all archived above.
- Rule updates made: Sprint 5 lessons 1-4 promoted to Arch/Frontend Dev rules.
