# SPIKE-001: 微信小游戏稳定测试管道

**Sprint**: Sprint 27  
**Status**: Done  
**Conclusion**: VIABLE

## 测试内容

| 项目 | 目标 | 结果 |
|------|------|------|
| hwnd 动态发现 | 不硬编码，枚举 wechatdevtools.exe 进程自动查找 | ✓ PASS |
| mss 截图稳定性 | 非全黑（亮度 > 10），自动重试 3 次 | ✓ PASS 亮度=37.9 |
| GLM-4V 图像分析 | 识别 screen_type + visible_elements JSON | ✓ PASS `glm-4v-flash` |
| GLM web_search | 可搜索外网解决技术问题 | ✓ PASS |

## 命令

```bash
# 探针测试（一次性验证四项）
python scripts/probe_spike.py

# Sprint 开始截图管道检查
python scripts/mss_check.py --sprint 27

# GLM-4V 分析截图
python scripts/glm_analyze.py docs/qa/sprint27-evidence/mss-check.png
```

## 详细结果

### hwnd 自动发现
- 方法：`EnumWindows` + `tasklist` 按 PID 过滤 `wechatdevtools`
- 发现：`hwnd=1312814`，标题 `Star - 微信开发者工具 Stable v2.01.2510290`
- 每次 DevTools 重启 hwnd 会变，脚本每次运行时动态查找，无需手动更新

### mss 截图
- 模拟器比例坐标（相对窗口）：x=71%, y=8%, w=27%, h=78%
- DevTools 窗口：(100,0) 1180x800 → 模拟器区域 (937,64) 318x624
- 亮度=37.9（非全黑验证通过）
- 截图文件：`docs/spike-results/probe-screenshot.png`

### GLM-4V 图像分析
- 模型可用性：`glm-4v-flash`（免费）✓ / `glm-4v`（余额不足）/ `glm-4v-plus`（余额不足）
- 识别结果准确：道具选择界面被正确识别为 `pre_level（关卡前道具选择）`
- 可见元素、文字内容、视觉问题均正确提取

### GLM web_search
- `glm-4-flash` + `web_search` 工具可调用外网搜索
- 可用于 QA subagent 或 main agent 搜索技术问题

## 结论

**VIABLE** — 以下能力可 100% 无人工干预运行：
1. `scripts/mss_check.py` — Sprint 开始截图管道强制验证
2. `scripts/glm_analyze.py` — GLM-4V 辅助截图内容分析
3. GLM web_search — 外网技术搜索

## 后续 Story
- SPIKE 通过，`scripts/mss_check.py` 和 `scripts/glm_analyze.py` 已部署
- CLAUDE.md 已更新小游戏截图完整性强制规则（7 条）
- `mp_qa_runner.js` 的截图逻辑改造留待后续 Sprint 评估
