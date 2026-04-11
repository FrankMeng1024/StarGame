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
