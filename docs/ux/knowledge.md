# UX Knowledge — 星捕少女 (StarCatcher)

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
