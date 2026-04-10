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
