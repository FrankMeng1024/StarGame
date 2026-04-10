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

1. **[pending]** Timer drain during deferred game loop start
   - When `start()` defers `_loop` via a callback (e.g. a scene intro overlay), `lastTick = performance.now()` set at the top of `start()` becomes stale by the time `_loop` actually runs. First `dt` calculation drains the full intro duration from `timeLeft`.
   - Root cause: developer set `lastTick` as standard engine initialization without accounting for deferral. The assumption "I set it before calling the callback" was incorrect when the callback runs 2500ms later.
   - Fix: reset `this.lastTick = performance.now()` inside the `onDone` callback, immediately before the first `_loop` call.
   - Rule candidate: **Whenever game loop start is deferred by any async operation, `lastTick` must be reset at the deferral completion point, not at the deferral initiation point.**

2. **[pending]** Input listeners active before game is ready to receive input
   - `addEventListener` for click/keydown registered at start of `start()`, before `_showSceneIntro` runs. No guard in `_handleInput` — any click during 2500ms intro flies the net before the game begins.
   - Root cause: "register listeners on start" pattern assumed the game was immediately playable. Did not account for pre-game states where input should be blocked.
   - Fix: `_introPlaying = true` before intro, `if (this._introPlaying) return;` at top of `_handleInput`, `_introPlaying = false` in `onDone`.
   - Rule candidate: **Any pre-game state (cutscene, intro overlay, tutorial) must set a boolean guard before registering or activating input listeners. `_handleInput` must check this guard before acting.**

**Rule updates made:**
- Lessons 1 and 2 above remain [pending] until Sprint 8 retrospective — promote to Arch/Frontend Dev rules if no exception found.

## Sprint 6 — 2026-04-10
Sprint 6: clean Sprint, no retrospective actions.
- Arch found 1 Medium (empty-Set guard) fixed before QA — caught at correct gate.
- QA verdict: PASS (all 4 stories, HIGH confidence, 0 bugs).
- UX verdict: 0 Blockers, 2 Medium (scene transition ceremony, level grouping labels), 2 Low.
- Navigation regression: all screens clean, 0 JS errors.
- Lightweight retro rule applied: steps 1-3 skipped. Sprint 5 pending items all archived above.
- Rule updates made: Sprint 5 lessons 1-4 promoted to Arch/Frontend Dev rules.
