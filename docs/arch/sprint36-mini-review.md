# Arch Code Review — Sprint 36-mini

**Sprint**: 36-mini  
**Verdict**: PASS (after fix)  
**Reviewer**: Arch subagent (claude-opus-4-6)

## Issues Found

| Severity | Description | Story | Status |
|---|---|---|---|
| Critical | Rope origin mismatch: `_updateNetHead` used `(+14, -62)` but `_drawNet` used `(+18, -75)`. Physics collision would differ from visual position by 4px/13px. | STORY-00321 | **FIXED** — both now use `(+18, -75)` |
| Medium | Dead `_drawBadge` function in shop.js retained with "backward compat" comment, never called. | STORY-00320 | **FIXED** — removed |

## Spec Drift

- Shop card gradient (`rgba(12,8,40)→rgba(20,14,60)`) intentionally darker than UI_SPEC `--card` — per Story spec. **Confirmed OK**.
- Buy button purple gradient (`#5533aa→#8855ee`) replaces old green gradient. Aligns with `--primary #7c5cbf`. **Confirmed OK**.
- Girl character 90×145 anchored at `(_poleX, H*0.87)`, no overflow risk. **Confirmed OK**.
- Result overlay new sizing (cardH=min(H-20,360), btn 36px, text sizes 22/13/14px) — consistent with mobile canvas design. **Confirmed OK**.

## Summary

All three stories are visual-only changes: no logic changes, no state mutations, no API contract changes, no security issues. After fixing the rope origin and removing dead code, all changes are clean and compliant.
