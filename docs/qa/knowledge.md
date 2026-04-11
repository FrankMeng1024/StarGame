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

## Sprint 7 Verified (2026-04-11)

- Gallery portrait canvas: `#constellation-portrait` (300×300). Background pixel at (150,10) = `[5,8,23]` for scene0 (#050816). M-type star pixel ≈ `[255,204,111]`, B-type ≈ `[170,191,255]`. Constellation lines gold `rgba(255,215,0,0.55)`. Re-renders correctly after navigation.
- Scene intro overlay: `_introPlaying` flag in engine.js gates `_handleInput`. Game loop (`_loop`) deferred until `onDone` callback — `lastTick` reset in `onDone` prevents timer drain. Timer verified frozen at 01:30 during intro. Second entry immediately starts game.
- `state.seenScenes`: Set persisted to localStorage as array, deserialized as `new Set(data.seenScenes || [])`. Survives full page reload.
- Level select dividers: 6 x `.scene-divider` elements with `grid-column: 1 / -1`. Aurora badge: `.scene-aurora-tag` on scene 4 only. Dividers created in `initLevels()` (not `refreshLevels()`) — persist across nav calls.
- Star-map line colors: scene0 warmest pixel r>b (gold); scene4 coolest pixel b>r (ice-blue). Branching at `engine.js _drawStarMap`: `scene.aurora ? rgba(200,235,255,0.45) : rgba(255,215,0,0.25)`.
- Canvas readback warnings: 2 non-functional perf warnings from `getImageData` calls in test — expected, not errors.
- Navigation regression Sprint 7: gallery-detail, levels, game, shop, gallery, complete, fail all PASS. 0 console errors throughout.

## Sprint 8 Verified (2026-04-11)

- Menu mute button: `#menu-mute-btn` (.btn-menu-mute), position: absolute top-right of `.menu-inner`. Reads `isMuted()` on init, toggles on click. localStorage key `starcatcher_muted` = "1" for muted. Icon: 🔊 (unmuted) / 🔇 (muted). Custom star cursor (★ floating element) may visually overlap in screenshots — confirm via accessibility snapshot not screenshot pixel inspection.
- Menu→game mute state persistence: menu mute button sets localStorage before navigate; `_initMuteButton()` in game.js reads same `isMuted()` fresh on game start — no additional wiring needed.
- Gallery detail metadata: `.detail-meta` card between portrait/name block and lore text. Three rows: `#detail-region`, `#detail-best-view`, `#detail-main-stars`. All populated via `con.region || '—'` defensive pattern. All 30 constellations have non-empty values for all 3 fields.
- Metadata field check: use DOM batch query `constellations.filter(c => !c.region || !c.bestViewMonth || !c.mainStars).length` to verify completeness — confirmed 0 missing.
- Navigation regression Sprint 8: menu→gallery→gallery-detail→gallery→menu, mute round-trip: ALL CLEAN, 0 JS errors.

## Sprint 9 Verified (2026-04-11)

- SVG star chart: `#detail-starchart-svg svg` — 480×480, circular clip-path, per-constellation radialGradients (spectral colors: K=orange/gold, A/B=blue-white, M=red), dashed constellation lines, Chinese or Latin star name text labels, "CONSTELLATION NAME" footer. No external URLs. Orion: 137 circles, 15 lines, 9 gradients, 8 text labels. Scorpius: 147 circles, 19 lines (more stars/lines).
- Lore text: `.detail-lore-text` — all 30 constellations ≥500 chars in DOM (min=501, max=530). Content covers myth keywords (神话/传说) AND astronomy keywords (光年/亮度/天文). Batch verification pattern: loop idx 0-29 with 300ms delay each.
- Batch test pattern: `for(i=0;i<30;i++){ window.__navigate('gallery-detail',{idx:i}); await delay(300); check DOM; }`
- Navigation regression Sprint 9: menu→gallery→detail (×3 constellations)→gallery→detail again→menu→detail: ALL CLEAN, 0 JS errors throughout full sequence.

## Sprint 11 Verified (2026-04-11)

- Complete screen: `.complete-inner` max-height 100vh, overflow-y auto. Canvas `#constellation-portrait` fixed 160×160 (JS overrides HTML attrs `width=160 height=160` now matching).
- HUD timer ring: `#timer-ring-fill` SVG circle driven by `timeLeft/startTime` ratio in `_updateHUD()`. CIRCUM=150.8. `strokeDashoffset = CIRCUM - ratio*CIRCUM`. Color: blue (>30%), orange (#f59e0b, 15-30%), red (#ef4444, <15%). Text in `#hud-timer-text` inside `.hud-timer-ring`. `_showTimeExtFlash()` targets `.hud-timer-ring || .hud-timer`.
- Photo carousel: `#detail-photo-carousel` inserted dynamically after `.detail-starchart`. Hidden (`display:none`) if `CONSTELLATION_PHOTOS[con.nameEn]` has no entries. 20 constellations have photos. Scroll-snap horizontal track, 280px fixed-width cards.
- Glass cards: `backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px)` on `.level-card`, `.gallery-card`, `.shop-card`. `background: rgba(26,31,78,0.6)`.
- Badge glow: `.type-active` → `badge-glow-active` keyframe (amber box-shadow pulse). `.type-passive` → `badge-glow-passive` keyframe (purple box-shadow pulse). Selector `.shop-card .item-type.type-active`.
- Cursor trail: `.cursor-trail-particle` fixed-position divs. `_trailEnabled` module-level flag in `main.js`. Set `false` on navigate('game'), re-enabled in `_activateScreen()` for all other routes. Trail chars: `['✦','·','✧','★','⋆']`.
- Navigation transition: `.screen-exit` class triggers `screenFadeOut` 250ms, then `.screen-enter` + `.screen-enter-active` triggers `screenFadeIn` 300ms. `_navPending = true` during exit prevents double-nav.
- Debris: procedural canvas drawing (grey rock shapes, multi-polygon). Verify by pixel color check: debris pixels ≈ grey `[120-160, 120-160, 120-160]`, stars ≈ blue-white `[180-255, 200-255, 255]`.
- Navigation regression Sprint 11: ALL screens CLEAN throughout complete test sequence. 0 JS console errors.

## Sprint 12 Verified (2026-04-11)

- Constellation guide lines: faint golden lines always visible during gameplay connecting stars in the level pattern. Stars render on top of lines. Lines low-opacity, non-distracting.
- Debris visual: darker spinning shapes distinct from star targets. Stars = bright blue-white glowing circles. Debris = grey/dark irregular spinning shapes.
- Net teardrop shape: golden circular bag at tip of net pole during in-flight. Visible in ux-07-net-inflight.png.
- Pause system: `pause-btn` / `#pause-btn` in HUD. Click or `evaluate()` to trigger. Overlay `#pause-overlay` shows "游戏暂停" heading. Three buttons: `#pause-resume-btn` (▶继续), button for 重新开始, button for 返回关卡. Escape key also resumes. 返回关卡 shows nested confirmation "确认退出?" with ✓/✗ buttons.
- Timer freeze during pause: verified by DOM read of timer text before/after 3s wait — values match.
- Fail screen fix: `showFail()` shows '0秒' for stat-time (not elapsed). Label reads "0秒 剩余". Bug was: elapsed time shown next to static "剩余" label.
- Complete screen: shop CTA button `.btn-shop` text "去商店 →", prominent placement above secondary actions. Set by `showComplete()` which also sets onclick to navigate('shop').
- Scene dividers: 6 divider elements in level select, 1px height, empty text content (no location names). Clean horizontal lines only.
- Item HUD: `.hud-item-slots` container shows per-slot elements with slot number + item icon. Tested with ⚡ (speed) in slot 1, ⏱️ (time ext) in slot 2, 🪙 (coin magnet passive).
- Navigation regression Sprint 12: game→levels→menu→gallery→gallery-detail→gallery→menu: ALL CLEAN, 0 JS errors.
- Regression checklist addition: after any fail-screen change, verify stat-time shows '0秒 剩余' not elapsed seconds.
