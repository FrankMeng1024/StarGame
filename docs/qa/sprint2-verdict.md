# QA Verdict — Sprint 2

**Sprint**: 2
**Date**: 2026-04-10
**QA subagent**: claude-opus-4-6
**Verdict**: PASS

---

## Per-Story Results

| Story | Verdict | Confidence | Notes |
|---|---|---|---|
| STORY-00005 (Shop) | PASS | HIGH | 8 items rendered; coin balance reflects loaded state (150); purchase deducts correctly (150→130); owned badge appears after buy; buttons disabled when coins < price |
| STORY-00006 (Gallery) | PASS | HIGH | 30 cards in grid; 1 unlocked (Orion); locked cards show 未探索 silhouette; detail shows icon, ZH/EN name, lore text; back nav returns to gallery grid |
| STORY-00007 (Complete/Fail stats) | PASS | HIGH | Complete: caught=7/7, time=45秒, coins=450枚, lore title+text populated. Fail: title "时间到了", caught=3/7, elapsed=67秒, coins=0枚 — all stats accurate, no "—" or "0秒" |
| STORY-00008 (Tutorial hint) | PASS | HIGH | Hint visible on first game load (display:block, no hint-fade-out class, hintSeen=null at t=300ms); 5s auto-dismiss fires correctly; sessionStorage gate works on repeat visits |
| STORY-00009 (Navigation) | PASS | HIGH | All 5 screens (menu, levels, gallery, shop, complete) navigate TO and BACK correctly; 0 console errors throughout |

---

## Bugs Found

### BUG-001 (Critical — Fixed before verdict)
**ES module split-state**: `main.js` imported `state.js?v=N` while all screen modules imported `state.js` (no version), creating two separate singleton instances. `state.load()` populated the versioned instance; shop/gallery read from the unversioned instance (coins=0). All buy buttons showed disabled regardless of actual balance.

**Fix**: Removed version suffixes from all internal imports in `main.js`; version suffix kept only on `<script src="main.js?v=6">` entry point in `index.html`. Single module instance confirmed (`js/state.js` only in resource timing).

### BUG-002 (Medium — Fixed before verdict)
**Hint premature dismiss**: Tutorial hint dismissed immediately after level card click. Root cause: `setTimeout(fn, 5000)` timer reference stored in `_hintTimer` was cleared by `stopGame()`, but stale timer closures from previous `_showHint()` calls still held direct references to `_dismissHint`. Also: `skipNext` flag approach failed because Playwright's event dispatch sequence triggered the capture listener before the flag could protect it.

**Fix**: Generation counter (`_hintGeneration`) incremented on each `_showHint()` call; timer callback and click listener both check `_hintGeneration === gen` before acting. Click listener registration deferred via `setTimeout(0)` to ensure it is added after the triggering card-click event fully dispatches.

---

## Navigation Regression

| Screen | TO | AWAY→BACK | Console errors |
|---|---|---|---|
| menu | screen-menu ✓ | ✓ | 0 |
| levels | screen-levels ✓ | ✓ | 0 |
| gallery | screen-gallery ✓ | ✓ | 0 |
| shop | screen-shop ✓ | ✓ | 0 |
| complete | screen-complete ✓ | ✓ | 0 |

Total console errors during full test session: **0**

---

## Evidence Files

| File | Story | Description |
|---|---|---|
| STORY-00008-hint-visible.png | STORY-00008 | Hint pill visible above character, game running |
| STORY-00005-shop-01.png | STORY-00005 | Shop with 150 coins, all buttons enabled |
| STORY-00005-shop-purchase.png | STORY-00005 | After buying 星图揭示 (20c): balance=130, owned badge shown |
| STORY-00005-shop-02-with-owned.png | STORY-00005 | Shop after purchase, owned badge persists |
| STORY-00006-gallery-grid.png | STORY-00006 | Gallery 30-card grid, 1 unlocked |
| STORY-00006-gallery-detail.png | STORY-00006 | Orion detail: icon, ZH/EN name, lore text |
| STORY-00007-complete.png | STORY-00007 | Complete screen with accurate stats + lore |
| STORY-00007-fail.png | STORY-00007 | Fail screen with accurate caught/elapsed stats |
| STORY-menu-01.png | — | Menu screen baseline |
| STORY-00001-menu.png | — | Menu |
| STORY-00002-levels.png | — | Level select |

---

## Untested Paths

- Game canvas actual gameplay (net firing, star catching) — requires real user interaction; engine loop verified running via HUD timer countdown
- Shop "back to levels from shop" button (navigation wired to levels)
- Complete screen "next level" and "back to levels" buttons
- Gallery locked card click (correctly non-interactive)

---

## Knowledge Updates

- ES module version suffixes on internal imports create duplicate singleton instances — only version the entry point
- `browser_evaluate` immediately after `browser_click` synthesizes an extra event that can trigger capture-phase listeners — use `browser_run_code` for atomically sequenced test steps
- State key is `starcatcher_save`; structure: `{ unlockedLevels: [], levelScores: {}, coins: N, inventory: {} }`
- Shop card selector: `.shop-card`; buy button: `.shop-buy-btn`; disabled state: both `disabled` attribute AND `.disabled` class
- Gallery unlocked cards: `.gallery-card.unlocked`; locked: `.gallery-card.locked`
