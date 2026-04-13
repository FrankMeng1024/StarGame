# CR.md — 星捕少女 → 追星少女 (StarCatcher)

Change requests log. Format: `## CR-NNN: [Title] (Sprint N approved)` + description.
PRD.md is never directly edited — all changes go through this file.

---

## CR-001 through CR-008
(Approved and implemented in Sprints 1–9. See tasks/lessons.md for retrospective notes.)

---

## CR-009: 游戏改名为"追星少女" (Sprint 10 approved)
Rename the game from "星捕少女" to "追星少女" throughout: HTML title, menu heading, subtitle, all docs, and any in-game text references. Character identity: same girl, now framed as "chasing stars" rather than "catching stars".

## CR-010: 降低网兜摆动速度 (Sprint 10 approved)
The pendulum swing is currently ~1.5s per full cycle — too fast for player decision-making. Target: 3–4s full swing (reference: Gold Miner classic). Player should be able to judge the angle and time the throw with skill, not luck. `swingSpeed` in engine.js needs to change from `(Math.PI*2)/(1.5*60)` to approximately `(Math.PI*2)/(3.5*60)`.

## CR-011: 抓住星星后连线保持可见 (Sprint 10 approved)
Currently caught stars disappear visually and constellation lines break. After a star is caught, it should remain visible as a dim glowing dot at its original position (not dragged by the net). Constellation line previews (star_map item or always-on guide lines) must remain intact. The satisfaction of "completing the constellation" requires all stars and lines to stay visible.

## CR-012: 背景增加地景结构 (Sprint 10 approved)
Game backgrounds should show ground + sky structure (like New Zealand starscape photos: rolling hills or mountain silhouette at bottom, star sky above). The current 6 scene palettes are pure sky gradients. Each scene should have a distinct ground silhouette layer (CSS or canvas drawn) that matches the NZ location. Reference: user's local `Downloads/tekapo.png` shows ground-sky split composition. Background images: search for CC0/public domain NZ starscape astrophotography (Unsplash, Pexels, NASA, ESO, etc.) — self-evaluate for composition quality before using.

## CR-013: 精致化宇宙垃圾视觉 (Sprint 10 approved)
Current debris is drawn with basic geometric shapes. Upgrade each of the 4 types to be clearly recognizable as space debris:
- meteor: rocky irregular shape with glow trail
- satellite: proper body with solar panels + antenna detail
- rocket: burnt rocket stage with nozzle + scorched marks
- cloth: torn fabric/mylar sheet with jagged edges and drift animation
Visual weight: debris should look meaningfully dangerous/interesting, not like grey blobs.

## CR-014: 完结界面布局改善 (Sprint 10 approved)
The level-complete/fail screen has too much dead space at the top and the lore text gets cut off requiring scroll. Requirements:
- Must fit entirely in 100vh — no vertical scroll needed
- Reduce canvas size and top padding to reclaim space for lore
- Lore text area should show ≥200 chars without scroll; if text is longer, use a scrollable text area with styled scrollbar
- Optional: auto-read feature (text-to-speech or auto-scroll animation)

## CR-015: 画廊图片改为水平滚动轮播 (Sprint 10 approved)
The gallery detail page currently shows a single static image (or SVG chart). Replace with a horizontal CSS scroll carousel showing multiple astrophotos of the constellation/location. Images must be real CC0 astrophotos sourced from web (Unsplash, Pexels, NASA public domain, ESO). Layout: `display:flex; overflow-x:auto; scroll-snap-type:x mandatory` with styled scrollbar. Each card: image thumbnail + credit attribution.

## CR-016: 场景介绍不在游戏画面入场时显示 (Sprint 10 approved)
Bug fix: the scene intro overlay (showing e.g. "特卡波湖·牧羊人小屋") appears at game screen entry on every first-visit level, but the timing is wrong — it shows when the player is already expecting gameplay, not as a scene-change ceremony. The intro should show ONLY when the scene changes (first entry to levels 1, 6, 11, 16, 21, 26 — i.e. scene index 0–5). When a player re-enters a level in the same session, the `seenScenes` Set prevents re-showing, which is correct. The fix is ensuring the overlay is shown as a full-screen interstitial before game loop begins, which is already the design — verify the timing is correct and the overlay does not bleed into the first game frames.

## CR-017: 道具系统重设计 — 被动/主动分类，赛前选择 (Sprint 10 approved)
Full item system redesign:
1. **Classification**: Items are now 被动 (passive, always-on %) or 主动 (active, manual activation with time limit):
   - 被动: double_coins (金币+100%)、time_bonus (时间+10%) — apply automatically for the full level, no slot needed
   - 主动: net_speed (⚡ 15s)、star_magnet (🧲 30s)、shrink_debris (🔬 30s)、star_map (🗺️ 60s)、glove (🧤 30s)、space_bomb (💣 instant)、time_ext (⏱️ instant, +20s)
2. **Pre-level item selection screen**: Before a level starts, show a selection screen where the player picks up to 3 主动 items from their owned inventory. 被动 items apply automatically without selection.
3. **In-game activation**: Each selected 主动 item is assigned slot 1, 2, or 3. Player presses keyboard key 1/2/3 to activate. HUD shows 3 slots with icons; activated items show a countdown timer and greyed-out when expired.
4. **Duration**: Each active item runs for its stated duration (15s/30s/60s) or fires instantly (bomb, time_ext). After duration expires, the effect ends and the slot is empty.
5. **Shop**: Update shop descriptions to reflect new 被动/主动 classification and duration info.

## CR-018: 少女角色精灵图动画 (Sprint 10 approved)
The current girl character is drawn with basic canvas shapes (ellipse body, circle head, etc.) — too simple. Replace with a sprite sheet animation:
- Source: Find a CC0/free sprite sheet of an anime-style girl character online (itch.io free assets, OpenGameArt, etc.)
- Animation states: idle (standing/swaying), throw (arm extended), catch (net outstretched)
- Implementation: canvas drawImage with sprite sheet frame cycling
- Fallback: if a suitable CC0 sprite is not found, upgrade the procedural drawing significantly (hair details, dress, glowing net, proper proportions)

## CR-019: 全局界面视觉升级 (Sprint 10 approved)
Upgrade all UI screens to maximum visual quality:
- Buttons: gradient fills, glow on hover, subtle shadow
- Cards (level, gallery, shop): glass-morphism style (backdrop-blur, semi-transparent, border glow)
- Screen transitions: fade + slight scale transition between screens
- Particle trails: cursor leaves a star trail (already has star cursor, add CSS animation trail)
- Typography: gradient text for titles (CSS background-clip:text)
- HUD: semi-transparent pill badges, animated countdown ring for timer
- Shop: item cards with animated type badge glow
Reference standard: the visual richness of games like Sky: Children of the Light or premium mobile games. Every interactive element should have visible hover/active feedback.

---

## CR-020: 网兜形状升级 (Sprint 12 approved)
The current net visual is incorrect — it looks like a line or lasso, not a real butterfly/fishing net. Replace with a proper net bag shape:
- Net is a triangular/teardrop mesh bag that hangs from the pole tip
- Drawn with canvas 2D: a bag outline + crosshatch mesh lines inside (5-6 horizontal + 5-6 vertical arcs)
- Net opens/stretches wide at the mouth when flying, narrows as it retracts
- Color: golden/cream semi-transparent mesh with darker frame ring at mouth
- When a star is caught, the net visibly bulges slightly before retract starts

## CR-021: 小女孩角色重新设计 (Sprint 12 approved)
The current procedural character is not appealing. Full redraw of the canvas-drawn girl:
- Larger, more detailed head: almond eyes with highlights, rosy cheeks, smile, detailed hair (twin tails with ribbon or loose flowing hair)
- Dress: layered skirt with gradient (deep navy → purple hem), sparkle pattern on bodice
- Arm: extended holding a glowing golden staff/pole, other arm slightly out for balance
- Shoes/legs visible (not hidden by skirt edge)
- Overall silhouette: about 120-140px tall (not tiny), centered at bottom 15% of canvas
- Character should feel like a 2D anime illustration, not a basic geometric shape
- Warm skin tone, expressive face. Reference: visual style of 原神 or 星之卡比 fan art (simplified anime, not realistic)

## CR-022: 宇宙垃圾旋转动画 (Sprint 12 approved)
All debris objects must rotate continuously during gameplay. Each debris type has its own rotation speed:
- meteor/asteroid: slow tumble (0.015 rad/frame)
- satellite: medium spin (0.02 rad/frame)
- rocket: slow rotation (0.01 rad/frame)
- cloth/mylar: fast irregular flutter (0.025-0.04 rad/frame, oscillating)
Implementation: each debris object tracks a `rotation` property (radians), incremented each frame before canvas draw. `ctx.save()`, `ctx.translate(x, y)`, `ctx.rotate(obj.rotation)`, draw centered at (0,0), `ctx.restore()`.

## CR-023: 游戏内淡淡星座连线 (Sprint 12 approved)
Draw faint constellation guide lines in the game canvas at all times (not just when star_map item is active):
- Lines drawn between all star pairs per the constellation's line definition
- Style: `rgba(255, 215, 0, 0.12)` (very faint gold), `lineWidth: 0.8`, no shadow
- Lines update dynamically: when a star is caught, the line between caught and adjacent stars fades to `rgba(255, 215, 0, 0.25)` (slightly brighter, as if the line "activates" to mark what's been completed)
- This gives the player a visual guide to the constellation shape without making it trivial
- Always rendered, not gated behind star_map item (star_map item effect can be retired or upgraded to show star names)

## CR-024: 游戏内控制按钮 (Sprint 12 approved)
Add three control buttons visible during gameplay:
- **暂停/继续 (Pause/Resume)**: top-left HUD area, icon ⏸/▶. On pause: overlay with "游戏暂停" text, dim canvas. Resume on click or pressing Escape.
- **重试 (Retry)**: in the pause overlay, button to restart current level from scratch (confirm dialog not needed — just restart immediately)
- **退出 (Exit)**: in the pause overlay, button to navigate back to level select (`__navigate('levels')`). Asks "确定退出?" with Yes/No inline (no browser dialog — styled inline confirmation).
- Keyboard shortcut: Escape toggles pause
- Design: the pause button itself is small (32px icon) and semi-transparent in the HUD corner; the overlay that appears on pause shows Retry + Exit as full-width styled buttons

## CR-025: 通关界面重设计 (Sprint 12 approved)
Complete screen layout overhaul — the user says "上方字体依旧过大，核心是介绍和图片":
- Remove or drastically shrink the top title/rating area — compress to a single line: "★★★ 关卡完成" in one row, max 48px height
- Make lore text the visual focus: at least 40% of screen height, large readable font (16px+), styled container
- Photo (if available): show one highlight photo from the constellation's photo array, above the lore, max 200px height, rounded corners
- Stats (coins, time, count): compact horizontal row, small text, below the single-line title
- Shop button: prominent "去商店 →" button at bottom, styled as a CTA (not just a text link)
- Overall: feels like an "unlock card" — photo + story is the reward, stats/buttons are secondary

## CR-026: UI组件全面精致化 (Sprint 12 approved)
All interactive components need polish to match premium game quality:
- Buttons: minimum 44px height, gradient fill (not flat color), rounded corners (12-16px radius), inset glow effect on hover (box-shadow inward), scale(1.03) on hover
- The "重试" and "退出" buttons specifically must be styled as proper game UI — gradient, icon+text, rounded
- Input focus states: glowing border
- All text labels on UI screens: proper hierarchy (section headers vs body vs caption sizing)
- Remove any default browser styling artifacts (outline, default button appearance)
- Every clickable element must have cursor:pointer and hover transition

## CR-027: 关卡选择难度指示器重设计 (Sprint 12 approved)
User reports "挑战关卡两排星 5个和3个 没看懂" — the current star rating display is confusing.
Replace the current 5-star difficulty indicator with:
- A single horizontal bar (progress-bar style) filled proportionally: difficulty 1 = 20%, 2 = 40%, 3 = 60%, 4 = 80%, 5 = 100%
- Color: difficulty 1-2 = green, 3 = amber, 4-5 = red
- Label: "难度" with the bar, no star rows
- Best-score stars (earned after completing) shown separately as "最佳: ★★★" in a different color (gold), clearly distinct from difficulty indicator
- The two rows (difficulty + score) should be clearly labeled so user knows what each means

## CR-028: 天文星图放大查看 (Sprint 12 approved)
The SVG star chart in gallery detail is too small (480px) and cannot be inspected in detail. Add a tap/click-to-expand behavior:
- Click on the star chart container → it expands to a full-screen overlay (modal)
- Modal: dark background, the SVG fills 90vmin, close button (✕) top-right corner
- SVG in modal: same data but rendered larger, all star labels legible
- Clicking outside the modal or pressing Escape closes it
- Hint text below the chart: "点击放大查看" in small grey text

## CR-029: 展厅图片轮播视觉增强 (Sprint 12 approved)
The photo carousel CSS effects are not visually impressive. Upgrade:
- Each photo card: rounded corners (16px), overflow hidden, subtle box-shadow (0 4px 24px rgba(0,0,0,0.6))
- On hover: scale(1.04) transform with transition, border glow (1px solid rgba(255,215,0,0.4))
- Card background when image is loading/missing: dark gradient placeholder with a star icon ✦ centered
- Credit text: semi-transparent overlay at bottom of card (position:absolute, bottom:0, gradient from transparent to rgba(0,0,0,0.7))
- Section header "天文摄影 · ASTROPHOTOGRAPHY": gold gradient text, with a thin gold border-bottom line
- If there are no photos for a constellation: show a styled empty state card "暂无图片" with a telescope icon

## CR-030: 关卡选择移除地名显示 (Sprint 12 approved)
User says scene location names in level select (dividers showing "特卡波湖·牧羊人小屋" etc.) are unnecessary — the surprise of backgrounds changing automatically is better.
Remove all scene divider location name labels from the level select screen. The scene dividers can remain as visual separators (a styled horizontal line or subtle gradient rule) but must NOT display any text. The background palette change when advancing to a new scene group is the natural discovery mechanism.

## CR-031: 道具系统功能修复 (Sprint 12 approved)
User reports items are not working. Investigate and fix all item activation issues:
- Verify item selection modal correctly populates with owned active items
- Verify key 1/2/3 actually activates the correct slot item during gameplay
- Verify star_magnet actually pulls stars toward net (visible effect)
- Verify net_speed actually increases net extension/retraction speed
- Verify shrink_debris actually reduces debris size on canvas
- Verify space_bomb actually clears debris from canvas
- Verify time_ext adds 20s to the timer
- Verify glove prevents time penalty when debris is caught
- Verify double_coins doubles the coin award on level complete
- Each fix must be QA-verified with observable evidence (before/after quantity check, visual confirmation)

---

## CR-032: 少女角色、垃圾、网兜使用网络真实图片 (Sprint 14 approved)
Replace all procedurally-drawn game assets with real images sourced via WebSearch (no copyright issues — use CC0/public domain/open license sources):
- **少女角色**: Find an anime-style girl character sprite (idle/throw/catch states) from itch.io free assets, OpenGameArt, or similar. If a suitable sprite sheet exists, use `drawImage`. Alternatively, find a high-quality anime girl PNG (transparent background) that fits the "star-chasing girl" aesthetic.
- **太空垃圾**: Replace the 4 hand-drawn debris types (meteor, satellite, rocket, cloth) with real images or high-quality sprites. Search for CC0 space debris / asteroid / satellite pixel art sprites.
- **网兜**: The net shape is confusing (users don't recognize it). Replace with a clear visual — either a found net/butterfly-net image or a significantly cleaner canvas drawing that looks unmistakably like a catching net.
- **天文摄影**: The current Wikimedia external URLs are broken/unreachable. Use WebSearch to find direct, accessible URLs for constellation astrophotography images. Test that URLs are actually reachable before embedding. Prioritize NASA apod.nasa.gov, ESA, or other reliable CDNs.
- Implementation: use `<img>` elements where appropriate, or `drawImage()` on canvas for game objects. Cache loaded images at startup.

## CR-033: 关卡失败界面改为仅重试，隐藏星座简介 (Sprint 14 approved)
On level fail (`showFail()`):
- Hide the lore section entirely (`.lore-title` and `.lore-text` invisible/empty, or lore container `display:none`)
- Hide the photo (`.constellation-photo` or equivalent)
- Show only: "时间到了！" title, caught/total stat, and "🔄 重试" + "返回选关" buttons
- The constellation story is the reward for WINNING, not failing. Seeing it on fail removes the incentive to try again.

## CR-034: 展馆需通关（胜利）才能解锁，而非仅开启关卡 (Sprint 14 approved)
Currently: a constellation's gallery detail unlocks when `state.isUnlocked(idx)` — i.e., when the level becomes available to play, not when it's beaten.
Change: gallery detail requires `state.hasCompleted(idx)` — only completions (winning a level) should unlock gallery viewing.
- Add `hasCompleted(idx)` to the state module that checks if a best-score > 0 (or a separate `completed` Set in localStorage)
- Update `gallery.js` to use this new check instead of `isUnlocked`
- This means completing level 1 unlocks level 2 to play AND unlocks constellation 1's gallery detail

## CR-035: 商店随时可进入 (Sprint 14 approved)
Add a shop entry point accessible at all times:
- Add a "🏪 道具商店" button to the main menu screen (alongside 挑战关卡 and 星座展厅)
- Add a "道具商店" shortcut button on the level select screen (top area, near the back button)
- The shop's back button should return to wherever the user came from (menu or levels), not always to levels

## CR-036: 暂停界面交互修复 (Sprint 14 approved)
The current pause UX is confusing:
- "返回游戏" button should resume the game directly (call `setPaused(false)`) — no confirmation dialog
- The "退出" button should show the confirmation (确定退出? Yes/No), but it should be clearly labeled "退出关卡" not "返回游戏"
- Pause overlay layout: clearly distinguish Resume (large primary button at top) vs Retry / Exit (secondary buttons below)
- Pause button and HUD elements must not overlap the level name text — pause button should be in top-right corner, not overlapping `.hud-level-name` (top-left)

## CR-037: 抓到垃圾改为减速拖拽，炸弹只炸当前垃圾 (Sprint 14 approved)
Change debris catch mechanic:
- When debris is caught: instead of instant 1-second time penalty, the net SLOWS DOWN during retraction (retract speed reduced to 30% normal). No time penalty is deducted immediately. Player can press space_bomb slot to destroy the held debris (freeing the net to swing again).
- `space_bomb` item effect changes: instead of clearing ALL debris on screen, it ONLY destroys the currently held debris (if any). If no debris is held, it has no effect (or clears the nearest debris as fallback).
- The `glove` item now prevents the slow-retract penalty (retract at normal speed when glove is active).
- Visual: during slow retract, show a brief shake animation or a red tint on the net to indicate "caught debris".

## CR-038: 道具槽允许同类型多个（最多3个同类） (Sprint 14 approved)
Change item selection logic:
- Currently: max 3 slots total, each slot must be a different item type
- New rule: a player may select the same item type multiple times, up to 3 slots. E.g., 3× space_bomb or 2× space_bomb + 1× time_ext are all valid.
- The item selection UI should show a quantity selector (+/-) per item rather than just click-to-select, or allow clicking the same item card 1/2/3 times to assign that many slots.
- Maximum 3 slots total still applies; same type counts as separate slots.

## CR-039: 关卡选择网格修复（6列×5行） (Sprint 14 approved)
The current grid shows 5 cards per row with a visual gap on the right (caused by scene-divider elements interrupting the grid flow).
- Remove the `.scene-divider` elements entirely from the grid flow — the background color change already communicates scene groups.
- Change CSS grid to `grid-template-columns: repeat(6, 1fr)` to produce 6 columns × 5 rows = 30 cards filling the grid cleanly.
- If scene separation is still desired, use a CSS `:nth-child` rule or a row-spanning visual separator that does not disrupt the 6-column grid layout.

## CR-040: 游戏内鼠标拖尾效果在游戏内生效 (Sprint 14 approved)
The star cursor trail (#star-cursor) stops working once the game screen is active (the canvas captures mouse events). Fix:
- Ensure the cursor trail JS (in main.js) continues to track `mousemove` events even when the game canvas is the active element
- The trail element should appear above the canvas (z-index higher than canvas)
- If the current implementation only works on non-canvas screens, extend it to work on ALL screens including the game canvas

## CR-041: 星星颜色含义说明 (Sprint 14 approved)
Users are confused by the different star colors (gold M-type vs blue A-type etc.) in the game canvas. Add a brief in-game tooltip or HUD label:
- Add a small "?" help button in the game HUD that, when clicked/hovered, shows a compact legend: "星星颜色代表恒星类型：蓝白色=高温星，金黄色=冷超巨星（如参宿四）"
- Alternative: show a brief toast/tip at game start (first time only, dismissible): "提示：所有颜色的星星都需要抓取 — 颜色代表恒星温度"
- This eliminates confusion about whether gold vs silver stars have different gameplay effects (they don't — all are equal targets)

## CR-042: 展馆返回按钮移至底部 (Sprint 14 approved)
In the gallery detail screen, the "← 返回展厅" button is currently at the top of the content. Move it to the bottom of the page, below the lore text section. A sticky bottom bar or a button at the very end of the scrollable content is acceptable.

## CR-043: 场景名称在进入时短暂展示 (Sprint 14 approved)
CR-030 removed all scene name text from the level select dividers. The user now clarifies they do NOT want location names shown in the level grid — but they DO want the scene transition (when entering a NEW scene group for the first time in a session) to show the location name briefly.
- The existing scene intro overlay (`#scene-intro-overlay` or similar) should show the NZ location name (e.g., "✦ 特卡波湖 · Lake Tekapo") as a brief cinematic overlay when transitioning into a new scene group for the first time.
- This is already partially implemented for scene-change intros — ensure the location name text is visible and prominent in that overlay (not hidden or removed by CR-030).

## CR-044: 背景音乐丰富化 (Sprint 14 approved)
The current 4-chord Am-F-C-G sine-wave loop is too monotonous. Enrich it:
- Add a second melodic layer: a simple pentatonic melody (single notes) that plays over the chord progression, using a softer instrument (triangle or soft sine with more reverb/delay simulation via Web Audio)
- Add subtle variation: occasionally drop a chord beat, add a brief pause, or vary the rhythm slightly so it doesn't feel like a metronome
- Add a "twinkling" high-register arpeggio layer (random notes from the pentatonic scale, very soft volume) to create a starfield ambience feel
- The overall character should remain ethereal/space-like but feel alive rather than mechanical

## CR-045: 少女角色重绘 (Sprint 15 approved)
The procedural canvas girl character looks like a stick figure. Redesign with better anime-style proportions: larger head (anime 1:4~1:5 head-body ratio), more expressive face details, better hair layering with highlights, natural standing pose with pose variation for throw/catch states. Keep purple color scheme.

## CR-046: 网兜视觉重绘 (Sprint 15 approved)
The net needs to be more visually clear: larger hoop ring (mouthR 18→26), more mesh lines (4→6), thicker line weights, better color contrast against dark sky. Also reduce net extension speed (netSpeed 0.025→0.014) per user feedback that it's too fast.

## CR-047: 星星抓/未抓视觉区别 (Sprint 15 approved)
Uncaught stars: larger (r*1.8 visual), bright gold/white, prominent twinkling. Caught stars: smaller (r*0.5), dim (alpha 0.25). Remove multi-color star type system — all stars display as warm white/gold (#fff8e0/#ffd700) to eliminate confusion about gameplay meaning of colors. Remove star color hint toast.

## CR-048: 游戏交互精修 (Sprint 15 approved)
Multiple gameplay fixes: (1) block accidental net launch on level entry by delaying click listener 300ms; (2) fix pause button icon — should be ⏸ after resuming; (3) change scene intro to use sessionStorage so it shows every session; (4) debris size variation (large r:22-32 with retractMult 0.15, small r:12-18 with retractMult 0.3); (5) replace star_magnet item with net_enlarge (网兜扩大, 15s口径+50%, icon 🪢, price 60).

## CR-049: 展厅/商店UI修复 (Sprint 15 approved)
(1) Gallery: locked cards show only grey + "？" (no icon/name); unlocked-incomplete cards show name only, no icon; (2) Gallery detail: remove top back button, keep only bottom back button; (3) Shop cards: add visible default background color; (4) Pause exit button: add visible default background.

## CR-050: 网兜静止可见 (Sprint 17 approved)
Net (网兜) is invisible at rest — only appears when Space is pressed. Fix: net should always be visible at its idle/swing position, not require input to appear. The hoop and mesh should be drawn continuously each frame regardless of whether the player has pressed Space.

## CR-051: 星星尺寸缩小 + 上下限 (Sprint 17 approved)
Stars are too large. Reduce all star radii to 2/3 of current values. Add hard caps: minimum radius and maximum radius. Use Ursa Major (Level 2, 大熊座) star proportions as the reference for a good size range — its current min/max define the new target. Stars should then scale within those new bounds according to each constellation's relative proportions.

## CR-052: 失败界面布局修复 (Sprint 17 approved)
The fail screen ("时间到了") layout is cramped/squished. Fix the layout so elements are properly spaced and the screen feels as polished as the complete screen. Lower portion of screen (currently empty dead space per Sprint 16 VU observation) should include a brief encouragement message or constellation silhouette.

## CR-053: "返回关卡"按钮背景色 (Sprint 17 approved)
On the level complete screen, the "返回关卡" / "返回选关" button has no background color (appears transparent). Add a visible default background color consistent with other CTA buttons in the app.

## CR-054: 背景音乐重制 (Sprint 17 approved)
Current background music sounds like 2 tracks merged poorly — incoherent and not fitting. Rework the audio synthesis to produce a single coherent ethereal/space-like track: softer, more spacious, atmospheric. Research Web Audio API synthesis techniques for ambient/ethereal music. Avoid the feel of two separate tracks playing simultaneously.

## CR-055: 金币系统重设计 (Sprint 17 approved)
Rework the coin reward system: (1) Starting balance = 100 coins (one-time initialization if no saved balance exists); (2) Fail = 0 coins awarded; (3) Success = time_remaining × 10 coins; (4) If a level was already cleared with 3 stars and player clears it again, award only half coins. The goal is to reward skill and first-clears more than grinding.

## CR-056: 关卡资源预加载 (Sprint 17 approved)
Entering a level shows a blank canvas initially — game content appears after a delay. Add asset preloading so all required sprites/images for the level are loaded before the game canvas renders, eliminating the blank-canvas flash on level entry.

## CR-067: 网兜绳起点对齐角色手部 (Sprint 21 approved)
_updateHandPos() rewritten to use exact SVG sprite hand coordinates (derived from girl.svg frame geometry) instead of procedural body estimates. All 3 states (idle/throw/catch) now anchor the rope base precisely to the character's right hand pixel position.

## CR-068: 展厅天文摄影预加载修复 (Sprint 21 approved)
Added persistent module-level _prewarmedImages array in levels.js to prevent GC of preloaded Image objects. Added <link rel="preconnect"> and dns-prefetch for cdn.esahubble.org so TLS handshake happens before user opens gallery.

## CR-069: 关卡精灵图立即渲染 (Sprint 21 approved)
Replaced Promise.race([preload, 50ms timeout]) with Promise.all using img.decode() — this resolves instantly when sprites are already in browser cache (from HTML preload hints), eliminating blank-canvas flash on level entry. Added <link rel="preload"> for all 6 sprite SVGs in index.html.

## CR-070: 地理定位星空主页 (Sprint 24 approved)
Main menu background dynamically shows constellations visible from the user's current geographic location and local time. Uses Geolocation API (with fallback to New Zealand if denied). Renders 4-6 constellation outlines as animated, softly glowing star patterns on the existing starfield canvas. Stars twinkle with phase-offset sine animations. Shows a subtle label "当前星空" or season name.

## CR-071: 全通成就页 (Sprint 24 approved)
After completing all 30 levels, a "全天星图" achievement screen appears. Shows all 30 constellation outlines arranged on a hemisphere-like projection, each glowing gold when completed. A "100% Starcatcher" badge animates in. Reachable from main menu after full completion. Q4 boundary: when level 30 completes, navigate to this achievement screen instead of showing a dead "下一关" button.

## CR-072: 15秒开场动画 (Sprint 24 approved)
On first-ever visit (once, stored in localStorage), a 15-second intro cinematic plays before the main menu: a net sweeps across a starfield, catches a star, constellation lines light up one by one with musical notes. Skip button available. Uses existing Canvas/audio infrastructure.

## CR-073: 失败屏幕改善 (Sprint 25 approved)
Fail screen lower area shows: (1) a brief contextual encouragement line specific to the constellation (e.g. "猎户座跑得太快了！") + generic retry prompt, (2) the constellation's full line pattern rendered as a dim silver silhouette (already partially implemented via _drawFailConstellation — enhance it). Lore remains hidden (reward for winning only).

## CR-074: 道具选择情境推荐 (Sprint 25 approved)
In the item-select overlay, add a single-line recommendation banner above the item grid: maps level difficulty to a suggested item. Difficulty 4-5 → "建议携带：时间延长"; difficulty 3 → "建议携带：网兜加速"; difficulty 1-2 → "初级关卡，轻装上阵！". Static text, no dynamic logic beyond difficulty lookup.

## CR-075: 星座故事分段翻页 (Sprint 25 approved)
On the level complete screen, the lore text is displayed in paginated segments (2-3 sentences per page) instead of a scrollable block. Navigation: "下一段 ›" button advances pages; on last page button becomes "完成 ✓". Page indicator (1/3 etc.) shown. Improves reading engagement during the celebration state.

## CR-076: 动态背景音乐 (Sprint 25 approved)
When game timer drops to ≤15 seconds, the background music playback rate gradually increases from 1.0x to 1.35x using Web Audio API's playbackRate ramp. When timer is above 15s or game ends, rate returns to 1.0x. Creates urgency without changing the chord pattern.

## CR-077: 标签页切换自动暂停 + 状态机边界修复 (Sprint 25 approved)
Two fixes bundled: (1) Add visibilitychange event listener in game screen: when document becomes hidden, auto-pause the game (same as pressing pause button). (2) Fix net state machine rapid-click bug: add a minimum-extend-duration guard (100ms) so rapid Space/click cannot cause the net to enter an inconsistent state between extending and retracting.

## CR-078: localStorage静默降级 (Sprint 25 approved)
Verify storage.js try-catch covers all read/write paths. Any localStorage exception must be caught silently — game continues with in-memory state only, no error thrown to console or user. Add a module-level _storageAvailable flag that is set on first save attempt; if false, all subsequent save calls are no-ops.

## CR-079: 封面单星座聚焦 — 最易见星座作为主背景 (Sprint 26 approved)
Replace the current multi-constellation scattered overlay (4-6 small constellations in fixed zones) with a single-constellation featured display: (1) Read user's geolocation + current time → compute which constellation has the highest altitude (most easily visible now); (2) Render that ONE constellation large and centered on the menu canvas background — occupying ~50-60% of screen height, softly glowing, twinkling; (3) Show an info panel on the menu telling the user: constellation name (Chinese + English), a brief "如何找到它" tip (1-2 sentences drawn from bestViewMonth + mainStars + region fields already in constellations.js data), and current altitude in degrees; (4) Remove the bottom-right multi-constellation label; (5) Fallback: if geolocation denied, use Lake Tekapo default and show "📍 默认：新西兰特卡波" in the panel. The info panel should be styled as a glass-morphism card, positioned at the bottom of the menu, above the deco line, non-intrusive but readable.
