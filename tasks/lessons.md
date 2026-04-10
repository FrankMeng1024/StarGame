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

1. **[pending] CSS pointer-events inheritance on overlay children**
   - `.hud` overlay uses `pointer-events: none` to pass clicks through to canvas
   - Interactive children (mute button, active item buttons) inherit this and become unclickable
   - Root cause: developer did not account for pointer-events inheritance when placing interactive elements inside a pass-through overlay
   - Lesson: whenever a parent element has `pointer-events: none`, ALL interactive children need explicit `pointer-events: auto`. Add to code review checklist for HUD/overlay patterns.

2. **[pending] Exported function not wired into SPA router**
   - `refreshLevels()` was exported from `levels.js` but `main.js` never called it on `navigate('levels')`
   - Root cause: function written in isolation without verifying the call site exists
   - Lesson: when writing a function meant to be triggered by a router event, verify the router actually calls it before marking the Story Done.

3. **[pending] Stale UI state not cleaned on screen re-use**
   - `showFail()` reused the same `#screen-complete` DOM; `.new-record-badge` injected by `showComplete()` persisted
   - Root cause: screen teardown logic not updated when new dynamic elements were added
   - Lesson: when adding new dynamic DOM elements to a screen, immediately check whether any sibling screen path (complete/fail) needs to clean them up.

4. **[pending] CSS deduplication — bash `cat >>` appended duplicate blocks**
   - 6 selectors defined twice due to multiple append operations
   - Root cause: incremental CSS editing via append without checking for existing definitions
   - Lesson: when adding CSS, grep for existing selectors before appending. Prefer Edit tool over bash append for CSS modifications.
