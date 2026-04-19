# Sprint 28-mini — Sprint Goal

**Sprint**: Sprint 28-mini
**Branch**: mini
**Date**: 2026-04-19
**Acceptance Mode**: auto (Virtual User gate ≥ 9.5/10)

## Goal
真实测试验收之前未经实机截图验证的Sprint，并修复对比原HTML游戏发现的功能差异：移除主菜单成就按钮、修复道具商店（价格+star_map道具）、修复时间延长道具效果、新增主菜单星座信息面板。

## Background
Sprint 23-mini / 24-mini / 25-mini 的QA验收均通过代码路径分析完成，没有真实截图证据。本Sprint：
1. 通过真实截图对比Web版，发现并修复所有实质性功能差异
2. 所有修改必须通过SPIKE-002 mss_navigate.py实机截图验证

## Stories
| Story | Source | Title | Points | Owner |
|---|---|---|---|---|
| STORY-00295 | MF-002 | 移除主菜单"通关成就"按钮 | 1 | Frontend Dev |
| STORY-00296 | MF-005/006 | 修复道具商店：价格对齐Web版 + 替换star_magnet为star_map | 3 | Frontend Dev |
| STORY-00297 | MF-011 | 修复时间延长道具效果：+15s → +20s | 1 | Frontend Dev |
| STORY-00298 | MF-003 | 主菜单新增星座信息面板（对标Web版） | 3 | Frontend Dev |

**Total**: 8 points across 4 stories.
