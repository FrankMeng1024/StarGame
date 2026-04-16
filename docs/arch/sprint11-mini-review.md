# Arch Code Review — Sprint 11-mini

**Sprint**: Sprint 11-mini  
**Verdict**: PASS  
**Date**: 2026-04-16

## Issues

| Severity | Description | Story |
|----------|-------------|-------|
| Medium | Photo URLs use Wikimedia Commons thumbnail CDN (upload.wikimedia.org/wikipedia/commons/thumb/) which is rate-limited (HTTP 429 at scale). The HTML5 branch already migrated to ESA Hubble CDN for this reason. gallery.js `_loadPhoto()` correctly handles `onerror` by showing "暂无图片", so this is not a blocker — but intermittent failures may occur under load. | STORY-00240 |

## Spec Drift

None.

## Review Notes

**STORY-00239 (完成✓ fix)**: Correct. `_onTouchEnd()` `else` branch sets `_lorePages = []` + `_lorePage = 0`, collapsing lore and revealing action buttons on next render. Logic is sound.

**STORY-00240 (gallery photo)**: Implementation is sound. `wx.createImage()` used correctly with async onload/onerror guards. `_photoForIdx` prevents stale callbacks. Photo state reset in all 3 navigation paths and `_cleanup()`. `_computeDetailHeight()` updated for photo area. Graceful fallback at every code path.

**Security**: No issues. All URLs are HTTPS to public-domain sources. No user input involved.
