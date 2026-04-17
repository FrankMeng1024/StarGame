# QA Knowledge — 追星少女 (StarCatcher)

---

## Sprint 20-mini Updates (2026-04-17)

### 4 Production Blocker Fixes — PASS (after BUG-00268 fix)

#### Package Size (STORY-00264)
- Total miniprogram/ directory: ~875KB (well under 4MB WeChat limit)
- bgm.mp3: 592KB (64kbps CBR mono, compressed from 2.9MB)
- miniprogram/docs/ moved to docs/miniprogram-qa-evidence/ (saves ~1.3MB)

#### Net Length (STORY-00265)
- `_netMaxLen = H * 0.75` (was 0.55)
- Net top reach on 667px screen: -13px (above top — can reach entire sky zone)
- Stars spawn at `skyY1 = H * 0.62` = ~414px on 667px → well within net range
- Rope anchor unchanged: `ropeOriX = _poleX + 12`, `ropeOriY = _poleY - 60`

#### DPR Touch Fix (STORY-00266)
- G.DPR added to globals.js G object, populated from `sysInfo.pixelRatio || 1` in game.js entry
- All 6 screens have DPR correction in ALL touch handlers (touchStart, touchMove, touchEnd)
- **BUG-00268 (Critical)**: achievement.js touchStart/touchMove were missing G.DPR — FIXED
- Pattern to check: any future screen module must multiply ALL touch.clientX/Y by G.DPR in ALL three handlers
- achievement.js uniquely uses `e.touches[0]` (not `e.changedTouches[0]`) in start/move — this is fine but note the difference

#### Girl Character v3 (STORY-00267)
- GIRL_W=44, GIRL_H=78 (was 70/110)
- Total visual height: shoes at y=+12, hat tip at y=-67 → 79px (was ~140px)
- Head: arc at y=-41, radius 10 → head occupies ~25% of total height (correct anime ratio)
- Dress gradient: linearGradient #7733bb→#9944cc→#cc55aa
- Hair: #1a0808, back tails + fringe + side tufts + top cap
- Arms: left (lowered) moveTo(-8,-22)→bezier to (-15,-7); right (raised) moveTo(8,-22)→bezier to (8,-36)
- Eyes: dark iris #2a1a3a + purple highlight #6633cc + white shine
- Hat: brim ellipse at y=-51, crown bezier tip at y=-67, gold band, star '★' at y=-62

### Bug Pattern (Sprint 20-mini)
- DPR fix inconsistency: when applying systematic touch coordinate fixes, manually verify each screen's START+MOVE+END (not just END). achievement.js only had END fixed initially.

---

## Sprint 19-mini Updates (2026-04-17)


### Visual Overhaul — 4 Stories PASS

#### Net (STORY-00257) — Full Mesh Bag
- `_drawNet()` has two states: idle (mouthR=8, stub bag) and extended (mouthR=14, full bag)
- Bag shape: top semicircle arc + two bezier sides tapering to bottom point at depth=mouthR×1.8
- Mesh lines: `rgba(255,215,100,0.55)` — 4 horizontal arcs + 2 vertical quadratic curves (extended only)
- Mouth ring: `ctx.ellipse(headX, headY, mouthR, mouthR*0.35, ...)` — slightly flattened hoop
- Arc trail: `ARC_TRAIL_LEN=10` ring buffer of {x,y} net head positions; drawn as fading white dots (alpha=frac×0.6, radius=frac×3.5) with blue shadow
- Catch flash: `_catchFlashFrames=3`, gold circle at shadowBlur=20

#### Character (STORY-00258) — Anime Quality
- `GIRL_H=110`, spans y=22 (shoes) to y=-118 (hat tip) = ~140px total
- `_poleX = W/2, _poleY = H*0.82` — anchor unchanged
- Aura: `createRadialGradient(0,-40,5, 0,-40,65)`, inner stop `rgba(120,60,200,0.12)`
- Hat star: `ctx.font = '12px sans-serif'`, fillText '★' at (4,-108) with gold shadow
- Purple ribbon bow: on hat at (-10,-92), separate from hair color

#### Operation Feedback (STORY-00259) — Fixed
- Launch trail: 3-4 particles/frame (deterministic loop), `r=1.5-2.5px`, `life=15`, white
- Catch burst: 12 particles [6×#ffd700 + 3×#ffffff + 3×star-color], r=5, life=36
- Screen shake: `_shakeFrames=6`, `_shakeX/Y=(random-0.5)×6`, explicit reset to 0 at end
- SFX: `_lineDrawSfxCtx.volume=0.4`, cached single context, destroyed in `_cleanup()`
- Audio context leak RESOLVED — single InnerAudioContext for line-draw, destroyed on cleanup

#### Global Effects (STORY-00260)
- Background: `initBgStars(W, H, 100)` + 6 bright stars = 106 total
- Victory particles: 40 total, `gravity=0.04`, rise then fall like fireworks
- Timer urgency: `18 + 4×|sin(t×π×2)|` when ≤10s remaining = 2Hz pulse 18-22px
- Line glow: settled=shadowBlur 12, newest line pulses to shadowBlur 16 + alpha 1.0

### Bug Patterns (Sprint 19-mini)
- AC numeric values (font size, volume, alpha) often drift during development tuning — always verify exact values against AC spec
- BUG-00262 backlog: text-only pill hint at center is functional; aspirational pulsing circle AC deferred



### Intro Animation (STORY-00250)
- 3-phase canvas animation: Phase 1 meteors (0-3s), Phase 2 constellation reveal (3-8s), Phase 3 title fade-in (8-12s). Tap-to-skip supported.
- QA freeze hook added to intro.js: `wx.__introFreezeAt = N` freezes animation at Ns for screenshot capture.

### Gallery Star Chart (STORY-00251)
- Gallery detail view now renders constellation star chart in circular frame above photo carousel.
- Stars use magToRadius() for sizing and typeToColor() for coloring. Lines are golden with glow.

### HUD Item Slots (STORY-00252)
- Up to 3 item slots drawn bottom-right HUD. Items activate on tap (not at level start).
- RAF timestamp vs Date.now() mismatch was a timing bug — fixed. Always use `Date.now()` for wall-clock comparisons.
- For tap-activated HUD features: future QA should capture sequential screenshots — before tap, during countdown, after expiration.

### Item ID Alignment (STORY-00253)
- IDs renamed: speed→net_speed, enlarge→net_enlarge, bomb→space_bomb, shrink→shrink_debris.
- Save migration in loadSave() handles old→new ID mapping.

---

## Sprint 13-mini Updates (2026-04-16)

### Photo Count Expansion (STORY-00242)
- All 30 constellations now have 5 photos each (expanded from 3). Total gallery images: 150.
- All URLs use Wikimedia Commons CDN thumb format at 320px width.
- Carousel logic unchanged — counter shows N/5.

### Lore Dismissal Confirmed (STORY-00239)
- game.js:1278-1280: `_loreDismissed = true` dismisses lore overlay, reveals victory action buttons.
- No code change required — feature was already implemented in Sprint 11-mini.

---

## Sprint 12-mini Updates (2026-04-16)

### Gallery Photo Carousel (STORY-00241)
- Gallery detail now uses carousel: `_carouselPos`/`_carouselForIdx`/`_carouselImgs[]` replace old single-photo state
- `constellations.js`: `photos:[]` array (3 Wikimedia CDN URLs per constellation), legacy `photo:` field eliminated. 30 constellations × 3 photos = 90 total images.
- `wx.createImage()` stale guard: `_carouselForIdx === constellationIdx` check prevents cross-constellation image bleed
- ‹/› carousel buttons: 32×44px, overlaid on photo area, opacity 0.85 (active) / 0.25 (boundary)
- Touch offset: `scrolledTY = ty + _detailScrollY - (G.SAFE_TOP + 58)` for carousel hit-test
- Carousel resets to pos 0 on constellation navigation (list→detail, prev, next)

---

## 微信小游戏版（branch: mini）

### 验证工具
**--miniprogram 模式**：BitBlt 截图（Windows screen DC）替代 Playwright。
- miniprogram-automator evaluate()/captureScreenshot() 对 小游戏 (pure Canvas) 全部 timeout — 仅 Tool.getInfo 可用
- 截图方法：PowerShell BitBlt from screen DC（PrintWindow 对 GPU composited 内容无效）
- 控制台交互：剪贴板注入 + keybd_event（keybd_event 直接输入字符会因键盘布局失败，必须用 Set-Clipboard + Ctrl+V）
- wx.* 命名空间从 DevTools console 可访问（wx.setStorageSync 等）
- wx.__navigate = navigate 挂在 wx 命名空间，可从 console 控制导航
- 开发后门：wx.getStorageSync('__initScreen') 决定启动屏幕（'menu' or 'levels'）

### 截图坐标（当前 DevTools 实例）
- DevTools 窗口 hwnd=32640308，位置 x=2255, y=116，尺寸 1250×800
- 模拟器面板：绝对坐标约 x=3115, y=186，尺寸 320×700（需随 DevTools 重启后重新获取）
- 每次 DevTools 重启后 hwnd 变化，需重新查找

### 平台特殊性
- 无 DOM — Canvas 截图是唯一视觉证据
- wx.login() 在模拟器返回 request:fail（无真实 code），预期行为，非 bug
- 每次重启后控制台显示：1 red error + 2 yellow warnings（均为 login failed + not in domain list，属预期，排除在 zero-error 检查外）
- 音频在模拟器需用户交互后才能播放（测试失败可忽略）
- ES module live binding 在微信 JS 引擎不完整：用 G 对象而非 export let

### 主用户流程（小游戏版）
1. 启动 → Canvas 主菜单（星空背景 + 标题 + 两按钮）
2. Tap [挑战关卡] → 选关页（30 卡片，5列×6行，第 1 关解锁）
3. Tap 关卡 1 → 游戏屏（网兜摆动，星星和垃圾可见）
4. Tap → 网兜发射/收回/抓取
5. 抓完全部星星 → 通关界面
6. 通关界面 → 展厅/商店/下一关

### 已验证状态（Sprint 9-mini）
- 背景音乐：AudioAdapter singleton（_bgm/_bgmSrc/_playing 模块级变量），wx.createInnerAudioContext，loop=true，volume=0.5
- BGM 连续性：所有 hide*() 函数只调用 _cleanup()，不调用 stopBGM；playBGM 幂等守卫（_bgm && _playing && _bgmSrc === src）防止重启
- 静音状态：wx.setStorageSync key 'starcatcher_muted'，在 playBGM 入口检查，每帧在 _loop 渲染图标
- 静音按钮：36×36 矩形 hit area（视觉是圆形），位置 W-SAFE_RIGHT-46, SAFE_TOP+10
- toggleMute(src) 接受 src 参数，unmute 时调用 playBGM(src) 重新播放
- levels.js 标题 '选择关卡' 已用 save/restore + 显式 ctx.font 保护（BUG-00101 Sprint 8-mini 已修）

### 已验证状态（Sprint 8-mini）
- 安全区适配：globals.js G.SAFE_TOP/BOTTOM/LEFT/RIGHT，从 wx.getSystemInfoSync().safeArea 读取
- SAFE_BOTTOM = h - safeArea.bottom（wx 的 safeArea.bottom 是绝对 y 坐标，非 inset）
- 所有屏幕 back button 统一在 G.SAFE_TOP + 14，标题在 G.SAFE_TOP + 31/32
- HUD bar 高度 = G.SAFE_TOP + 52，文字在 G.SAFE_TOP + 26
- stars skyY0 = G.SAFE_TOP + 60, debris skyY0 = G.SAFE_TOP + 70
- menu buttons startY = H - G.SAFE_BOTTOM - 180
- 滚动 _totalH 包含 G.SAFE_BOTTOM 底部预留
- 非刘海设备 G.SAFE_TOP = 0，行为与之前完全一致


- 展厅：gallery.js 3列×10行网格，30 constellations，未解锁显示🔒。detail view 有全部字段（nameZh/nameEn/icon/region/bestViewMonth/mainStars/lore）。返回→levels。
- 商店：shop.js 6种道具（speed/enlarge/bomb/time_ext/shrink/double_coins），spendCoins+addItem，金币不足显示红色 toast（error:true→红色 rgba(200,60,60)），成功绿色 toast。返回→levels。
- 场景背景：game.js `_sceneIdx = floor(_levelIdx/5)`；SCENE_PALETTES[4].aurora=true（关卡 20-24）。
- 通关屏：5 buttons: 下一关/重玩/选关(40px) + 去商店/看展厅(32px secondary)。Victory cardH=430。
- game.js `_cleanup()` 在 line 185 有正确 `}`，`_loop` 在模块顶层。
- 购买按钮命中检测：hitTest({x, y: rect.y - _scrollY, w, h}, tx, ty) — rect.y 是 content 坐标。
- 锁定展厅卡片 tap → wx.vibrateShort({type:'light'}) 触觉反馈。
- Aurora: `auroraT = now * 0.0004`（now是RAF ms），周期约15.7秒，可见动画。
- 主菜单：深蓝星空 + "追星少女" + "挑战关卡" + "星座展厅" 全部可见（smoke-01-menu.png）
- 选关屏：30 关卡 5列×6行网格，第1关(白羊座)解锁，2-30关锁定（smoke-02-levels.png）
- 后端：/health 3.8ms, /api/login invalid code → 400 wx error 40029
- StorageAdapter: setLocal/getLocal 已通过控制台验证

### 测试数据（小游戏版）
- 默认存档：`{ unlockedLevels: [0], coins: 100, levelScores: {} }`
- 已完成存档：`{ unlockedLevels: [0,1,2], levelScores: {0:{stars:3}} }`

### 已知问题（待修复）
- 选关屏幕标题栏文字"迎天下下"疑为渲染问题（BUG-00101，Medium）
- 导航往返回归测试未完成（BUG-00104）

---

## 原版 HTML5 版（branch: main）

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

## Sprint 13 Verified (2026-04-11)

- Item system: localStorage.inventory stores item qtys keyed by item ID. Active items assigned to max 2 slots; passive items auto-activate on game start with toast. HUD renders slot icons + passive icon. Item selection modal shows 主动道具 and 被动道具 sections. No-items: game starts directly (no modal).
- Difficulty indicator: `.card-diff-bar` inside each `.level-card`; `style="width:N%;background:COLOR"` inline. Width = difficulty/5 × 100%. Color: green `rgb(76,222,128)` for ≤2, amber `rgb(255,184,48)` for 3, red `rgb(255,85,85)` for ≥4. Label: `.card-diff-label` ("难度"). Renders on both unlocked and locked cards.
- Star chart modal: `#starchart-modal` overlay element with SVG cloned from `#detail-starchart-svg`. Three close methods all work: button click, backdrop click (`dispatchEvent` on modal element), Escape key. Modal display toggles between `flex` and `none`.
- Star chart hint text: `<p class="starchart-hint">点击放大查看</p>` in gallery detail.
- Carousel missing images: `.no-image` class on `.photo-carousel-img-wrap` triggers ✦ placeholder (Wikimedia CDN offline). Empty constellations render `.photo-carousel-empty` card with `.photo-carousel-title` "暂无图片" — NOT blank space.
- Character (Sprint 13): fully procedural canvas drawing, no external sprites. Anime-style with purple/navy dress, brown hair, golden staff, mountain horizon. Arm states: idle, throw, catch visible.
- Navigation regression Sprint 13: menu↔levels↔gallery↔gallery-detail↔shop↔game (15 nav steps): ALL CLEAN, 0 JS errors. localStorage persists across navigation and page reload.

## Sprint 15 Updates (2026-04-12)
- Sprint 15: Character visual identity markers: ellipse head (taller than wide), almond eyes with catchlights, twin-tail hair, gold star ornament, purple dress, golden pole. Check these in future character regression.
- Sprint 15: Net baseline values: netSpeed=0.014, mouthR=26, 6 mesh lines, enlargeFactor=1.5 (net_enlarge — both visual AND collision). star_magnet removed from all UIs.
- Sprint 15: Star states: uncaught = large (r*1.8) gold glow (#ffd700); caught = small (r*0.5) dim grey (#aaaacc, alpha=0.25). Clear binary visual distinction.
- Sprint 15: Gallery card states: completed (icon+name+EN), unlocked-incomplete (name+未通关, no icon), locked (？ only — no name/icon). Back button only at BOTTOM of gallery detail (not at top).
- Sprint 15: Pause button correctly shows ⏸ after resume — regression-worthy.
- Sprint 15: Shop card bg rgba(26,31,78,0.6) default (no hover needed). Pause exit btn bg rgba(255,255,255,0.08).
- Sprint 15: Shop inventory = 8 items: 网兜加速, 网兜扩大, 宇宙炸弹, 时间延长, 缩小垃圾, 星图揭示, 宇航员手套, 双倍金币.
- Sprint 15 regression: all navigation paths clean, 0 JS console errors throughout. Only pre-existing Google Fonts woff2 errors (offline environment).

## Sprint 14 Updates
- Sprint 14: Photo lightbox system — '#photo-lightbox' overlay, prev/next nav buttons as circular dark buttons, close button top-right (X). Title + credit text below photo. Escape key closes.
- Sprint 14: HUD button layout — pause (⏸) and mute (🔊) now side-by-side in top-right of game screen. Previous absolute positioning bug caused pause button to be unclickable via Playwright.
- Sprint 14: Gallery completion gate — three states: completed (bright, clickable), unlocked-not-completed ('未通关', not clickable), locked ('未探索', not clickable).
- Sprint 14: Fail screen buttons — only '重试' + '返回选关'. No '简介' or other buttons.
- Sprint 14: Shop access paths — accessible from main menu ('道具商店'), levels screen ('商店'), and level-complete screen.
- Sprint 14: Audio system — no duplicate let declaration crash. Zero JS errors on load.
- Sprint 14: Pause overlay — '▶ 继续游戏' resumes without exit confirmation.
- Sprint 14 regression: all navigation paths clean, 0 JS console errors throughout.

## Sprint 17 Updates (2026-04-12)

- Sprint 17: net visible at idle — golden ring on pole to the right of girl character; during throw, large net connected by a line; returns to idle after throw. No disappearance between states.
- Sprint 17: star sizing confirmed visually — small proportional pinpoints (3-9px radius range). Background decorative dots clearly smaller than catchable stars.
- Sprint 17: fail screen vertically centered with opaque dark constellation canvas. No transparency bleed-through. All content fits single viewport.
- Sprint 17: complete screen '返回选关' has dark tinted background — not ghost. Buttons: 去商店 (primary), 下一关 (secondary), 返回选关 (tertiary dark tint).
- Sprint 17: coin system — fresh player = 100 coins (confirmed s17-08), fail = 0 coins (confirmed s17-04), success = Math.floor(remaining_seconds) × 10 (72s → 720 confirmed s17-10), 3★ repeat = Math.floor(coins/2) before award (code-verified at game.js:362).
- Sprint 17: preloading working — game canvas fully rendered at 0s entry with girl, net, stars, constellation lines, debris all visible. No blank canvas frame.
- Sprint 17: `window.__navigate('complete', {idx, timeLeft, coins, caught, total, isNewRecord})` can inject complete screen state for controlled coin formula testing.
- Sprint 17 regression: ALL navigation transitions clean, 0 JS console errors throughout.

## Sprint 19 Updates (2026-04-13)

- Sprint 19: Gallery detail page renders 天文摄影 (photos) section ABOVE 星图 (star chart) section. Confirmed on Ursa Major, Orion, and Scorpius. This is the correct layout (previously reversed).
- Sprint 19: Item-select overlay now has "← 返回" button in top-left header. Back navigation returns to levels screen. Console errors after back navigation: 0.
- Sprint 19: Photo loading is reliable — ESA Hubble CDN replaces Wikimedia (was HTTP 429 rate-limited). M81+M82 (Ursa Major), M42+Bok Globules (Orion), NGC 6302+M17 (Scorpius) all load without errors.
- Sprint 19: Stars render immediately on game entry — no blank canvas delay. Sprite pre-caching on levels screen load + 50ms preload timeout confirms instant appearance.
- Sprint 19: Net visible during throw animation on game screen. Pole and net bag visible at right side during throw state.
- Sprint 19: Full navigation regression CLEAN across all screens: gallery detail → gallery list → menu → levels → item-select → game → fail screen → levels. Zero JS console errors throughout.
- Sprint 19: Item-select re-evaluated on each entry — items show correct quantities (网兜加速 ×14, 宇宙炸弹 ×8, 时间延长 ×4 in test session). All items with qty > 0 displayed.
- Sprint 19: Audio system active with zero audio-related console errors. Actual waveform content unverifiable via screenshots.
- Sprint 19: Fail screen confirmed: "时间到了！" heading, X/7 已抓, 0秒剩余, 0金币, constellation silhouette, "🔄 重试" and "返回选关" buttons.

## Sprint 3-mini Updates (2026-04-15) — 微信小游戏版 branch: mini

- **JS上下文问题**: DevTools console默认在`top` JS context中，wx.__navigate只在游戏执行context中有效。切换context需要点击控制台工具栏中的`top`下拉框，选择游戏的JS context。不切换则所有wx.*调用均报"TypeError: wx.__navigate is not defined"。
- **wx.removeStorageSync('__hintSeen')必须在测试hint前执行**：__hintSeen一旦设置就持久化，重新进游戏不会再显示hint。
- **通关屏幕验证**：自动化无法完成关卡（抓7颗星），通关屏幕只能通过源码验证。
- **Sprint 3-mini 已实现**：
  - 通关屏幕（_triggerResult(true) → victory card）：'恭喜通关！'标题、星评、金币、星座介绍节选、下一关/重玩/选关三按钮
  - 关卡30特殊处理：下一关替换为'全部通关！'标签，_btnNext=null
  - 新手提示：'点击屏幕发射网兜！' 首次入场3秒显示，wx存储持久化
  - 帧率无关物理：scale=dt*60，_swingT和_netLen均用scale乘法
  - 关卡图标修复：解锁显示数字，锁定显示🔒
  - 垃圾危险视觉：rgba(255,40,40,0.28)红色光晕

## Sprint 2-mini Updates (2026-04-15) — 微信小游戏版 branch: mini

- **截图工具最终确认**: mss Python库 (DXGI desktop duplication) 是唯一可靠截图方案。PrintWindow/BitBlt对GPU合成窗口无效。
- **物理坐标（当前DevTools实例）**: 物理游戏画布 `{"top": 145, "left": 1350, "width": 395, "height": 935}`。DPI scaling = 150%，逻辑坐标 = 物理 / 1.5。
- **当前hwnd**: 7015796（每次DevTools重启后变化，需用 `FindWindowEx` 重新查找）
- **关键点击坐标**: 关卡1 → 逻辑(925,173)；失败屏幕"选关"按钮 → 逻辑(1088,475)
- **miniprogram-automator WS (端口9423)**: `Tool.getInfo` 可用；所有 `App.*` 命令超时 — Canvas小游戏没有Page层RPC结构
- **关卡标签**: CONSTELLATIONS[0] = 猎户座（Orion），7星，difficulty=1。关卡名截图中的小字容易误读，需交叉核对源码
- **Sprint 2-mini 已验证流程**: 关卡选择(30关卡，第1关解锁) → 点击关卡1 → 游戏(HUD已抓0/7 + 倒计时) → 定时器归零 → 失败屏幕(时间到/已抓N/7/重试+选关) → 点击选关 → 返回关卡选择 ✓
- **未能验证**: 通关屏幕(需精确时机抓7颗星，自动化无法实现)；点击锁定关卡的反馈；网兜视觉动画；星星碰撞视觉反馈
- **回归测试**: 失败屏幕→选关→关卡选择导航确认可用。完整往返回归未测试。

## Sprint 20 Updates (2026-04-13)
- Net-hand alignment: poleLen=H*0.06 keeps net close to hand. If character proportions change, net attachment offsets need recalibration.
- Swing angle: ±80° (PI*80/180). Further increases may cause net to swing off-screen on narrow viewports.
- Photo preload: 29 ESA Hubble CDN resources loaded on levels screen. If photo count grows, may need pagination strategy.
- Gallery detail DOM order: hero→starchart→photo-carousel→meta→lore→back. Portrait canvas fully removed.
- Sprite prewarm: all 6 sprites prewarmed. Any new sprite types must be added to the prewarm list in levels.js.
- Navigation regression: all major screens (menu/levels/game/gallery/shop/complete) produce 0 console errors.

## Sprint 6-mini Updates (2026-04-15) — 微信小游戏版 branch: mini

- **四段状态机**: game.js _phase 扩展为 'play' | 'celebrate' | 'linedraw' | 'result'。_triggerResult 新增 `if (_phase !== 'play') return` 重入保护。Celebrate 阶段仅在胜利时进入，失败直接跳 result。
- **Magnet (star_magnet)**: _updateMagnet(dt) 以 scale=dt×60 归一化。PULL_SPEED=1.2, MAGNET_RANGE=80px。过冲保护：`fraction = Math.min(move/dist, 1)`，星星不会超过 netHead 位置。
- **Glove (宇航员手套)**: _checkCollisions() 中 `if (!_gloveActive)` 仅屏蔽时间惩罚（-1.0s）和 _timerFlash。网兜仍然收回（_netState='retract'）。
- **Lore 文本溢出防护**: Canvas clip rect `ctx.rect(cardX+8, cy-8, cardW-16, 96)` + `ctx.clip()` 限制文字渲染高度，防止溢出到按钮区。MAX_LORE=200 字符+省略号。
- **Tap跳过**: celebrate/linedraw 阶段 _onTouch 直接将 _phase 设为 'result'，无需动画清理。

## Sprint 5-mini Updates (2026-04-15) — 微信小游戏版 branch: mini

- **道具系统已生效**: 6种道具 (speed/enlarge/bomb/time_ext/shrink/double_coins) 全部在game.js中生效。module-level multipliers reset in both _cleanup() and showGame(), preventing stale state.
- **道具选择叠加层**: levels.js中叠加层在有库存时显示。scroll blocked during overlay。Confirm sets state.selectedItems=[...toggled]; Skip sets []; outside-tap dismisses silently (no navigate).
- **bomb**: 爆炸粒子（每个垃圾位置8个橙/黄色粒子）+ debris清除。💣 炸按钮在HUD(W/2-30, 58, 60×28)，_bombActive时显示。
- **double_coins**: 结算卡片 "🪙×2" 注释在 _coinsMult>1 时显示。
- **道具消耗**: state.useItem(id) 在 _triggerResult() 中调用（胜负均消耗），之后 state.selectedItems = [] 立即清空，防止重试时免费重用。
- **gallery prev/next**: hasPrev/hasNext 通过线性搜索已解锁星座实现。按钮仅在有解锁目标时渲染，boundary时隐藏。
- **navigate防抖**: game.js (app entry) 中300ms防抖，防止双击重复导航。
- **帧率无关性 (STORY-00222)**: _timerFlash用dt(秒), particles用scale=dt*60, debris spin用_dt*60 — 全部frame-rate independent。


### 已验证状态（Sprint 10-mini）
- 星星颜色：暖白金色调 warmPalette=['#fff8e0','#ffd700','#fffbe8','#ffec6e']，typeToColor 完全移除
- 星星尺寸：cap 从 14 降至 10，r = Math.max(3, Math.min(10, magToRadius(s.mag)*1.4))
- 已抓星星：r*0.4，globalAlpha=0.20，fillStyle='#aaaacc'（灰蓝淡化）
- 网兜常显：idle stub=22px，rope rgba(200,150,100,0.50)，head rgba(255,220,100,0.40) r=6*mult
  延伸状态：rope '#cc9966'，head rgba(255,220,100,0.85) r=8*mult
- 暂停系统：_paused gates all _update* calls；_cleanup() 重置 _paused=false，防 stuck
  覆盖层：rgba(5,8,30,0.70)暗幕 + 240×220 card + 继续▶/重试🔄/选关 三个按钮
- 失败屏：卡片高 340px，silhouette 110×80 bounding box，rgba(180,180,220,0.28) 线条
  个性化文本：_conDef.nameZh + '还在等你！'
- 胜利 lore 翻页：_splitLorePages(text, 80) 在。/，/！/？/空格处断行
  "完成 ✓" 按钮当前为 no-op（已记录为 Medium backlog STORY-00239）


### 已验证状态（Sprint 11-mini）
- **lore 完成按钮 (STORY-00239)**: `_loreDismissed` flag 防止懒加载重建。tap 最后页"完成 ✓" → `_loreDismissed=true` + `_lorePages=[]`。
  下一帧 `if (_conDef.lore && !_loreDismissed)` 跳过整个 lore 块。
  重试/选关/下一关 按钮始终在 `bY = cardY + cardH - 112`，不被 lore 门控。
  `_loreDismissed` 在 `_triggerResult()` 和两个 cleanup 函数中重置为 false。
- **展厅照片 (STORY-00240)**: 30 个星座均有 `photo` 字段（Wikimedia Commons HTTPS URL）。
  gallery.js `_loadPhoto(idx)` 用 `wx.createImage()` 异步加载，guards: `if (_photoForIdx === idx)` 防 stale callback。
  3 状态：加载中（"加载中..."）/ 成功（ctx.drawImage）/ 失败（"暂无图片"，no crash）。
  photo state（4 vars）在 `_cleanup()` + 3个导航时间点全部重置。
  `_drawDetail()` oy 流：info pills → +10 → photo(160+10) → divider → lore lines → +24 → `_detailTotalH`。
  Wikimedia 429 从 CI/自动化 IP 出现，但非 code bug；WeChat DevTools 用自己的网络栈，可能成功加载。
