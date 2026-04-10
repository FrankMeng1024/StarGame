# DISCOVERY.md — 星捕少女 (StarCatcher)

## Project Type
Single-player browser game (HTML5 Canvas, desktop-first, future mobile support)

## §ui-intent
用户明确要求高质量视觉呈现：好看的封面、精美的展厅、沉浸式星空背景。按照 FRONTEND_STANDARDS.md 最高质量标准执行。

---

## Competitive Analysis

| Product | Strengths | What we learn |
|---|---|---|
| 黄金矿工 (Gold Miner) | Simple swing mechanic, satisfying grab, clear scoring | Core mechanic to replicate — pendulum physics, click-to-extend |
| Angry Birds | Polish, juicy feedback, level progression | Sound effects, particle effects on star grab |
| Sky: Children of the Light | Star aesthetic, emotional connection to stars | Visual language for stars — glow, twinkle, warmth |
| 星座运势 apps | Familiar star sign names, educational intro format | How to present constellation lore accessibly |

---

## User Personas

**Primary**: 8-40岁，对星空/星座有好奇心，喜欢休闲解谜游戏，不一定有天文专业知识。
**Secondary**: 家长陪伴孩子一起玩，希望游戏有教育价值（星座知识）。

---

## Feature Priority — MoSCoW

### Must Have
- M1: 游戏主界面（封面、进入游戏、查看展厅）
- M2: 关卡选择界面（30关，按解锁顺序排列）
- M3: 核心游戏玩法：网兜自动摆动，点击发射，伸长抓取，碰到第一个物体即抓取
- M4: 星星目标：每关对应一个星座，星星大小与该星实际亮度对应
- M5: 宇宙垃圾障碍（多种形状：卫星碎片、陨石、太空站残骸等）
- M6: 时间限制 + 剩余时间转金币
- M7: 道具系统（关卡结束后用金币购买）
- M8: 通关展示：星座介绍动画 + 进入下一关
- M9: 星座展厅（已解锁星座的图片5-10张 + 文字介绍）
- M10: 30个国际知名星座关卡（按熟悉度排序）
- M11: 5关一个背景场景切换（特卡波湖牧羊人小屋 / 库克山 等6个背景）
- M12: 所有图片资源本地内置

### Should Have
- S1: 背景音乐（星空主题）
- S2: 音效（抓取、失败、成功）
- S3: 高分记录（本地存储）
- S4: 关卡内星座星图叠加显示（半透明连线提示）

### Could Have
- C1: 手机触屏支持
- C2: 成就系统
- C3: 分享关卡成绩

### Won't Build (this iteration)
- 多人对战
- 服务器端存储/账号系统
- 付费内容
- 中国传统二十八宿

---

## 30 Constellations — Ordered by Familiarity

| # | 中文名 | 英文名 | 星星数(主要) | 难度 |
|---|---|---|---|---|
| 1 | 猎户座 | Orion | 7 | 1 |
| 2 | 大熊座（北斗七星） | Ursa Major | 7 | 1 |
| 3 | 天蝎座 | Scorpius | 11 | 2 |
| 4 | 狮子座 | Leo | 9 | 2 |
| 5 | 白羊座 | Aries | 4 | 1 |
| 6 | 金牛座 | Taurus | 6 | 2 |
| 7 | 双子座 | Gemini | 8 | 2 |
| 8 | 巨蟹座 | Cancer | 5 | 2 |
| 9 | 处女座 | Virgo | 10 | 3 |
| 10 | 天秤座 | Libra | 5 | 2 |
| 11 | 射手座 | Sagittarius | 8 | 3 |
| 12 | 摩羯座 | Capricornus | 6 | 3 |
| 13 | 水瓶座 | Aquarius | 7 | 3 |
| 14 | 双鱼座 | Pisces | 7 | 3 |
| 15 | 仙后座 | Cassiopeia | 5 | 2 |
| 16 | 英仙座 | Perseus | 9 | 3 |
| 17 | 天鹰座 | Aquila | 6 | 3 |
| 18 | 天鹅座 | Cygnus | 9 | 4 |
| 19 | 天琴座 | Lyra | 5 | 3 |
| 20 | 南十字座 | Crux | 4 | 3 |
| 21 | 小熊座 | Ursa Minor | 7 | 4 |
| 22 | 牧夫座 | Boötes | 7 | 4 |
| 23 | 室女座/御夫座 | Auriga | 6 | 4 |
| 24 | 飞马座 | Pegasus | 6 | 4 |
| 25 | 海豚座 | Delphinus | 5 | 4 |
| 26 | 南鱼座 | Piscis Austrinus | 5 | 5 |
| 27 | 天龙座 | Draco | 14 | 5 |
| 28 | 蛇夫座 | Ophiuchus | 7 | 5 |
| 29 | 半人马座 | Centaurus | 11 | 5 |
| 30 | 猎犬座 | Canes Venatici | 4 | 5 |

---

## Background Scenes (5 levels per scene)

| 关卡 | 背景 |
|---|---|
| 1-5 | 特卡波湖牧羊人小屋（经典蓝紫色星空）|
| 6-10 | 库克山山顶雪景 |
| 11-15 | 特卡波湖夏夜全景 |
| 16-20 | 库克山山谷营地 |
| 21-25 | 特卡波湖冬夜极光 |
| 26-30 | 库克山破晓前最深夜空 |

---

## What We Will NOT Build
- 服务器后端（纯前端游戏，localStorage 存档）
- 用户账号/登录系统
- 中国传统星宿内容
- 实时天文数据对接
- 手机版（当前迭代）

## Asset Dependency Log
- M9/M12 (星座展厅图片轮播): 需要真实星座照片资源（每星座5-10张）。无资源前展厅详情页保持当前文字+图标形式，不做轮播。Sprint 4+ 不开发此功能直到资源到位。
- S1 (背景音乐): 需要音频文件。无资源前跳过。已列为 Should Have（非 Must Have）。

