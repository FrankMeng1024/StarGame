# Arch Code Review — Sprint 1-mini

**Verdict**: PASS  
**Sprint**: Sprint 1-mini  
**Reviewer**: Arch subagent (claude-opus-4-6)

## Issues

| Severity | Description | Story |
|----------|-------------|-------|
| Medium | `auth.js` returns `detail: e.message` in error response — wx error messages (errcode, rid) are safe to forward, but unexpected internal errors should not expose `e.message`. Recommend only forwarding detail when `isWxError=true`. | STORY-00205 |
| Medium | `isWxError` check uses `e.message.startsWith('wx error')` string prefix convention — fragile if wx SDK error format changes. Consider matching numeric errcode if available. | STORY-00205 |

## Spec Drift Confirmed Fixed

| Fix | Confirmed |
|-----|-----------|
| globals.js: `export let` → `export const G = {}` — now matches API_SPEC G object contract | ✅ |
| levels.js: CARD_W/CARD_H moved from module top to `_computeLayout()` — runtime correctness fix | ✅ |
| Entry point: `app.js` → `game.js`, game.json workers field removed — WeChat platform compliance | ✅ |

## Summary

All changes are correct and contract-compliant. Two Medium hardening issues noted for backlog. No Blockers or Criticals.
