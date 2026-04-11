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
