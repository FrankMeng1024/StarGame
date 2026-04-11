# UI_SPEC.md — 追星少女 (StarCatcher)

## Product Soul

**Emotional Core**: 奇幻 + 温暖 + 探索感。小女孩仰望星空，伸出网兜触碰遥远的星光——孤独而浪漫，每一颗星都是一个秘密等待被发现。

**Visual Metaphor**: 新西兰最深邃的夜空。藏蓝/深紫渐变天幕，星点金光，地平线上牧羊人小屋的橙色暖光与天上繁星遥遥呼应。网兜是唯一连接地面与天空的桥梁——既是玩具，也是魔法道具。

**Interaction Story**: 
- 网兜抛出 → 白色弧光尾迹（像流星反向飞行）
- 抓到星星 → 金色粒子爆发 + 星星"融化"进网兜
- 宇宙垃圾 → 红色碎片散开 + 轻微震动
- 关卡完成 → 星座连线动画（星星在天空中连成图案）
- 展厅翻阅 → 古老天文书质感，页面翻转效果

---

## Style Direction
(To be confirmed by user at CP1 — 3 demos will be presented)

**Confirmed style**: TBD at CP1

---

## Icon System
- **Set**: Lucide icons (consistent stroke weight, clean lines)
- **Style**: Stroke-based, 1.5px weight, rounded caps
- **Colors**: Always `currentColor` — inherits from context

---

## Color System

```css
:root {
  /* Night Sky Palette */
  --sky-deep: #0a0e27;        /* deepest night sky background */
  --sky-mid: #1a1f4e;         /* mid-sky gradient */
  --sky-horizon: #2d1b4e;     /* horizon glow (purple) */
  
  /* Star Colors */
  --star-gold: #ffd700;       /* primary star color */
  --star-bright: #fff8e0;     /* brightest stars */
  --star-blue: #b0c4ff;       /* blue-white stars */
  --star-red: #ff6b6b;        /* red giant stars */
  
  /* UI Colors */
  --primary: #7c5cbf;         /* purple — magic/mystery */
  --primary-end: #4a90d9;     /* blue — sky/exploration */
  --primary-gradient: linear-gradient(135deg, var(--primary), var(--primary-end));
  
  --warm-light: #f5a623;      /* shepherd's hut orange glow */
  --coin-gold: #ffd700;       /* coin/currency color */
  
  /* Surface Colors */
  --bg: var(--sky-deep);
  --card: rgba(26, 31, 78, 0.85);
  --card-border: rgba(124, 92, 191, 0.4);
  --text: #e8e8f0;
  --text2: #9090b8;
  --border: rgba(124, 92, 191, 0.3);
  
  /* Semantic */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* Spacing (fluid) */
  --spacing-xs: clamp(4px, 1vw, 6px);
  --spacing-sm: clamp(8px, 1.5vw, 12px);
  --spacing-md: clamp(12px, 2.5vw, 16px);
  --spacing-lg: clamp(16px, 3.5vw, 24px);
  --spacing-xl: clamp(24px, 5vw, 40px);
  
  /* Typography */
  --font-xs: clamp(10px, 1.2vw, 12px);
  --font-sm: clamp(12px, 1.4vw, 14px);
  --font-md: clamp(14px, 1.6vw, 16px);
  --font-lg: clamp(18px, 2vw, 22px);
  --font-xl: clamp(24px, 3vw, 32px);
  --font-hero: clamp(36px, 5vw, 60px);
  
  /* Layout */
  --header-h: 60px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 999px;
}
```

---

## Typography
- **Primary font**: `'Ma Shan Zheng'` (Google Fonts — Chinese calligraphy feel for titles) + `'Noto Sans SC'` (body text)
- **Fallback**: system-ui, sans-serif
- **Title treatment**: Large, gold gradient text with subtle glow for game title
- **Body**: Clean, readable, slight letter-spacing for stargazing diary feel

---

## Screen Architecture

### 1. Cover / Main Menu
- Full-screen illustration: 牧羊人小屋夜景，繁星满天，小女孩剪影站在山坡
- Game title: "星捕少女" — large, gold calligraphic style with twinkling animation
- Two main CTAs: [挑战关卡] [星座展厅]
- Subtle: twinkling stars particle background, slow pan animation

### 2. Level Select Screen
- Grid of 30 level cards (6×5)
- Each card: star sign symbol + 中文名 + lock/unlock state
- Background: matches current unlocked scene
- Locked levels: dimmed with lock icon
- Unlocked: star rating display (how many stars earned)

### 3. Game Screen (Canvas)
- **Canvas**: full viewport, game world
- **HUD overlay** (HTML on top of Canvas):
  - Top-left: 关卡名 + 当前关卡号
  - Top-center: 时间倒计时（大号，紧张时变红）
  - Top-right: 已抓星星数 / 总数
  - Bottom: 道具栏（当前携带的道具）
- **Game elements** (Canvas):
  - 小女孩角色（地面中央）
  - 网兜（摆动动画，伸缩动画）
  - 星星（位置按真实星座图排布，大小按亮度）
  - 宇宙垃圾（随机分布）
  - 背景（场景图片）

### 4. Level Complete Screen
- 星座连线动画（星星在深蓝背景上逐一连线形成星座图案）
- 得分统计：抓到N/N颗星、剩余时间X秒、获得金币X
- 星座简介文字（卷轴展开动画）
- 按钮：[下一关] [商店] [返回选关]

### 5. Shop Screen
- 金币余额显示
- 道具网格（6-8种道具）
- 每个道具：图标 + 名称 + 效果说明 + 价格 + 购买按钮
- 已购道具：绿色勾选

### 6. Constellation Gallery (展厅)
- 已解锁星座列表（卡片布局）
- 锁定的显示为未知轮廓
- 点击进入：
  - 大图轮播（5-10张真实图片）
  - 星座名 + 英文名 + 基本信息
  - 星座故事/神话介绍
  - 主要星星信息

---

## Game Mechanic Visuals

### Net (网兜)
- 形状：网状圆形兜，用Canvas路径绘制
- 悬挂绳索：从小女孩手中延伸
- 摆动：正弦波摆动（模仿黄金矿工）
- 伸长：沿当前角度延伸，绳索跟随
- 收回：快速收回动画
- 颜色：白色/银色，抓到东西时金色发光

### Girl Character
- 简洁卡通风格，站在地面中央偏下
- 头发随风微动（CSS animation）
- 手持长杆，网兜挂在顶端

### Stars
- 大小：按 magnitude 映射（亮星大，暗星小）
- 颜色：B型星蓝白，G型星金黄，K/M型星橙红
- 动画：慢速闪烁 twinkle（CSS animation）
- 被抓中：金色粒子爆发，缩小消失

### Space Debris (宇宙垃圾)
Types rendered as Canvas shapes:
- 陨石：不规则多边形，灰色，自转
- 卫星碎片：T形或板状，银色
- 废弃火箭推进器：圆柱形，锈迹斑斑橙色
- 太空碎布：不规则碎片，缓慢翻滚
- 宇航员手套（脑洞道具）：白色手套形状
- 外星人飞碟（脑洞）：卡通飞碟，绿色

### Particle Effects
- 星星抓取：gold burst，20 particles，fade out 0.5s
- 垃圾碎碎：grey/orange fragments，8 particles，gravity fall
- 倒计时警告：screen edge red pulse at 10s remaining
- 关卡完成：全屏金色星光雨

---

## Animation Philosophy
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for playful pop effects (star grab, UI buttons)
- `ease-out` for UI screen transitions (professional, not jarring)
- Game physics: 60fps requestAnimationFrame, deterministic pendulum simulation

---

## Signature Element
**自定义光标**: 小星星形状 (★)，移动时拖出微弱的星光尾迹。完美契合游戏主题——你在操控一个追星的小女孩，而你的鼠标就是那颗星。
