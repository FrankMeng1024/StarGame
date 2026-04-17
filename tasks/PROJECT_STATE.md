# PROJECT_STATE.md — 追星少女 (StarCatcher)

**Status**: COMPLETE
**Current Sprint**: 32 (Sprint Goal: 关卡加载极速化 — 消除进关等待，任何关卡直接可玩)
**Last Updated**: 2026-04-17

> **Mini branch current**: Sprint 18-mini COMPLETE — 视觉全面升级（滚动/刘海屏/角色/比例），VU pending re-evaluation

## Sprint History
| Sprint | Status | Goal |
|---|---|---|
| Sprint 0 | COMPLETE | Foundation — docs, tech stack, UI spec |
| Sprint 1 | COMPLETE | 核心游戏可玩 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 2 | COMPLETE | 道具商店 + 星座展厅 (QA PASS, UX no Blockers) |
| Sprint 3 | COMPLETE | 完善游戏完整度：难度时限、星评、商店UX (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 4 | COMPLETE | 道具生效：item effects in gameplay (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 5 | COMPLETE | 感官完整度：audio, high score, UX polish (QA PASS, UX no Blockers, Arch PASS after 4 fixes) |
| Sprint 6 | COMPLETE | 场景完整度 — 6 NZ scene backgrounds (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 7 | COMPLETE | 展厅完整度 + 场景体验打磨 (QA PASS, UX no Blockers, Arch PASS after 2 fixes) |
| Sprint 8 | COMPLETE | VU closure — gallery metadata + menu mute (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 9 | COMPLETE | VU content closure — SVG star chart + full lore text (QA PASS, UX no Blockers, Arch PASS, VU ACCEPTED 9.5/10) |
| Sprint 10 | COMPLETE | 核心体验升级：改名、摆速、连线保持、背景地景、道具重设计、场景介绍修复 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 11 | COMPLETE | 视觉精修：碎片升级、通关界面、画廊轮播、角色升级、全局视觉+过渡 (QA PASS, UX no Blockers, Arch PASS, VU ACCEPTED 9.5/10) |
| Sprint 12 | COMPLETE | 游戏体验修复：连线显示、垃圾旋转、网兜形状、暂停系统、通关界面重设计、场景分界线 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 13 | COMPLETE | 道具系统修复 + 角色升级 + UI精致化 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 14 | COMPLETE | 游戏体验全面提升 (CRs 032-044) (QA PASS, UX no Blockers, VU ACCEPTED 9.5/10) |
| Sprint 15 | COMPLETE | 角色/网兜/星星视觉重绘 + 交互精修 + 展厅/商店UI修复 (QA PASS, UX no Blockers, Arch PASS, VU ACCEPTED 9.6/10) |
| Sprint 16 | COMPLETE | 图片精灵替换全角色资源 + 星座点亮动画 + 展厅/UI修复 (QA PASS, UX no Blockers, VU ACCEPTED 9.5/10) |
| Sprint 17 | COMPLETE | 7项用户反馈修复 — 网兜显示/星星大小/失败界面/按钮背景/金币系统/预加载/音乐 |
| Sprint 18 | COMPLETE | 8项用户反馈修复 — 网兜手持/展厅顺序/照片修复/展厅导航/道具重置/音乐恢复/暂停图标/星星放大 |
| Sprint 19 | COMPLETE | Sprint 19 — VU ACCEPTED 9.5/10 (Sprint 18 features verified) |
| Sprint 20 | COMPLETE | 6项用户反馈修复 — 网兜手部对齐/摆角扩大/星星缩小/展厅布局重排/照片预加载/关卡资源预热 |
| Sprint 21 | COMPLETE | 3项用户反馈修复 — 网兜绳起点对齐手部/展厅图片预加载/关卡精灵图立即渲染 |
| Sprint 22 | COMPLETE | 2项用户反馈修复 — 网绳路径闪烁修复/关卡加载延迟消除 |
| Sprint 23 | COMPLETE | 2项用户反馈修复 — 网绳发射起点与摆动位置一致/关卡精灵图全时段即时渲染 |
| Sprint 24 | COMPLETE | 活的星空 — 地理定位星空主页/全通成就页/开场动画 (CR-070/071/072) |
| Sprint 25 | COMPLETE | 情绪节点打磨 — 失败/道具/故事/音乐/Tab暂停/storage降级 (CR-073-078) |
| Sprint 26 | COMPLETE | 封面单星座聚焦 — 最易见星座大背景 + 观测提示面板 (CR-079) |
| Sprint 27 | COMPLETE | 封面精修 — 随机fallback星座/全屏背景/去成就按钮 (CR-080) |
| Sprint 28 | COMPLETE | 封面全背景重设计 — 星座上半屏+UI浮层，消除分割感 (CR-081) |
| Sprint 29 | COMPLETE | 三栏布局探索 — 评估后保留Sprint 28居中方案 (CR-082) |
| Sprint 30 | COMPLETE | 开场动画精修 + 封面居中修复 + 按钮透明度调整 (CR-083) |
| Sprint 31 | COMPLETE | 封面体验全面精修 — 流星雨开场 + 星座上移放大 + 信息栏优雅化 (CR-084) |
| Sprint 32 | COMPLETE | 关卡加载极速化 — decode Promise缓存复用 + 开场动画F5播放 (CR-085/086) |

## VU Acceptance History
| Sprint | Score | Verdict | Gap |
|---|---|---|---|
| Sprint 7 | 9.3/10 | NOT ACCEPTED | Gallery metadata missing, mute button missing from menu |
| Sprint 8 | 8.5/10 | NOT ACCEPTED | Real astrophotography missing (F-007), lore text too short (~215 chars vs 500-800字) |
| Sprint 9 | 9.5/10 | ACCEPTED | All PRD Must-Have features delivered |
| Sprint 11 | 9.5/10 | ACCEPTED | All PRD + CR features delivered — PROJECT COMPLETE |
| Sprint 13 | 9.5/10 | ACCEPTED | All PRD + CR (001-031) features verified — PROJECT COMPLETE (final iteration) |
| Sprint 14 | 9.5/10 | ACCEPTED | All PRD + CR (032-044) features verified — PROJECT COMPLETE |
| Sprint 15 | 9.6/10 | ACCEPTED | All Sprint 15 user-reported issues resolved — PROJECT COMPLETE |
| Sprint 16 | 9.5/10 | ACCEPTED | All Sprint 16 SVG sprites, constellation reveal, UI fixes verified — PROJECT COMPLETE |
| Sprint 17 | 9.5/10 | ACCEPTED | All Sprint 17 user-reported fixes verified — PROJECT COMPLETE |
| Sprint 18 | 9.5/10 | ACCEPTED | All Sprint 18 user-reported fixes verified — PROJECT COMPLETE |
| Sprint 19 | 9.5/10 | ACCEPTED | All Sprint 18+19 features verified — PROJECT COMPLETE |
| Sprint 20 | 9.5/10 | ACCEPTED | All Sprint 20 user-reported fixes verified — PROJECT COMPLETE |
| Sprint 25 | 9.6/10 | ACCEPTED | All PRD + CR-070-078 features verified — PROJECT COMPLETE |
| Sprint 26 | — | COMPLETE | CR-079 单星座封面 — committed, not VU-evaluated |
| Sprint 27 | — | COMPLETE | CR-080 封面精修 — committed, not VU-evaluated |
| Sprint 28 | — | COMPLETE | CR-081 封面全背景重设计 — committed |
| Sprint 29 | — | COMPLETE | CR-082 三栏布局探索 — explored, reverted to Sprint 28 centered layout |
| Sprint 30 | — | COMPLETE | CR-083 开场动画精修 + 封面居中 + 按钮透明度 — committed |
| Sprint 31 | — | COMPLETE | CR-084 流星雨开场 + 星座上移 + 信息栏优雅化 — committed |

| Sprint 32 | — | COMPLETE | CR-085/086 关卡加载极速化 + 开场动画F5播放 — committed |
| Sprint 7-mini | 9.5/10 | ACCEPTED | 微信小游戏 mini branch — All PRD Must-Have features verified — PROJECT COMPLETE |
| Sprint 11-mini | 9.0/10 | NOT ACCEPTED | F-007 gallery carousel missing — only 1 static photo per constellation |
| Sprint 12-mini | 9.5/10 | ACCEPTED | 展厅多图轮播 — carousel implemented, 3 photos per constellation — PROJECT COMPLETE |
| Sprint 13-mini | 9.5/10 | ACCEPTED | 展厅5张图片达PRD最低要求 + lore完成按钮确认 — PROJECT COMPLETE |
| Sprint 17-mini | 9.5/10 | ACCEPTED | 全功能验收 — F-001~F-008全部通过 + 开场动画/星图/HUD槽/横屏/SFX等CRs — PROJECT COMPLETE (final) |

## 微信小游戏分支（mini branch）

**Status**: COMPLETE — VU ACCEPTED 9.5/10 (2026-04-17). All PRD Must-Haves (F-001~F-008) delivered and verified across Sprints 1-16 mini. Sprint 17-mini VU acceptance confirms full product quality with intro animation, gallery star charts, in-game item HUD, landscape orientation, SFX, achievement screen, and difficulty bars all verified. PROJECT COMPLETE (final).

### Sprint 10-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00234 | 星网常显 — 收网时保持可见 | Done |
| STORY-00235 | 星星统一暖白金色 + 尺寸优化 | Done |
| STORY-00236 | 游戏内暂停按钮 | Done |
| STORY-00237 | 失败界面星座剪影 + 个性化鼓励语 | Done |
| STORY-00238 | 胜利界面故事翻页 | Done |

| Sprint | Status | Goal |
|---|---|---|
| Sprint 0-mini | COMPLETE | Foundation — miniprogram scaffold, TECH_SPEC §verification-tool=miniprogram-automator |
| Sprint 1-mini | COMPLETE | 小游戏骨架可运行 — Canvas主菜单+选关+wx-adapter+后端骨架 (QA PASS, UX fix applied, Arch PASS) |
| Sprint 2-mini | COMPLETE | 核心游戏完整可玩 — 点击发射网兜、抓星星、避垃圾、计时/金币结算、失败屏幕 (QA PASS, UX 1 Critical pending, Arch PASS) |
| Sprint 3-mini | COMPLETE | 游戏体验闭环 — 通关屏幕、新手引导、帧率无关物理、关卡图标修复、垃圾危险视觉 (QA PASS, Arch PASS, UX no Blockers) |
| Sprint 4-mini | COMPLETE | 内容完整度 — 星座展厅、道具商店、场景切换 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 5-mini | COMPLETE | 道具系统生效 + 帧率无关性 + 展厅prev/next导航 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 6-mini | COMPLETE | PRD完整度 — 磁力星引/宇航员手套 + 胜利庆典动画 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 8-mini | COMPLETE | 刘海屏安全区适配 — 竖屏保持，全屏幕UI避开刘海/Home条 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 9-mini | COMPLETE | PRD F-001完成 — 背景音乐接入+静音按钮+BUG修复 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 7-mini | COMPLETE | VU ACCEPTED 9.5/10 — All PRD Must-Haves verified. |
| Sprint 10-mini | COMPLETE | 游戏体验精修 — 网兜常显/暖色星星/暂停/失败剪影/胜利翻页 (QA PASS, UX no Blockers, Arch PASS) |
| Sprint 11-mini | COMPLETE | VU 9.0/10 NOT ACCEPTED — F-007 carousel gap identified |
| Sprint 12-mini | COMPLETE | 展厅多图轮播 — 3张图片+左右翻页 (QA PASS, UX no Blockers, Arch PASS, VU ACCEPTED 9.5/10) |
| Sprint 13-mini | COMPLETE | 展厅每星座5张图片 + lore完成按钮确认 (QA PASS, UX no Blockers, Arch PASS, VU ACCEPTED 9.5/10) |
| Sprint 14-mini | COMPLETE | 黑屏修复+横屏适配 — 扫码即开，横屏可玩 (QA PASS, Arch PASS, UX no Blockers) |
| Sprint 15-mini | COMPLETE | 游戏体验关键补全 — SFX+通关照片+成就页+难度条+自动暂停 (QA PASS, Arch PASS, UX no Blockers) |
| Sprint 16-mini | COMPLETE | 小游戏质量对齐Web版 — 开场动画+展厅星图+HUD槽+道具ID对齐 (QA PASS, Arch PASS, UX no Blockers) |
| Sprint 17-mini | COMPLETE | VU ACCEPTED 9.5/10 — All PRD F-001~F-008 + CRs verified — PROJECT COMPLETE |
| Sprint 18-mini | COMPLETE | 视觉全面升级 — 滚动修复+刘海屏适配+角色重绘+UI比例优化 (Arch PASS, QA code-review PASS) |

### Sprint 14-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00243 | 黑屏修复 — boot()即时启动，auth后台异步 | Done |
| STORY-00244 | 横屏适配 — game.json landscape + menu双栏布局 | Done |

### Sprint 13-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00239 | 胜利lore"完成✓"按钮 — 点击后退出结算卡 | Done (already implemented) |
| STORY-00242 | 展厅每星座图片从3张增至5张 | Done |

### Sprint 9-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00230 | 背景音乐接入 — bgm.mp3 + AudioAdapter.playBGM | Done |
| STORY-00231 | 主菜单静音按钮 — 右上角音符图标，持久化 | Done |
| STORY-00232 | 选关屏标题文字修复 (BUG-00101) | Done |
| STORY-00233 | 音乐跨页面连续播放 | Done |

### Sprint 6-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00224 | 磁力星引 + 宇航员手套 | Done |
| STORY-00225 | 胜利庆典动画 + 星座连线动画 | Done |

### Sprint 5-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00221 | 道具系统生效 — 6种道具效果 | Done |
| STORY-00222 | 帧率无关性全补 — _timerFlash/particles/debris spin | Done |
| STORY-00223 | 展厅 prev/next 星座导航 | Done |

### Sprint 4-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00217 | 星座展厅 — Canvas展厅屏 | Done |
| STORY-00218 | 道具商店 — Canvas商店屏 | Done |
| STORY-00219 | 场景背景切换 — 每5关一个背景 | Done |
| STORY-00220 | 通关屏商店入口 + 展厅入口 | Done |

### Sprint 2-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00206 | 关卡选择屏幕 | Done |
| STORY-00207 | 游戏主场景 | Done |
| STORY-00208 | 网兜发射机制 | Done |
| STORY-00209 | 星星碰撞与计数 | Done |
| STORY-00210 | 定时器与金币结算 | Done |
| STORY-00211 | 通关/失败屏幕 | Done |

### Sprint 3-mini Stories
| Story | Title | Status |
|---|---|---|
| STORY-00212 | 通关屏幕 — 星座介绍卡 + 下一关/重玩/选关导航 | Done |
| STORY-00213 | 新手引导提示 — "点击屏幕发射网兜！" 首次入场 hint | Done |
| STORY-00214 | 帧率无关物理 — 摆动 + 网兜速度改为 dt×speed | Done |
| STORY-00215 | 关卡图标修复 — 解锁关卡显示关卡编号，锁定显示🔒 | Done |
| STORY-00216 | 垃圾危险视觉语言 — 红色光晕/警告色区分危险目标 | Done |

### Sprint 4-mini Backlog (Top Priority Items)
- [Arch Medium] 其余帧率相关：_timerFlash、_updateParticles、d.angle += d.spin 仍为帧计数
- [Arch Medium] stars/debris arrays在每帧_update中直接mutate
- [Arch Medium] Canvas 2D context渲染无离屏缓冲 (性能)
- [Arch Medium] 新手提示使用wx.getStorageSync而非StorageAdapter（架构不一致）
- 展厅功能 (M9 PRD Must-Have)
- 商店功能 (M7 PRD Must-Have)

## Sprint 32 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00132 | 开场动画每次F5播放，游戏内返回不播放 | Done |
| STORY-00133 | 关卡加载极速化 — decode Promise缓存复用 | Done |


| Story | Title | Status |
|---|---|---|
| STORY-00130 | 流星雨开场动画重设计 | Done |
| STORY-00131 | 主菜单星座上移放大 + 按钮透明化 + 信息栏优雅化 | Done |

## Sprint 30 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00129 | 开场动画精修 + 封面居中 + 按钮透明度 | Done |

## Sprint 29 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00128 | 封面三栏布局探索 — 左星图/中按钮/右介绍 | Done (reverted) |


| Story | Title | Status |
|---|---|---|
| STORY-00127 | 封面全背景重设计 — 移除底部分割条，UI浮层化 | Done |


| Story | Title | Status |
|---|---|---|
| STORY-00126 | 封面三项精修 — 随机fallback/全屏星座/去成就按钮 | Done |


| Story | Title | Status |
|---|---|---|
| STORY-00125 | 封面单星座聚焦背景 + 观测提示面板 | Done |

## Sprint 24 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00115 | 地理定位星空主页 — visibility.js + menu-sky.js | Done |
| STORY-00116 | 全通成就页 — achievement.js + screen-achievement | Done |
| STORY-00117 | 15秒开场动画 — intro.js first-run cinematic | Done |
| STORY-00118 | Q4 Level 30边界 — 通关后导航至成就页 | Done |

## Sprint 25 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00119 | 失败屏幕改善 — 个性化鼓励文字 + 增强星座剪影 | Done |
| STORY-00120 | 道具选择情境推荐 — 难度驱动横幅 | Done |
| STORY-00121 | 星座故事分段翻页 — 4页分页器 | Done |
| STORY-00122 | 动态背景音乐 — 计时≤15s加速至1.35x | Done |
| STORY-00123 | Tab切换自动暂停 + 网兜状态机100ms防抖 | Done |
| STORY-00124 | localStorage静默降级 — _storageAvailable模块标志 | Done |

## Sprint 20 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00102 | 网兜连接点修复 — 绳子从角色手部出发 | Done |
| STORY-00103 | 摆动角度扩大至±80° — 边缘星星可达 | Done |
| STORY-00104 | 星星最大半径从15减小至14 | Done |
| STORY-00105 | 展厅详情页布局重排 — 名字→大星图→天文摄影→介绍，删除小星图 | Done |
| STORY-00106 | 天文摄影图片预加载 — 展厅打开无延迟 | Done |
| STORY-00107 | 关卡入口全资源预热 — 包含垃圾精灵图 | Done |

## Sprint 23 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00113 | 网绳发射起点修复 — 从摆动时的手部位置出发 | Done |
| STORY-00114 | 精灵图全时段即时渲染 — 解锁关卡预热 + 通关时预热下一关 | Done |

## Sprint 22 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00111 | 网绳路径闪烁修复 — 出去和回来路径一致 | Done |
| STORY-00112 | 关卡加载延迟消除 — 传入预加载精灵图对象 | Done |

## Sprint 21 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00108 | 网兜绳起点对齐角色手部 — SVG精确坐标校准 | Done |
| STORY-00109 | 展厅天文摄影图片预加载修复 — GC防护+CDN预连接 | Done |
| STORY-00110 | 关卡精灵图立即渲染 — preload hint + img.decode() | Done |

## Sprint 18 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00087 | 网兜手持位置修复 — 网兜握在角色手中 | Done |
| STORY-00088 | 展厅详情页天文摄影与星座画像位置互换 | Done |
| STORY-00089 | 大熊座天文摄影修复 + 全星座图片审计 | Done |
| STORY-00090 | 展厅详情页上/下一个星座导航 | Done |
| STORY-00091 | 道具选择界面进入新关卡时重新评估数量 | Done |
| STORY-00092 | 背景音乐恢复到原版和弦进行版本 | Done |
| STORY-00093 | 暂停按钮图标改为齿轮⚙ | Done |
| STORY-00094 | 星星视觉半径放大2.5倍 | Done |

## Sprint 17 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00080 | 网兜空闲时可见 | Done |
| STORY-00081 | 星星大小2/3缩小 + min/max限制 | Done |
| STORY-00082 | 失败界面布局修复 | Done |
| STORY-00083 | 返回选关按钮背景色 | Done |
| STORY-00084 | 背景音乐重构 | Done |
| STORY-00085 | 金币系统重构 | Done |
| STORY-00086 | 关卡预加载 | Done |

## Sprint 10 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00034 | 改名为追星少女 | Done |
| STORY-00035 | 降低网兜摆动速度 | Done |
| STORY-00036 | 抓住星星后连线保持可见 | Done |
| STORY-00037 | 场景背景地景结构 | Done |
| STORY-00038 | 道具系统重设计 | Done |
| STORY-00039 | 场景介绍时机修复 | Done |

## Sprint 11 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00040 | 垃圾视觉升级 | Done |
| STORY-00041 | 通关界面优化 | Done |
| STORY-00042 | 展厅图片轮播 | Done |
| STORY-00043 | 少女角色升级 | Done |
| STORY-00044 | 全局视觉升级 Part 1 | Done |
| STORY-00045 | 全局视觉升级 Part 2 | Done |

## Sprint 13 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00053 | 道具系统修复 — CR-031 items | Done |
| STORY-00054 | 少女角色精灵图动画 — CR-018 | Done |
| STORY-00055 | 天文星图放大查看 — CR-028 | Done |
| STORY-00056 | 展厅图片轮播视觉增强 — CR-029 | Done |
| STORY-00057 | 关卡选择难度指示器重设计 — CR-027 | Done |

## Sprint 14 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00058 | 天文摄影图片资源 (CR-032) | Done |
| STORY-00059 | 关卡名称修复 (CR-030/043) | Done |
| STORY-00060 | 展馆通关解锁 + 星星说明 (CR-034/041) | Done |
| STORY-00061 | 暂停HUD修复 (CR-036) | Done |
| STORY-00062 | 失败界面 + 商店入口 (CR-033/035) | Done |
| STORY-00063 | 音频系统 + 多项机制修复 (CR-037/038/039/040/044) | Done |

## Sprint 15 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00064 | 少女角色重绘 | Done |
| STORY-00065 | 网兜视觉重绘 | Done |
| STORY-00066 | 星星大小/亮度区别 | Done |
| STORY-00067 | 游戏交互精修 | Done |
| STORY-00068 | 展厅/商店UI修复 | Done |

## Sprint 16 Stories
| Story | Title | Status |
|---|---|---|
| STORY-00069 | 少女/网兜/垃圾全部换成SVG图片资源 | Done |
| STORY-00070 | 星座点亮动画 (抓完全部星星后) | Done |
| STORY-00071 | 场景介绍文字移除 + 展厅顺序修复 + 画廊灰色 + UI修复 | Done |
| STORY-00072 | 网兜碰撞修复 + 抓取手感优化 | Done |

## Acceptance Mode
auto (Virtual User as final gate)
