# TECH_SPEC.md — 星捕少女 (StarCatcher)

## §type
Pure frontend HTML5 Canvas game — single-player, browser-based, no backend required.

## §acceptance
acceptance_mode: auto

## §stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Vanilla JS (ES2022 modules) | Game loop, Canvas 2D API — no framework overhead needed; full control over render pipeline |
| Rendering | HTML5 Canvas 2D | Standard for 2D games; excellent performance for pendulum physics + particle effects |
| CSS | Vanilla CSS with variables | UI screens (menu, shop, gallery) only — Canvas handles gameplay |
| Build | None (no bundler) | Static files, served directly; simplest deployment |
| Storage | localStorage | Save game progress, unlocked constellations, coin balance |
| Assets | Local (downloaded images) | Constellation photos bundled with game |
| Server (dev) | Python http.server or Node http-server | Serve static files locally during development |

**No framework. No build step. No backend. Pure HTML/JS/CSS + Canvas.**

Rationale: This is a self-contained game. Adding React/Vue/bundler adds complexity with zero gameplay benefit. Canvas 2D gives full control for the pendulum physics, star rendering, and particle effects.

## §viewports
- **Primary**: Desktop 1280×720 (landscape, mouse input)
- **Secondary**: Desktop 1440×900, 1920×1080
- Mobile deferred to future iteration (noted in DISCOVERY.md)

## §git
- Strategy: A (auto-commit after each Story Done + each verified bug fix)
- Branch: direct to main (new project)

## §deploy
- Local dev: `start.ps1` starts a local static file server
- No remote deployment in this iteration

## §start-script
- File: `start.ps1`
- Format: PowerShell
- Action: Starts Python http.server (or node http-server if Python unavailable) on port 8080, opens browser to index.html, runs health check (HTTP 200 on /)

## §test-runner
- File: `scripts/test_runner.js` (Node.js, runs with `node scripts/test_runner.js`)

## §test-config
- File: `scripts/test_config.json`

## §spike-decision
Sprint 1 SKIPPED — no system-level dependencies. This is pure HTML/JS/CSS. No external APIs, no database, no auth. All dependencies are browser-native (Canvas 2D, localStorage, CSS animations).
Arch declaration: Sprint 1 Spike Sprint is not needed. Proceed directly to Feature Sprints.

## §performance-targets
| Metric | Target |
|---|---|
| Initial page load | < 2s (all assets local) |
| Game frame rate | 60fps (requestAnimationFrame) |
| Canvas render per frame | < 16ms |
| localStorage read/write | < 5ms |
| UI screen transitions | < 300ms |

## §ux-thresholds
- Navigation: max 2 clicks from main menu to any feature

## §dark-mode
Not applicable — game has fixed visual theme (night sky). No light/dark toggle.
