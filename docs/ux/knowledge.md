# UX Knowledge — 星捕少女 (StarCatcher)

## Sprint 77-mini Updates (2026-04-24)

- Result screen touch fix: dedup 50ms→16ms in globals.js _wrapDedup. Tap to skip animation sets timestamp; immediate button tap was swallowed by 50ms window. Fixed.
- Result fail card: retry=blue gradient, levels=purple gradient at 44px height. Victory card: constellation nameZh+icon subtitle below "星座揭秘！". starsY +16px offset when subtitle shown.
- Shop buy button: "金币不足 (需 🪙 N)" when canBuy=false. Successful buy → feedback 1.4s + sheet auto-dismiss at 0.8s (orphan toast risk after dismiss: Low).
- +5s combo popup: green #44ff88 text at W*0.08, H*0.08 (top-left — NOT near timer which is at W/2, center). 14px float-upward over 1.5s (subtle). UX note: spatial disconnect from timer is a Medium friction item for future Sprint.
- body_no_arms.png now exists at assets/sprites/. Skeletal mode functional: armless torso + Canvas arms. Previously falling back to full sprite sheet with arm overlap.

## Sprint 76-mini Updates (2026-04-24)

- Dynamic difficulty: obstacle speed 0.5x–1.5x based on 5-shot accuracy (eval every 30s). Invisible to player. Subtle "punishing success" risk noted for playtesting.
- Combo system: 3s window. x2 = text only. x3+ = text + 5s time (invisible bonus — player cannot see it) + 12 rainbow particle spawns. Popup at H*0.25.
- Net charge: 3 consecutive catches → white-blue glow + 1.2x speed. Charge activation has no distinct signal (SFX reuses catch sound, glow is subtle on moving object).
- Milestones: 50%: white flash (alpha 0.25, 0.15s) + popup + conLines 0.22→0.45 alpha. 75%: screen shake (4 frames, same _updateShake as debris collision — signal ambiguity risk) + popup. Popups at H*0.35.
- UX friction: combo time bonus invisible; 75% milestone shake conflicts with debris punishment shake signal; simultaneous combo+milestone can produce 5 concurrent effects.
- Draw overlay order: game world (shaked) → HUD (fixed) → milestone flash → combo popup → milestone popup → hint → pause.



- Left arm counter-sway (STORY-00396): During swing state, girl's left arm sways opposite to net direction at 30% amplitude. Biomechanically correct — adds "life" to character without noticeable distraction. Smooth blend via _skelBlendT.
- HUD star count bounce (STORY-00397): _hudStarFlashT=200 on catch triggers sin-curve scale animation peaking at 1.4x. Located top-right corner; peripheral visibility during gameplay is limited but appropriate as secondary feedback.
- Star fade-out (STORY-00397): Caught stars fade as grey dot (#aaaacc) at r*0.4, alpha=fadeAlpha*0.5 over ~250ms. Effectively invisible vs particle burst but prevents harsh vanish.
- Aim guide (STORY-00398): rgba(255,215,0,0.12) dotted line from wrist along net angle, swing-state only, below stars in z-order. Borderline imperceptible at 0.12 alpha on mobile but learnable without it in 2-3 throws.
- Draw order confirmed: conLines → aimGuide → stars → obstacles → debris → particles → grass → girl → net

## Sprint 57-mini Updates (2026-04-22)

- Shop screen ('道具商店') uses deep-space dark background with purple/teal nebula glow effects, consistent with the overall game theme. Card layout is single-column with circular icon zones featuring glow rings, purple gradient '购买' buttons, and gold coin pricing. Visual style aligns well with the game screen's space aesthetic.
- Item cards display: icon (left), name + pill badges ('主动'/'15秒') + description text (center), price + buy button (right). Owned quantity shown as a small numbered badge in the card's top-right corner.
- Game screen during active play shows: level label (top-left), circular countdown timer (top-center), star counter (top-right), girl character (bottom-center), constellation stars connected by lines, space debris obstacles, and dark starfield background.
- Visual language (dark bg, purple accent, glow effects, gold coins) is thematically consistent across shop and game screens. No jarring style breaks between screens.

## Sprint 41-mini Updates (2026-04-21)

### Intro Animation — Fine-tuning (STORY-00333/334/335)
- Background starfield: 168 stars (was 125). Denser, more immersive — reads as "nice" not yet "breathtaking" (Low friction).
- Constellation: Cygnus (天鹅座) replaces Orion. Cross/X-wing shape creates sense of flight and scale — more visually dynamic.
- Title: 48px, single-space, purple/lavender gradient with visible glow halo. Reads as flowing and unified.
- Overall cinematic quality: HIGH. First-time user would not skip on first viewing.

## Sprint 40-mini Updates (2026-04-21)

### Intro Animation — Full Redesign (STORY-00329)
- 3-phase structure: meteor shower (0-5s), constellation reveal (3-9s), title fade-in (9-13s). Auto-finish at 14s.
- Orion (猎户座) used as fixed constellation — most recognizable shape. NO constellation name text shown.
- Background: 125 stars in 3 tiers — tiny (70, r=0.5-0.7px), medium (40, r=1.0-1.4px), large (15, r=1.8-2.4px). Independent twinkling phases.
- 9 meteors with varied angles (PI*0.27 to PI*0.36) and speeds (350-600px/s). First 4 at time 0, remaining 5 staggered 0.5-8s.
- Constellation stars appear one by one (0.45s interval from t=3s). Lines grow A→B over 0.5s.
- Title "追 星 少 女" fades in at t=9s, positioned at H*0.72 (lower area). Purple gradient.
- Visual quality: PREMIUM — golden constellation glow, depth-layered starfield, gradient meteor trails.
- Constellation at H*0.33 (upper area), title at H*0.72 (lower area) — clean vertical separation, no overlap.
- Tap-to-skip at any point; "✦ 轻触跳过" hint visible at lower-right throughout.

## Sprint 38-mini Updates (2026-04-21)

### Sprint 38-mini Visual Upgrades — Significant Quality Lift
- Circular timer ring replaces plain text — communicates urgency visually without reading number
- Emoji level cards (icon + difficulty bar + best time) create high information density without clutter
- Fail screen dark-glass style matches app aesthetic — professional, non-punishing
- Intro meteor animation creates strong "polished game" first impression

### Ongoing Medium Friction (backlog candidates)
- Menu title right-aligned instead of centered — asymmetric layout vs constellation art on left
- Info panel at menu bottom truncated — text cut off, unclear if content is scrollable
- Locked level cards give no unlock hint ("complete level N to unlock")

### Confirmed: "大能座" in fail screen is rendering artifact
- Code correctly uses `_conDef.nameZh` (e.g. "大熊座"). Canvas small-font rendering makes "熊" look like "能" at screenshot resolution. Not a bug.

### Untested UX flows (future coverage needed)
- Victory screen, 星座图鉴 (Encyclopedia), 道具商店 (Shop)
- Difficulty 4-5 level card colors (orange/red) — no unlocked levels at those difficulties
- Transition animations between screens

## Sprint 33-mini Updates (2026-04-20)

### Shop Grid — 2-Column Layout Now Standard
- Shop uses 2-column grid (3 rows visible per screen, 6 items per view). Items 7-8 require scroll — no visible scroll indicator.
- Each card: large centered icon, item name, 主动/被动 badge (purple pill), duration badge, coin price left, green "购买" button spanning card width.
- Coin balance shown in top-right header (small — could be missed by new users).
- Cross-platform parity HIGH with web shop intent.

### Fail Screen — Full Web Parity Achieved
- Modal card: alarm icon "时间到了！" → "还差N颗星" → "X/Y已抓 · Z秒剩余 · W金币" → constellation silhouette → personalized encouragement ("猎户座跑得太快了，再来一次！✨") → 重试 + 选关 buttons.
- Information hierarchy matches web version exactly.
- First-time users: clear fail reason, stats, and emotional motivation to retry.

### Game HUD — Core Elements Match Web
- Level name top-left (猎户座 · 第1关), timer center (plain text), star counter top-right (★ 0/7).
- Web version has gear+speaker icons top-right; mini version uses WeChat capsule instead — platform convention.
- Play area fully unobstructed. Star targets bright and visible against dark sky background.

---

## Sprint 29-mini Updates (2026-04-19)

### Label Consistency — Gallery Header and Menu Button Now Unified
- Gallery header and menu button are both "星座图鉴" — label consistency principle confirmed for this screen pair.
- Before: tapping "星座图鉴" menu button led to a screen titled "星座展厅" — orientation mismatch resolved.
- Any future rename of gallery/menu labels must update both menu.js and gallery.js simultaneously.

### Cross-Platform Text Parity — Victory/Fail Headlines
- Victory "关卡完成！" and fail "⏰ 时间到了！" now match web complete.js.
- Web and mini versions now read identically on both result screens.
- Time emoji (⏰) on fail headline provides immediate visual recognition of time-based failure — clear affordance.

---

## Sprint 28-mini Updates (2026-04-19) — UPDATED with Playwright evidence

### Menu — Final Confirmed State (HIGH confidence)
- Exactly 3 buttons: ★ 挑战关卡, ◉ 星座展厅 (web) / 星座图鉴 (mini), ◆ 道具商店. Achievement button permanently removed.
- Info panel at bottom: frosted glass strip, constellation name + viewing season + notable star. Confirmed from Playwright screenshots of web version at localhost:8090.
- No overlap with buttons. Readable contrast on dark background.

### Shop — All 8 Items Confirmed (HIGH confidence)
- Prices: 网兜加速 50, 网兜扩大 60, 宇宙炸弹 100, 时间延长 60, 缩小垃圾 40, 星图揭示 20, 宇航员手套 70, 双倍金币 30
- star_map (星图揭示, 🗺★, 60s, 20 coins) replaces star_magnet — visually confirmed in full shop screenshot
- 宇宙炸弹: single-target (destroys only currently-caught debris + resets net) — web parity
- 时间延长 description shows "+20秒" clearly on shop card
- All 8 items visible in single Playwright screenshot (2x4 grid)

### time_ext
- +20s, capped at startTime+20 (prevents exploiting multiple uses beyond initial time limit)
- Shop description clear: "即时+20秒剩余时间"

### Ongoing Low Friction (backlog)
- Gallery: 30 '?' cards give no hint about unlock mechanic — first-time users may not understand
- Fail screen shows 0 coins but no explanation of how coins are earned on success

## Sprint 27 Updates — Web Version (2026-04-19)

### Menu Cover — Full-Screen Constellation Background
- Random constellation fills upper ~60% of screen (375×812 mobile). Stars + connecting lines visible as background art.
- Each menu visit randomly selects a new constellation (no persistent selection across navigations).
- Info panel (bottom): emoji + Chinese name + viewing season tip + notable stars. NO location text in any state.
- 全天星图 button permanently removed. Menu has exactly 3 buttons: 挑战关卡, 星座展厅, 道具商店.
- All 3 navigation paths (level select, gallery, shop) → return to menu: constellation restarts cleanly, no JS errors.

## Sprint 24-mini Updates (2026-04-17)

### Menu Buttons — Now Solid Gradient (STORY-00289, OBSOLETES Sprint 22 ghost-button notes)
- Primary button: solid purple gradient with drop shadow. Ghost-style is gone.
- Double-spaced title "追  星  少  女" both landscape and portrait.
- Constellation left panel: 60% screen width (rightX=W*0.62).
- Achievement button touch target 20-24px height — known tradeoff, below platform minimums but secondary feature.

### Net Physics — Fundamentally Slower (STORY-00286)
- NET_SPEED=4 px/frame (was 9→5→4). Round-trip ~2.76s clean, ~8+ seconds with debris catch.
- Debris drag visual confirmed: debris follows net head during slow retract.
- Game pacing is now slower than Gold Miner genre norm. User feedback needed after real device test.

### Intro Animation — Full Visual Quality (STORY-00283/00284)
- 4 pre-spawned meteors visible from frame 1. Portal glow + twinkling 80 stars. Subtitle float-up. ✦ separator.
- Skip hint visible from frame 1 at bottom-right.

### Girl Character — Substantially Improved (STORY-00285)
- 130px tall, head r=20, full eye anatomy (sclera/iris/pupil/shine), polygon hat star.
- Character takes 35% of 375px screen height — appropriate for protagonist prominence.

### Level Cards — 6-Column Grid (STORY-00288)
- 6 cols landscape, ~100px card width. 2-char Chinese abbreviation. Name min 7px — legible at 2x+ DPI.

## Sprint 22-mini Updates (2026-04-17)

### Ghost Button Home Screen — **OBSOLETE as of Sprint 24-mini**
- Home screen uses two-column landscape layout: constellation art (left), title+buttons (right).
- Ghost-style buttons: semi-transparent fills let star background show through, creating cohesive starscape scene.
- Button hierarchy: primary (★ 挑战关卡, gold border+text) → secondary (◉/◈, softer border, light text) → tertiary (🏆, smallest).
- Medium friction: button icons (★ ◉ ◈ 🏆) inconsistent symbol system — text carries navigation weight, not icons.


### Victory Linger Phase — Emotional Payoff Improved
- Constellation line draw slowed 3x: `max(lines*0.35, 1.5)s` total. 1.5s linger phase after completion.
- Stars pulse with yellow glow during linger — "I built that" satisfaction moment before result card.
- Players can tap to skip linger if impatient.

## Sprint 21-mini Updates (2026-04-17)

### All Buttons Now Functional — Primary Flow Fully Completable

#### DPR Touch Fix CORRECTED (STORY-00269)
- **OBSOLETE**: Sprint 20 entry said "apply `touch.clientX/Y * G.DPR`" — this was WRONG. The correct pattern is NO DPR multiplication.
- canvas.width = CSS pixels (from sysInfo.windowWidth). touch.clientX/Y = CSS pixels. No conversion needed.
- All 6 screens use `touch.clientX` / `touch.clientY` directly. G.DPR stored for reference only.
- Full primary flow now completable: intro → menu → levels → item-select → game → complete/fail.

#### QR Scan Black Screen Fix (STORY-00271)
- game.js uses `sysInfo.windowWidth || 375` (always non-zero) for screenW/H.
- `navigate(startScreen)` deferred inside `requestAnimationFrame()` — canvas committed before first draw.
- User experience: scan QR → immediate intro animation → menu.

#### Home Screen Button Visual Redesign (STORY-00270)
- `_drawMenuButton` in menu.js is the premium button renderer for home screen only.
- 3-tier hierarchy: primary CTA (挑战关卡, bright #c044ff gradient, gold border), secondary (darker purple, light border), achievement (old drawButton at 60% alpha).
- All return `{x,y,w,h}` — hitTest unchanged.
- Pre-existing gap: no visual pressed/tap state on buttons.

## Sprint 20-mini Updates (2026-04-17)

### 4 Production Blockers Fixed — Primary Flow Now Completable

#### DPR Touch Fix (OBSOLETE — see Sprint 21-mini)
- ~~All 6 screens now apply `touch.clientX/Y * G.DPR`~~ — **INCORRECT, reverted in Sprint 21-mini**
- Scroll and tap interactions now work correctly on all DPR>1 devices (via the correct fix in Sprint 21)

#### Net Length (H*0.75)
- Stars spawn between `SAFE_TOP+60` and `H*0.62`. Net now reaches `-13px` (above screen top) → full sky zone coverage
- Game is mechanically completable from Sprint 20-mini onward

#### Girl Character v3 (81px)
- Anchor: `_poleX=W/2, _poleY=H*0.82`. Visual range: hat top at -67, shoes at +14 → 81px
- Net rope origin: `(_poleX+12, _poleY-60)` — rope connects at raised right hand
- Character does NOT overlap star zone: character top at H*0.82-67 = 480px, star ceiling at H*0.62 = 414px ✓
- Anime proportions correct: head diameter 20px / total 81px ≈ 25%
- Persistent minor: no idle animation on character in miniprogram version

## Sprint 16-mini Updates (2026-04-17)


### Intro Animation
- 3-phase sequence: meteor shower → constellation reveal (with name label) → "追星少女" title + "轻触屏幕开始". Clear call-to-action. Atmospheric, thematically unified.
- Phase transitions are logical and build anticipation. Tap-to-skip enabled.

### Gallery Star Chart
- Star chart in detail view: circular frame, stars sized by magnitude (large yellow = bright, small blue-white = faint), golden connecting lines with glow. No star name labels on chart — educational depth gap.
- Chart renders consistently and fits within circular boundary.

### HUD Item Slots (Medium UX gap)
- 3 numbered slots (1/2/3) bottom-right, each showing an icon. No labels/tooltips — first-time player cannot know what items do or that tapping activates them.
- Future consideration: brief first-use hint or icon tooltip on first gameplay session.

### Visual Cohesion
- Consistent palette across all screens: deep navy/black backgrounds, gold constellation lines, purple accent text, white UI text. Game reads as polished and thematically unified.

## Sprint 12-mini Updates (2026-04-16)

### Gallery Photo Carousel
- StarGame gallery detail now uses a pure Canvas carousel with 3 photos per constellation (30 constellations, 90 total from Wikimedia Commons)
- Carousel navigation is button-only (no swipe gesture) with ‹/› arrows at 32×44px — functional but below recommended touch target size
- Boundary handling: opacity 0.25 (faded) at boundaries, silent no-op on tap — no haptic or visual feedback at boundaries
- Carousel state resets to 1/3 on constellation change — consistent, no state carry-over
- Photo area: 160px tall with async loading ("加载中...") and error state ("暂无图片")
- Touch offset calculation accounts for scroll position via `_detailScrollY`

---

## Product Understanding
《星捕少女》是一款面向全年龄的休闲教育游戏。玩家扮演一个小女孩，在新西兰夜空背景下，用摆动的网兜抓取天上的星座星星，同时学习星座知识。

## Primary User Flow
1. **进入游戏** → 看到美丽的夜空封面，理解这是一个关于星星的游戏
2. **选关** → 看到30个关卡，理解需要从第1关开始，锁定的关卡不可点击
3. **开始游戏** → 看到天空中的星星，看到网兜在摆动，理解要点击来发射
4. **操作网兜** → 点击后网兜飞出，抓到东西返回，无需教程即可理解
5. **通关** → 看到星座连线动画，获得星座介绍，感觉有收获
6. **购买道具** → 在商店选择有帮助的道具
7. **查看展厅** → 欣赏收集到的星座图片和故事

## UX Risk Areas
- **网兜操作**: 黄金矿工老玩家秒懂，但新玩家可能需要轻微提示
- **星星vs垃圾**: 视觉上需要明显区分（亮晶晶的星 vs 灰暗的垃圾）
- **时间压力**: 倒计时需要清晰，最后10秒需要明显提示
- **首次游戏**: 无教程情况下，用户能否在30秒内理解基本操作？

## Friction Points Found
### Sprint 1 (2026-04-10)
- No in-game tutorial/control hint — first-time player must discover click-to-fire by experimentation (Medium)
- Fail screen shows "—" / "0秒" / "0枚" instead of actual attempt stats — confusing (Medium)
- Locked level cards have no constellation name hint — missed opportunity to build anticipation (Low)
- Debris objects have no visual cue indicating they should be avoided (Low)

## Interaction Patterns
- Click to fire (not drag) — simple, decisive
- Net auto-returns (no need to click again) — forgiving
- Star twinkling = "I'm a target" visual affordance
- Debris darker/duller = "I'm an obstacle" visual differentiation

## Sprint 2 Updates (2026-04-10)

### New Screens Added
- **Shop** (#screen-shop): 4-col grid of 8 items with price, effect, type badge, buy button. Coin balance shown in header. Buy button disabled when coins < price. Owned badge appears after purchase.
- **Gallery grid** (#screen-gallery): 6×5 grid of 30 cards. Locked = grey silhouette + 未探索. Unlocked = colored card with icon + name (ZH/EN), clickable.
- **Gallery detail** (#screen-gallery-detail): Large icon, ZH/EN name, lore text paragraph. Back button → gallery grid.
- **Tutorial hint** (#game-hint): Pill overlay on game screen. Appears on first game load (sessionStorage gate). Dismisses on click or after 5s auto-timeout.

### Sprint 1 Friction Resolved
- Tutorial hint now present — STORY-00008 ✓
- Fail screen stats now accurate — STORY-00007 ✓

### New UX Gaps (Sprint 2)
- Shop: no pre-purchase ownership info visible (only appears after buying)
- Shop: type system (持续型/消耗型) unexplained — first-time user confusion risk
- Gallery: no "newly unlocked" badge for first visit after level completion
- Gallery detail: lore text may clip on shorter viewports (no scroll affordance confirmed)
- Tutorial hint: 5s auto-dismiss may be too short before first action

### Navigation Patterns
- Complete screen → Shop: 🛒去商店 button (direct navigate)
- Shop → back: 返回 button → navigate('levels') or navigate('complete') (context TBD — wired to 返回 which goes to levels)
- Menu → Gallery: 星座展厅 button → navigate('gallery')
- Gallery → back: 返回 button → navigate('menu') via navigate()
- Gallery card click → navigate('gallery-detail', {idx})
- Gallery detail back → navigate('gallery')

## Sprint 4 Updates (2026-04-10)

### Item Effects in Gameplay
- **Passive items**: consumed at engine constructor time; brief toast (~3.5s) lists active items. No persistent HUD indicator after toast fades.
- **Active item buttons**: HUD shows 💣炸弹 (space_bomb) and ⏱️+20秒 (time_ext) buttons if qty > 0. Buttons 64-68×68px — adequate touch target.
- **time_ext**: adds 20s to countdown. Timer jumps up on next RAF frame — no visual flourish. Button hides after single use.
- **space_bomb**: clears all uncaught debris. Button hides after single use.

### New Friction Points (Sprint 4)
- Toast lacks explicit "already active" framing — Medium
- No persistent passive item HUD row after toast fades — Medium
- time_ext has no visual confirmation overlay (timer jumps but no '+20s' flash) — Low
- No item preview on level select screen — Low

### Navigation Regression
- Sprint 4: game→levels→menu and all other routes: CLEAN, zero console errors.

## Sprint 6 Updates (2026-04-10)

### Scene System
- Game now has 6 distinct night sky scenes across 30 levels (5 levels per scene). Scene assignment: `Math.floor(levelIdx / 5)`.
- Scene 0 = deep blue-violet (default/beginner), Scene 4 = animated teal-green aurora (most visually distinctive), Scene 5 = near-black dense starfield (advanced).
- Scene palette applies to game canvas, level select background, and complete/fail tints.
- Scene system is ambient — no in-game explanation or labeling. Players may not consciously register the progression.

### New Friction Points (Sprint 6)
- No scene transition ceremony when crossing level boundary (e.g. level 5→6) — Medium
- Level select has no scene group labeling or dividers — Medium
- Complete/fail screens share same scene tint; emotional differentiation relies only on text/icons — Low
- Star map overlay contrast on Scene 4 (aurora) not verified — Low risk

### Navigation Regression
- Sprint 6: ALL screens (menu, levels, game, complete, fail, shop, gallery) CLEAN, zero JS console errors after TO→AWAY→BACK cycles.

## Sprint 7 Updates (2026-04-11)

### Scene Transition Ceremony (STORY-00027)
- First entry to a new scene group shows a 2500ms fade-in/hold/fade-out overlay with scene name + level range ("— 第 N–M 关 —"). Timer frozen during intro. Input blocked via `_introPlaying` guard.
- No-repeat gate via `state.seenScenes` (Set<number>) persisted to localStorage. Second entry to same scene: game starts immediately, no ceremony.
- Sprint 6 Medium friction "no scene transition" RESOLVED.

### Scene Dividers in Level Select (STORY-00028)
- Full-width scene dividers with colored dot (`scene.sky1`), location name, and optional "极光" badge tag for aurora scenes.
- All 6 scene groups labeled. Dividers use `grid-column: 1 / -1` to span the grid.
- Sprint 6 Medium friction "no scene grouping" RESOLVED.
- Known Low: divider dots for darkest scenes (0, 5) nearly invisible — dot uses `sky1` which is near-black.

### Gallery Detail Portrait (STORY-00026)
- Gallery detail now has a 300×300 canvas portrait with scene-matched background gradient, constellation star positions, spectral-type colors, magnitude-based sizes, golden connecting lines, glow effects. Replaces emoji-only display.
- Portrait renders correctly after full navigation regression. Static (no animation — opportunity for future enhancement).

### New Friction Points (Sprint 7)
- Scene divider dots for darkest scene palettes (0, 5) are nearly invisible — Low
- 6-column grid leaves empty cell after each 5-level group — Low (visually subtle)
- Star cursor overlays scene transition subtitle text — Low (cosmetic)
- Gallery portrait is static while complete screen has animated line-draw — Low (opportunity)

### Navigation Regression
- Sprint 7: levels↔menu, game↔levels, gallery-detail→gallery→menu→levels→menu→gallery→gallery-detail: ALL CLEAN, zero console errors.

## Sprint 8 Updates (2026-04-11)

### Menu Mute Button (STORY-00031)
- Mute button (🔊/🔇 emoji, ~2.4rem square) added to top-right corner of `.menu-inner` (absolutely positioned). Visible immediately on menu load.
- Toggle works: 🔊 → 🔇 → 🔊, no console errors. Mute state persisted via localStorage key `starcatcher_muted`.
- Sprint 7 VU complaint "mute button invisible on main menu" RESOLVED.

### Gallery Metadata (STORY-00030)
- Gallery detail screen now has a `.detail-meta` card between the portrait/name block and the lore text.
- Three rows: 所属天区 (sky region), 最佳观测时间 (best viewing month), 主要星星 (notable stars).
- Gold labels, white values, dark card background — consistent with design system.
- All 30 constellations have non-empty data for all three fields.
- Sprint 7 VU complaint "gallery metadata missing" RESOLVED.

### New Friction Points (Sprint 8)
- Mute button has no text label — emoji-only. Standard convention, Low severity only.
- Metadata star names not interactive (tappable) — informational display is appropriate, Low friction.

### Navigation Regression
- Sprint 8: menu→gallery→gallery-detail (Orion + Ursa Major)→gallery→menu. ALL CLEAN, 0 JS errors. Only pre-existing Google Fonts offline error.

## Sprint 9 Updates (2026-04-11)

### SVG Star Chart (STORY-00032)
- Gallery detail now has a dedicated star chart section below the metadata card, labelled "⭐ 星图 · STAR CHART".
- 480×480 SVG, circular telescope-style viewport, per-constellation: spectral-type colored stars (orange=K/M, blue-white=A/B), dashed constellation lines, Chinese star name labels, tick marks on rim, constellation name (EN all-caps) at bottom.
- Visually unambiguous distinction from the canvas portrait above: portrait = artistic starfield painting; chart = technical astronomical diagram.
- Each constellation produces a unique chart shape — confirmed with Orion (Z-shape) and Ursa Major (Big Dipper).
- SVG re-renders correctly on repeat visits (no stale state).

### Full Lore Text (STORY-00033)
- Lore text for all 30 constellations expanded to ≥500 Chinese characters.
- Content structure: mythology/legend narrative + notable star science + observation facts. Reads as genuine education, not filler.
- Orion: Betelgeuse size/luminosity, Rigel, belt stars, Orion Nebula M42 — 496 chars in DOM.
- Ursa Major: Big Dipper navigation tool, Callisto myth, Mizar double star, cultural significance — comparable length.

### New Friction Points (Sprint 9)
- None (Google Fonts woff2 load failure is pre-existing infrastructure, Low, no visible impact)

### Navigation Regression
- Sprint 9: menu→gallery→detail(Orion)→gallery→detail(Orion again)→gallery→detail(UrsaMajor). ALL CLEAN, 0 JS errors across all transitions.

## Sprint 11 Updates (2026-04-11)

### Visual Polish Sprint — All 6 Stories Verified

#### STORY-00040 — Debris Visual Upgrade
- Debris renders as procedural rock/asteroid shapes (grey, irregular canvas drawing)
- Clearly distinct from glowing star targets — user can identify without prior knowledge
- Sprint 10 VU complaint "debris not convincing enough" RESOLVED

#### STORY-00041 — Complete Screen Layout
- Complete screen redesigned to fit 100vh: canvas 160×160, `max-height:100vh; overflow-y:auto` on `.complete-inner`, lore in scrollable area
- All key elements (title, stars, portrait, stats, lore, buttons) visible without external scroll
- Sprint 10 VU complaint "complete screen too tall" RESOLVED

#### STORY-00042 — Gallery Photo Carousel
- Bottom of gallery detail now has horizontal scroll-snap photo carousel `#detail-photo-carousel`
- 20 constellations covered with real NASA/ESA/Wikimedia images (public domain / CC-BY)
- Cards: image + credit line + title. Layout: `scroll-snap-type: x mandatory`, 280px cards
- Sprint 10 VU complaint "gallery lacks visual richness" RESOLVED

#### STORY-00043 — Character Animation Upgrade
- Anime girl replaced with procedurally-drawn character: purple skirt, brown hair, golden pole
- Silhouetted mountain landscape horizon in game background (tekapo style)
- Character has idle/throw/catch arm states driven by engine state
- Sprint 10 VU complaint "character too simple" RESOLVED

#### STORY-00044 — Global Visual Upgrade Part 1
- Screen transitions: `screenFadeIn`/`screenFadeOut` keyframes with scale. `_navPending` guard prevents double-fire.
- Glass-morphism cards: `backdrop-filter: blur(10px)` + semi-transparent background on all card types
- Gradient text headers on levels, gallery, shop sections

#### STORY-00045 — Global Visual Upgrade Part 2
- SVG ring timer at HUD top-center: depletes as time passes, color changes orange→red at low time
- Shop badge glow: `badge-glow-active` (amber pulse) + `badge-glow-passive` (purple pulse) keyframes
- Cursor star trail: `_trailEnabled` flag (disabled during gameplay), `.cursor-trail-particle` floats upward

### New Friction Points (Sprint 11)
- Photo carousel images require external network (Wikimedia CDN) — alt text shown offline (Low, by design)
- No "new photos" indicator when first visiting gallery after level completion — Low

### Navigation Regression
- Sprint 11: menu → levels → item-select → game → complete → shop → menu → gallery → gallery-detail: ALL CLEAN, 0 JS errors throughout entire sequence.

## Sprint 12 Updates (2026-04-11)

### Gameplay UX Improvements Verified
- **Constellation guide lines (STORY-00046)**: Faint golden lines connecting stars now always visible — players immediately understand what shape they're forming. Major comprehension improvement.
- **Debris rotation (STORY-00047)**: Debris (cloth, rocket) visually distinct from star targets — spinning, different shapes/colors. No confusion risk.
- **Net teardrop shape (STORY-00049)**: Golden circular bag at pole tip clearly reads as a catching net in-flight.
- **Pause system (STORY-00050)**: Frosted blur overlay, three well-hierarchied options (continue primary, restart secondary, exit ghost). Intuitive for first-time players.
- **Complete screen (STORY-00051)**: Fits viewport, "去商店 →" CTA dominant, star rating + new-record badge rewarding. Secondary actions below CTA.
- **Level select (STORY-00052)**: Scene dividers now clean horizontal lines — no location text clutter.

### New Friction Points (Sprint 12)
- Fail screen "剩余" label misleading when timer expires — shows "90秒 剩余" but means elapsed time. Players confused why they lost. Medium severity.
- Constellation mini-canvas on complete/fail screens shows as grey square — cosmetic. Low severity.

### Navigation Regression
- Sprint 12: menu → levels → item-select (with item) → game → pause → resume → game → fail: CLEAN
- 1 console error: Wikimedia CDN timeout (pre-existing, expected offline, no JS errors)

## Sprint 13 Updates (2026-04-11)

### Difficulty Bar (STORY-00057)
- Level cards now show color-coded progress bar: green (#4cde80) for difficulty 1-2, amber (#ffb830) for 3, red (#ff5555) for 4-5; bar width = difficulty/5 × 100%
- "难度" label at 9px/60% opacity is the weakest visual element on level cards — functional but below comfortable legibility threshold, especially on unlocked cards
- Color progression only visible on later levels (cards 1-10 mostly green/amber) — first impression lacks strong color variation

### Star Chart Zoom Modal (STORY-00055)
- "点击放大查看" hint text at 11px/50% opacity — discoverable but subtle; zoom-in cursor provides secondary affordance on desktop
- Modal is robust: ✕ button (top-right), Escape key, and backdrop click all close correctly with 200ms fade transition
- Star labels clearly legible at 90vmin size — significant improvement over 480px inline

### Photo Carousel Enhancement (STORY-00056)
- Cards upgraded to 16px radius, drop shadow, hover scale(1.04) + gold border glow
- Gold gradient header with bottom border is polished and consistent with design language
- onerror fallback (✦ placeholder) works correctly for broken external image URLs
- "暂无图片" empty state is visually intentional and well-styled

### New Friction Points (Sprint 13)
- "难度" label at 9px/60% opacity is barely legible on the unlocked card — Medium
- Star chart hint text too subtle for reliable first-time discovery on touch devices — Low
- External photo URLs fail to load (CORS/CDN) — existing infrastructure issue, Low
- Color variation in difficulty bars only apparent after scrolling beyond first scene group — Low

### Navigation Regression
- Sprint 13: menu → level select → back → gallery → Orion detail → star chart modal (open/close ×3) → carousel → back → unlock idx29 → 猎犬座 detail → empty carousel → back → menu: ALL CLEAN, 0 console errors

## Sprint 15 Updates (2026-04-12)

### Sprint 15 UX Improvements Verified

#### STORY-00064 — 少女角色重绘
- Character visually upgraded: anime proportions, twin tails, almond eyes with catchlights, detailed costume
- Procedural canvas drawing — no external assets required

#### STORY-00065 — 网兜视觉重绘
- Net: mouthR=26 (was 18), 6 mesh lines (was 4), netSpeed=0.014 (was 0.025)
- Catching mechanic is now more readable: larger net mouth makes target area obvious
- Slower speed gives players more time to aim — significant gameplay feel improvement

#### STORY-00066 — 星星大小/亮度区别
- Uncaught: `visualR = s.r * 1.8`, gold glow (#ffd700), animated twinkle cross — bright, prominent, clearly "grab me"
- Caught: `r * 0.5`, `#aaaacc` (grey-lavender), `globalAlpha=0.25` — dim, small, clearly "done"
- Contrast between states is unambiguous — resolves Sprint 10 VU complaint about star confusion

#### STORY-00067 — 游戏交互精修
- 300ms click delay prevents accidental net launch from level-entry click ✓
- sessionStorage gate: scene intro shows once per browser session (not once ever) ✓
- net_enlarge replaces star_magnet in all UIs (shop, item-select, game HUD) ✓
- Debris size variation: large debris (r=22-32) retracts 2x slower than small (r=12-18) ✓

#### STORY-00068 — 展厅/商店UI修复
- Shop cards: `rgba(26,31,78,0.6)` default background (no hover required) ✓
- Exit button: `rgba(255,255,255,0.08)` default background + visible border ✓
- Gallery detail: NO back button at top, back button at bottom only ✓
- Gallery locked cards: "？" only (no name/icon leakage) ✓
- Pause button: correctly shows ⏸ after resuming (was stuck on ▶) ✓

### Navigation Regression — Sprint 15
- Menu → Shop → Menu → Game → pause → resume → Game → Gallery → Gallery Detail: ALL CLEAN
- Zero JS errors across entire navigation sequence

### New Friction Points (Sprint 15)
- Unlocked-incomplete gallery cards (猎户座 style) show no hint that playing the level reveals gallery detail — Low discoverability gap
- Font loading failure (offline environment) — pre-existing infrastructure, not a UX concern

## Sprint 14 Updates
- Sprint 14: All 6 user-reported issue stories verified as resolved from UX perspective
- Sprint 14: Pause overlay now uses three-tier visual hierarchy (gradient CTA > outline > text link) — good pattern to maintain for all future modal dialogs
- Sprint 14: Gallery completion gating uses bright/dim cards + '未通关' label — effective binary state communication
- Sprint 14: HUD layout stabilized — pause (⏸) and mute (🔊) as separate side-by-side buttons in top-right, level name in top-left, timer center-top, star counter right of timer
- Sprint 14: Shop accessible from main menu as tertiary text link — appropriate visual weight for utility action
- Sprint 14: Fail screen simplified to only 重试 + 返回选关 — no extraneous navigation options
- Sprint 14: Photo lightbox functional with prev/next/close controls — standard gallery interaction pattern
- Sprint 14: Decorative floating gold star persists across screens — cosmetic, non-blocking, background animation

## Sprint 17 Updates (2026-04-12)

- Sprint 17: Net confirmed visible at idle — golden ring on pole, positioned to girl's right. No longer disappears between throws. Issue resolved.
- Sprint 17: Game preloading working — all assets visible at 0s entry. No blank canvas.
- Sprint 17: Coin formula confirmed: fail=0, success=remaining_seconds×10. Initial 100 coins for fresh players.
- Sprint 17: Complete screen button set: 去商店 (primary/large), 下一关 (secondary), 返回选关 (tertiary with dark tint — now has visible background).
- Sprint 17: Fail screen layout improved — centered vertically with generous spacing. Hierarchy: title → stats → constellation canvas → encouragement → buttons. No longer cramped.
- Sprint 17: Zero console errors across all navigation transitions.

## Sprint 19-mini Updates (2026-04-17)

### Visual Overhaul — All 4 Stories Verified (Code-path, MEDIUM confidence)

#### Net (STORY-00257) — Full Mesh Bag
- Extended state: 28px mouth ring (golden ellipse with shadowBlur=6 glow), semi-transparent gold bag fill (bezier triangular shape), 4 horizontal arc mesh lines + 2 vertical curves, brown rope. Clearly readable as catching tool in flight.
- Idle state: 16px stub at reduced opacity — Medium UX gap (affordance weak before first tap, but resolves immediately on extension)
- Arc trail: 10 fading white dots (0→3.5px radius, 0→0.6 alpha) behind net head during extension — satisfying motion history
- Catch flash: 3-frame bright gold overlay (shadowBlur=20, alpha 0.7→0) — instant "got it" signal

#### Character (STORY-00258) — Anime Quality
- Height ~140px (~37% of 375px screen height) — substantial, clearly the visual centerpiece
- Distinctive silhouette: tall purple witch hat, 60px-wide purple gradient dress, star emblem, throwing pose with right arm up
- Purple radial aura (r=65, subtle 14% opacity) adds magical atmosphere
- Head: r=17 with anime eyes (3px dark iris + 1.2px shine), eyebrows, smile, blush cheeks
- Hair: dark bezier strands sweeping behind, side tufts framing face, crown arc, fringe — reads as "flowing hair" at game scale
- Throwing pose: right arm extended up to y=-60 (rope origin) communicates the mechanics without tutorial

#### Catch Feedback (STORY-00259) — Dual Channel
- 12-particle burst (6 gold + 3 white + 3 star-color) at evenly-spaced radial angles, 0.6s life
- 3-frame golden flash on net bag — clear "caught" signal
- Screen shake on debris: 6-frame ±3px translate — standard punishment signal

#### Global Visual Effects (STORY-00260) — Rich Atmosphere
- 106 background stars (100 normal + 6 bright with blue shadow glow) — rich starfield
- Warm orange ground glow at horizon (H*0.76) — anchors the scene, adds depth
- 4-point star sparkle on catchable stars (sparkleLen=r×3, alpha modulated by twinkle) — clear "grab me" affordance
- Timer urgency: 18→22px font pulse at 2Hz when ≤10s — kinetic typography for tension
- Victory: 40 upward-arcing particles (gravity=0.04) in white/gold/warm-yellow, 1.3-2s life — satisfying fireworks

### Navigation Regression (Sprint 19-mini)
- All state (particles, trail, flash, shake, SFX context) properly reset in _cleanup()
- No stale visual artifacts expected between game sessions
- _lineDrawSfxCtx: cached single context with destroy() on cleanup — audio context leak RESOLVED

### UX Risk Remaining
- Net idle affordance: Medium — user must tap once to see the full net. Tutorial hint text already present from Sprint 2. Low priority for current quality bar.



- Sprint 19: Item-select overlay has clear "← 返回" back button top-left — dismisses cleanly to levels screen, no friction. One-tap back navigation confirmed.
- Sprint 19: Stars appear immediately on game entry (<50ms) — no blank canvas delay. Sprite pre-warming on levels screen eliminates previous 400ms delay.
- Sprint 19: Gallery detail layout confirmed photos (天文摄影) above star chart (星图) — correct information hierarchy for visual-first discovery.
- Sprint 19: Ursa Major M81/M82 astrophotos load correctly (ESA Hubble CDN). All photos verified HTTP 200.
- Sprint 19: Full navigation regression passed with 0 console errors across all tested paths (menu↔levels, levels↔item-select, gallery↔detail, game→fail→levels). SPA routing is stable.
- Sprint 19: Fail screen is clean — shows star count (0/7), "时间到了！" message, two unambiguous action buttons (重试/返回选关).

## Sprint 11-mini Updates (2026-04-16)

### Sprint 11-mini — 2 Fixes Verified (Code-path, MEDIUM confidence)

#### STORY-00239 — Victory lore "完成✓" dismiss fix
- `_loreDismissed` flag added. When user taps "完成✓" on final lore page: `_loreDismissed=true`, lore block skips rendering. Action buttons (下一关/再挑战/返回展厅) now reachable. Known Medium friction (Sprint 10-mini): RESOLVED.
- Two-phase result overlay UX: Phase 1 = paginated lore (下一页 →/完成✓), Phase 2 = action buttons. Transition is single tap on "完成✓".

#### STORY-00240 — Gallery constellation photo
- Gallery detail view now has 160px photo area between info pills and lore text.
- Three states: "加载中..." (async load pending) / actual photo (wx.createImage success) / "暂无图片" (load error or no URL).
- Async loading: stale-callback guard prevents race conditions on rapid prev/next navigation.
- 20+ constellations covered with Wikimedia astronomical photos (nebulae, star clusters).
- Remaining Low friction: "暂无图片" error vs intentional no-photo indistinguishable — Low only.

### Navigation Regression (Sprint 11-mini)
- Code-path analysis confirms all 4 photo state vars reset on detail entry/prev/next navigation. No stale photo from prior constellation. _loreDismissed reset in _triggerResult and _cleanup — no state leak across levels.

## Sprint 10-mini Updates (2026-04-16)

### Polish Sprint — 5 Features Verified

#### Net Always Visible (STORY-00234)
- Idle stub 22px at 50% opacity signals "ready to fire". Opacity difference distinguishes idle from active.
- No frames where net is invisible between shots. Visual continuity maintained.

#### Stars Warm Gold (STORY-00235)
- typeToColor removed. Unified warm palette: #fff8e0, #ffd700, #fffbe8, #ffec6e (round-robin).
- Caught stars: #aaaacc at 20% alpha — clearly "done", distinct from active targets.

#### Pause Button (STORY-00236)
- ⏸ button top-right HUD, always visible during play phase. Tap freezes all updates.
- Overlay: 3 options (继续▶, 重试🔄, 选关). No resume countdown — instant resume.
- _cleanup() resets _paused=false on all navigation — no stuck state.

#### Fail Screen Silhouette (STORY-00237)
- 340px card. Constellation silhouette (110×80, rgba 180,180,220,0.28) appears if _conDef has lines.
- Dynamic encouragement: "[nameZh]还在等你！". Warm, personalized tone.
- Retry is primary action, 选关 secondary — correct priority hierarchy.

#### Victory Lore Pagination (STORY-00238)
- Pages ~80 chars, split at sentence/word boundaries. Page indicator N/M.
- "下一段 ›" advances pages; last page shows "完成 ✓".
- **Known Medium friction**: "完成 ✓" tap is no-op — player must use other result buttons. STORY-00239 queued.
- Re-winning level shows lore again from page 1 (pages reset in _triggerResult).

### Navigation Regression (Sprint 10-mini)
- _cleanup() on every navigate prevents state leaks (pause, lore pages).
- showGame() full reset on every level entry. Cross-level state isolation confirmed via code analysis.

## Sprint 58 Updates
- Character confirmed: chibi girl in deep-purple spacesuit (#3a1f6b) + gold (#ffd700) accents, round helmet with star antenna. Occupies bottom ~25% of screen height.
- Star distribution follows constellation structure (Orion observed). Upper 60-70% of screen, no left-right bias.
- HUD: level name (top-left), circular timer (top-center, blue), star counter (top-right). Clean separation.
- Background depth: starfield + terrain silhouette + nebula glow. Atmospheric, non-interfering.
- Low friction: triangular arrow icon in play area slightly ambiguous (not a blocker).

## Sprint 74-mini Updates (2026-04-24)

- Level select three-tier visual hierarchy: dim (locked) → blue-purple pulse glow (unlocked) → gold completion ring + star dots (completed). Gold accent language extended from character suit to level nodes — coherent reward visual language.
- Gallery hexagon cells: glowing group-colored borders (shadowBlur=6, animated alpha), center white dot (r=3), 11px constellation name labels (5-char truncation + ellipsis). Creates "living star map" aesthetic. Low friction: 11px text is small on lower-DPI devices.
- Character arms: fully spacesuit-consistent — blue-purple (rgba(80,100,180,0.92)) vs deep purple torso (#3a1f6b) creates natural material differentiation. Elbow highlight dot adds glossy suit surface quality. Character internal design consistency resolved from Sprint 74-mini.
- Gold accent system: character suit details + level completion rings + star dot decorations = coherent achievement visual language across the full game.

## Sprint 70-mini Updates (2026-04-24)

- Bezier arms (Phase 1): sausage fills + elbow joint circles are functional and correctly positioned, but visually read as construction-quality vs the polished head/hat/dress. Two-tier quality perception on character. Expected Phase 1 state — Phase 2 will add sprite-based flesh rendering.
- Fail screen buttons (重试/选关) confirmed working. Retry path verified: fail screen → retry click → new game launched. Fail screen card is clean, actionable, emotionally appropriate.
- Fail screen card design: dark overlay, 1-3 star rating, caught/total stats, personalized constellation encouragement text, two clear action buttons. Consistent with dark-glass aesthetic.
- Menu screen stable: 3 buttons, constellation art, info strip, purple-blue palette. No regression from Sprint 41-mini state.
- Girl sprite: no white fringing after Sprint 67-mini transparency fix. Clean integration into dark starfield background.

## Sprint 67-mini Updates (2026-04-24)

- Girl sprite edges confirmed clean after transparency fix — no white/grey fringing. Character blends naturally into starfield.
- Bamboo pole and net clearly visible during throw state — clear directional feedback for player.
- Fail screen UX unchanged and functional — "重试"/"选关" buttons legible and correctly positioned.
- Navigation screenshot tooling: must capture game state before timer expires to observe menu/levels/game screens. Captures during fail state are not useful for regression verification.
