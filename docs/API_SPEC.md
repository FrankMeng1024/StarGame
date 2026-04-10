# API_SPEC.md — 星捕少女 (StarCatcher)

This is a pure frontend game. No HTTP API. This document defines the **internal JS module interface contracts**.

---

## Module Architecture

```
js/
├── main.js              # Entry point, screen router
├── state.js             # Global game state (singleton)
├── data/
│   └── constellations.js  # All 30 constellation definitions
├── screens/
│   ├── menu.js          # Main menu screen
│   ├── levelSelect.js   # Level selection screen
│   ├── game.js          # Game screen (Canvas controller)
│   ├── levelComplete.js # Level complete screen
│   ├── shop.js          # Shop screen
│   └── gallery.js       # Constellation gallery screen
├── game/
│   ├── engine.js        # Game loop, Canvas management
│   ├── net.js           # Net (网兜) physics and rendering
│   ├── stars.js         # Star entities
│   ├── debris.js        # Space debris entities
│   ├── particles.js     # Particle system
│   └── collision.js     # Collision detection
├── ui/
│   ├── hud.js           # In-game HUD overlay
│   └── shop.js          # Shop UI components
└── utils/
    ├── storage.js       # localStorage wrapper
    └── audio.js         # Audio manager
```

---

## State Contract (state.js)

```js
// GlobalState shape
{
  // Game progress
  unlockedLevels: Set<number>,      // level indices (0-29) unlocked
  levelScores: Map<number, {        // best score per level
    stars: 1|2|3,
    time: number,                   // seconds remaining
    coins: number
  }>,
  coins: number,                    // total coin balance
  inventory: Map<string, number>,   // itemId → quantity
  
  // Current session
  currentLevel: number|null,        // 0-29
  currentScreen: string,            // 'menu'|'levelSelect'|'game'|'levelComplete'|'shop'|'gallery'
  
  // Methods
  save(): void,                     // persist to localStorage
  load(): void,                     // load from localStorage
  isUnlocked(levelIndex: number): boolean,
  unlock(levelIndex: number): void,
  addCoins(amount: number): void,
  spendCoins(amount: number): boolean,  // returns false if insufficient
}
```

---

## Constellation Data Contract (data/constellations.js)

```js
// ConstellationDef shape
{
  id: number,               // 0-29
  nameCN: string,           // "猎户座"
  nameEN: string,           // "Orion"
  symbol: string,           // Unicode symbol or SVG ref
  difficulty: 1|2|3|4|5,
  timeLimit: number,        // seconds
  background: 0|1|2|3|4|5, // which background scene (maps to 5-level groups)
  
  stars: [{
    id: string,             // e.g. "betelgeuse"
    nameCN: string,         // "参宿四"
    nameEN: string,         // "Betelgeuse"
    magnitude: number,      // visual magnitude (lower = brighter)
    spectralType: string,   // 'O'|'B'|'A'|'F'|'G'|'K'|'M'
    x: number,              // 0-1 normalized position in game area
    y: number,              // 0-1 normalized position in game area
  }],
  
  // Lines connecting stars (for constellation drawing animation)
  lines: [[string, string]], // pairs of star IDs
  
  // Gallery content
  gallery: {
    description: string,    // 200-300 char intro
    story: string,          // 500-800 char mythology
    mainStars: string[],    // notable star names
    bestViewMonth: string,  // "11月-2月"
    region: string,         // "赤道星座" / "北天星座" etc
    images: string[],       // relative paths to local images
  }
}
```

---

## Screen Router Contract (main.js)

```js
// Navigation
navigateTo(screen: string, params?: object): void
// screens: 'menu' | 'levelSelect' | 'game' | 'levelComplete' | 'shop' | 'gallery'
// params: { levelId?: number, fromScreen?: string }
```

---

## Game Engine Contract (game/engine.js)

```js
// Lifecycle
init(canvasEl: HTMLCanvasElement, levelDef: ConstellationDef): void
start(): void    // begins game loop
pause(): void
resume(): void
destroy(): void  // cleanup, cancel animation frame

// Events (dispatched on window)
'game:starCaught'   // detail: { starId, remaining }
'game:debrisCaught' // detail: { debrisType, timePenalty }
'game:levelComplete' // detail: { starsCount, timeRemaining, coinsEarned }
'game:levelFailed'  // detail: {}
```

---

## Net Physics Contract (game/net.js)

```js
// NetState
{
  angle: number,        // current angle in radians (-PI/2 to PI/2 from vertical)
  length: number,       // current rope length (0 = retracted, maxLength = extended)
  state: 'swinging' | 'extending' | 'retracting' | 'caught',
  catchPayload: Entity|null,
}

// Methods
swing(): void           // called each frame when state=swinging
fire(): void            // called on user click — transitions to 'extending'
retract(): void         // transitions to 'retracting'
```

---

## Storage Contract (utils/storage.js)

```js
saveGame(state: GlobalState): void
loadGame(): GlobalState|null   // null if no save exists
clearGame(): void
```
