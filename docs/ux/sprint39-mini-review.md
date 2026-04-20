# UX Review — Sprint 39-mini

**Sprint**: 39-mini
**Date**: 2026-04-20
**Confidence**: MEDIUM (code-path review — screen locked during session)

## Friction Items

None identified at code level. Visual confirmation pending next session.

## Feature Analysis

### STORY-00329: Shop card description text
- Desc line at y+57 creates clear visual hierarchy: icon → name → desc → badges → price+button
- 10px font at rgba(255,255,255,0.60) provides secondary text differentiation from name (13px bold)
- Truncation with "…" prevents overflow at card width — no text clipping outside bounds
- CARD_H 100→116 gives adequate breathing room for 5 layout rows
- **UX risk**: 10px font may be small at 150% DPI — could be marginal legibility. Not a blocker (desc is supplementary info).

### STORY-00330: Gallery card emoji icons
- Emoji at h*0.35 + name at h*0.65 creates balanced vertical layout with clear separation
- min(18, w*0.30) sizing is proportional to card width — adapts to COLS=5 layout
- Locked cards unchanged (show "？") — consistent with existing convention
- **UX risk**: WeChat Canvas emoji rendering varies by device OS. If emoji renders as box, falls back to showing nothing visible (c.icon || '' is silent). Not a blocker — name still present.

### STORY-00331: Star name labels in gallery detail
- Bright stars only (mag≤2.5, max 5) — avoids label clutter
- 9px font is legible for supplementary annotation at chart scale
- Anti-overlap prevents label pile-up on dense constellations
- Labels clipped by existing chart circle — no overflow outside chart boundary
- Dashed pointer line (setLineDash([2,2])) visually connects label to star dot

### STORY-00332: Astrophotography photo carousel
- wx.downloadFile → tempFilePath is the correct WeChat API pattern — avoids domain whitelist issues
- "天文摄影 · ASTROPHOTOGRAPHY" section header sets context before carousel
- Fallback to wx.createImage(url) direct if downloadFile fails — double-layer resilience
- "📷 暂无图片" placeholder for error state — user knows system tried and failed
- 5s/8s timeouts prevent infinite loading state

## Navigation Regression
Not applicable — gallery.js and shop.js are Canvas screens with no SPA routing. State transitions managed by screen switch functions, not URL navigation.

## Knowledge Updates
- Shop CARD_H is now 116 (was 100). Layout order: icon(y+22) → name(y+42) → desc(y+57) → badges(y+74) → button(near bottom)
- Gallery cards now show emoji icon above 2-char name. Locked cards unchanged.
- Gallery detail shows up to 5 bright-star name labels with dashed pointer lines inside chart clip area
- Gallery detail photo loading uses wx.downloadFile primary + direct URL fallback
- Gallery detail shows "天文摄影 · ASTROPHOTOGRAPHY" header when constellation has photos
