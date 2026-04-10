# QA Knowledge — 星捕少女 (StarCatcher)

## Product Understanding
Single-player browser game. HTML5 Canvas for gameplay, HTML/CSS for UI screens.
No backend, no network requests. All data in localStorage + local files.

## Primary User Flow (end-to-end)
1. Open http://localhost:8080 → Main menu loads with starfield background
2. Click "挑战关卡" → Level select screen shows 30 level cards, Level 1 unlocked
3. Click Level 1 (猎户座) → Game screen loads, net swinging, stars + debris visible
4. Click → net fires, catches first object, returns
5. Catch all 7 Orion stars → Level complete screen shows
6. See constellation line animation → See introduction text → Earn coins
7. Click "去商店" → Shop shows items with correct prices
8. Purchase item → Coin balance decreases → Item added to inventory
9. Return to menu → Click "星座展厅" → Gallery shows Orion unlocked
10. Click Orion → Image carousel + story text displays

## Known Test Patterns
- Canvas games: screenshot at frame 0 is often blank — wait 500ms after navigate before screenshot
- localStorage: clear before each test run to ensure fresh state
- Net mechanic: requires click interaction on Canvas — use browser_click on canvas center

## Regression Checklist
- [ ] Main menu renders without console errors
- [ ] All 30 level cards present in level select
- [ ] Level 1 is unlocked, levels 2-30 are locked on fresh state
- [ ] Canvas initializes and net starts swinging within 1s of game load
- [ ] Click fires net in current swing direction
- [ ] Star catch increments counter
- [ ] Debris catch does NOT increment star counter
- [ ] Timer counts down
- [ ] Level complete fires when all stars caught
- [ ] Coins calculated correctly (remaining_seconds × 10)
- [ ] Gallery shows locked state for levels 2-30 on fresh state
- [ ] localStorage persists after page refresh

## Bug Patterns
### Sprint 1 (2026-04-10)
- No bugs found in Sprint 1.
- Caveats: cursor rendering, net swing angle precision, 60fps not directly measured via screenshots.

## Sprint 1 Verified
- Navigation regression: Menu→Levels→Game→Complete→Levels — 0 console errors ✓
- localStorage: {unlockedLevels: number[], levelScores: {[idx]: {stars, time}}, coins, inventory} ✓
- Coin formula: Math.floor(remainingSeconds) × 10 confirmed (47×10=470) ✓
- All 30 constellation names match DISCOVERY.md ✓
- Catch mechanic: star count increments on catch, particles emit ✓
- Fail screen: triggers on timer=0 ✓
- Complete screen: triggers on all stars caught ✓

## Test Data
- Fresh state: clear localStorage before test
- Level 1: 7 stars (Orion), time limit 90s, difficulty 1
- Seeded state: `localStorage.setItem('starcatcher_save', JSON.stringify({ unlockedLevels:[0], levelScores:{}, coins:150, inventory:{} }))` — must be set before page load (not after)

## Sprint 2 Verified (2026-04-10)
- Shop: 8 items render as `.shop-card`; buy button is `.shop-buy-btn`; disabled when coins < price
- Shop purchase: deducts coins, adds owned badge (`.shop-owned-badge`), re-renders in place
- Gallery: 30 cards; `.gallery-card.unlocked` / `.gallery-card.locked`; detail shows icon/ZH/EN/lore
- Gallery detail back: `.btn-back-gallery` → returns to screen-gallery
- Complete screen stats: caught/total, timeLeft in seconds, coins — all accurate
- Fail screen stats: "时间到了" title, caught/total, elapsed seconds — accurate (was broken Sprint 1, fixed Sprint 2)
- Tutorial hint: visible for 5s on first game load; gated by sessionStorage 'hintSeen'; deferred click listener

## Critical Technical Notes (Sprint 2)
- ES module version suffixes on internal imports (`state.js?v=N`) create duplicate singleton instances — only version the `<script>` entry point tag; all internal imports use bare paths
- `browser_evaluate` immediately after `browser_click` can synthesize an extra event triggering capture-phase listeners — use `browser_run_code` for atomic test sequences
- State storage key: `starcatcher_save`; structure: `{ unlockedLevels:[], levelScores:{}, coins:N, inventory:{} }`
- `window.__navigate(screen, params)` is exposed for test navigation

## Sprint 3 Verified (2026-04-10)
- TIME_BY_DIFFICULTY: {1:90, 2:80, 3:70, 4:60, 5:50} — difficulty 1→90s, difficulty 2→80s confirmed
- Star rating stored as `{ stars: N, time: T }` under `levelScores[idx]` in localStorage
- Level cards show `.card-score-stars` span with earned stars (absent if not played)
- Shop: type legend is `.shop-type-legend` (grid-column: 1/-1); owned count is `.shop-owned-count` (always visible, `.has-items` class when qty > 0)
- Penalty text: `.penalty-text` positioned at catch coords (`left: Xpx`, `top: Y-20px`), appended to `#screen-game`, auto-removed after 1200ms
- HUD timer warning: `.hud-timer.warning` class toggled by `classList.toggle('warning', s <= 10)` in `_updateHUD`
- Shop access path (normal flow): level-complete screen → "🛒 去商店" button only; not accessible from menu/levels directly
- Navigation regression Sprint 3: all 5 flows pass, 0 JS runtime errors (44 errors = all Google Fonts + favicon, expected offline)

## Sprint 4 Verified (2026-04-10)
- `window.__state` now exposed for test injection (main.js v=10+): `window.__state.addItem(id, qty)`, `getItemQty(id)`, `useItem(id)`
- ES module cache: version query param on `<script src="js/main.js?vN">` must be incremented to bust module cache; browser ignores page query params for cached modules
- activeItems Set pattern: constructor iterates PASSIVE_ITEMS, consumes each via state.useItem, builds Set. All 6 passive items qty=0 after level start when owned. Active items NOT consumed at constructor — only on HUD button click.
- HUD active-item buttons: `[data-item-id="space_bomb"]` and `[data-item-id="time_ext"]`; only rendered if qty > 0 at level start; hidden via `btn.style.display = 'none'` when qty reaches 0 after use.
- `.active-items-toast`: created by `_showActiveItemsToast()` on `#screen-game`; visible ~3s then fades; not created when activeItems Set is empty.
- time_ext: `engine.timeLeft += 20` (capped at startTime+20); DOM timer updates on next RAF frame — allow ≥300ms delay before reading HUD timer after click.
- space_bomb: `engine.debris = engine.debris.filter(d => !d.caught)` — confirmed array reassignment pattern; debris stay cleared.
- coinMultiplier: engine.coinMultiplier = 2 when double_coins active; applied in _handleComplete as `Math.floor(timeLeft) * 10 * coinMultiplier`.
- Canvas effects (star_magnet pull, shrink_debris size, net_speed movement) cannot be verified via DOM — code path activation confirmed by qty consumption + activeItems Set membership.
- Navigation regression Sprint 4: ALL routes clean, 0 JS console errors. Google Fonts errors no longer appearing (was 44 in Sprint 3 — may have cleared from Playwright session reset).

## Sprint 6 Verified (2026-04-10)
- Scene system: `js/data/scenes.js` exports `SCENE_PALETTES[6]`, indexed by `Math.floor(levelIdx / 5)`. Only Scene 4 has `aurora: true`.
- Scene palette applies to three screens: game canvas gradient, level select inline style gradient, complete/fail tint (hex-8 alpha: `sky0ee`, `sky1cc`, `sky2aa`).
- `window.__state.unlockedLevels` is a Set; inject for scene testing: `window.__state.unlockedLevels = new Set(); for(let i=0;i<=N;i++) window.__state.unlockedLevels.add(i);`
- Aurora bands (Scene 4): visible horizontal teal-green gradient bands on canvas, driven by `Date.now() * 0.0004` — single screenshot confirms presence.
- Google Fonts ERR_CONNECTION_REFUSED is a known pre-existing offline environment error — exclude from future JS error counts (it is a network resource error, not a runtime JS error).
- Navigation regression clean through Sprint 6: menu, levels, game, complete, fail, shop, gallery all survive TO→AWAY→BACK with zero JS errors.

