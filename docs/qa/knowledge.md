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
