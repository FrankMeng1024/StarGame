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
