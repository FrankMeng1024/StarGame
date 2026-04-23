# SPIKE-001: 微信小游戏稳定测试管道

**Epic**: Infrastructure  
**Sprint**: Sprint 27  
**Points**: 2  
**Owner**: Arch / DevOps  
**Status**: Done

## Description

As QA/UX/VU roles in the agile workflow, we need a reliable, zero-human-intervention screenshot pipeline for the WeChat mini-game (pure Canvas, no WXML), so that all visual evidence comes from real runtime, not code diffs.

## Acceptance Criteria

- [x] hwnd auto-discovered without hardcoding — `scripts/mss_check.py` uses `EnumWindows` + process filter
- [x] mss screenshot non-black (brightness > 10) — validated with retry logic
- [x] GLM-4V (`glm-4v-flash`) accepts base64 image and returns `screen_type` JSON
- [x] GLM web_search tool available for external technical searches
- [x] `scripts/mss_check.py --sprint N` runs and exits 0 on success
- [x] `scripts/glm_analyze.py <path>` returns structured JSON with `screen_type`
- [x] CLAUDE.md updated with 7 mandatory screenshot integrity rules

## Notes

- `glm-4v-flash` is free tier and works. `glm-4v`/`glm-4v-plus` require paid balance.
- Simulator region ratio: x=71%, y=8%, w=27%, h=78% of DevTools window (calibrated on 1180x800 window)
- See `docs/spike-results/SPIKE-001-miniprogram-stable-qa.md` for full details
