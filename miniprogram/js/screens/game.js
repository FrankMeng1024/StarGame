// game.js — Canvas 游戏屏幕（微信小游戏版）
// 涵盖：背景场景 + 角色 + 网兜机制 + 星星 + 垃圾 + HUD + 胜负 + 结算卡

import { G, onTouch, offTouch } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawCard, hitTest, drawFadeOverlay, tickFade, fadeNavigate,
} from '../engine/canvas-utils.js';
import { CONSTELLATIONS, magToRadius } from '../data/constellations.js';
import { SCENE_PALETTES, drawGroundSilhouette } from '../data/scenes.js';
import state from '../engine/state.js';
import { AudioAdapter } from '../platform/wx-adapter.js';

// SFX paths (relative to miniprogram root)
const SFX_CATCH   = 'assets/audio/sfx-catch.wav';
const SFX_DEBRIS  = 'assets/audio/sfx-debris.wav';
const SFX_VICTORY = 'assets/audio/sfx-victory.wav';
const SFX_TIMEEXT = 'assets/audio/sfx-timeext.wav';

const TWO_PI = Math.PI * 2;

// ── 网兜物理常量 ───────────────────────────────────────────────
const SWING_SPEED   = Math.PI * 2 / (3.5 * 60);   // 3.5s per full cycle
const SWING_AMP     = (80 * Math.PI) / 180;         // ±80° in radians
const NET_SPEED     = 4;                             // px per frame — STORY-00286: reduced from 5 (web parity ~240px/s at 60fps)
const NET_MAX_LEN   = 0;                             // computed at showGame time (55% H)
const GIRL_W        = 90;
const GIRL_H        = 145;

// ── 游戏状态机 ────────────────────────────────────────────────
let _navigate   = null;
let _rafId      = null;
let _levelIdx   = 0;
let _conDef     = null;
let _scene      = null;
let _sceneIdx   = 0;

// Net state
let _swingT     = 0;     // accumulates each frame
let _netAngle   = 0;
let _netLen     = 0;
let _netMaxLen  = 0;
let _netState   = 'swing'; // 'swing' | 'extend' | 'retract'
let _extendHold = 0;       // frames to hold at full extension before retracting
let _netHeadX   = 0;
let _netHeadY   = 0;
let _poleX      = 0;
let _poleY      = 0;

// Stars
let _stars      = [];   // {x,y,r,color,phase,speed,caught}
let _caught     = 0;
let _total      = 0;

// Debris
let _debris     = [];   // {x,y,r,type,spin,angle}

// STORY-00366: Magnetic field zones and debris clouds
let _magnetZones = [];  // {x,y,r,angle} — deflect net angle on entry
let _debrisClouds = []; // {x,y,particles:[{x,y,vx,vy,r}]} — small clusters

// Caught debris (STORY-00279) — net grabs debris and drags it back slowly
let _caughtDebris = null;

// Particles
let _particles  = [];   // {x,y,vx,vy,life,maxLife,color}

// Screen shake (STORY-00259)
let _shakeFrames = 0;
let _shakeX      = 0;
let _shakeY      = 0;

// Arc trail points (STORY-00257) — ring buffer of last N head positions
const ARC_TRAIL_LEN = 10;
let _trailPoints = [];  // {x,y} — last N net head positions during extension

// Net catch flash (STORY-00257)
let _catchFlashFrames = 0;

// Reusable audio context for line-draw SFX — cached to avoid context leak (Arch review fix)
let _lineDrawSfxCtx = null;

// Timer
let _timeLeft      = 0;
let _levelInitTime = 0;  // initial time for this level — used to cap time_ext (Arch fix)
let _lastNow    = 0;
let _dt         = 0;      // last frame dt (seconds) — used by draw helpers needing physics
let _timerFlash = 0;     // seconds of red flash remaining on HUD

// Result state
let _phase      = 'play'; // 'play' | 'celebrate' | 'linedraw' | 'linger' | 'result'
let _result     = null;   // {victory, timeLeft, coins, stars, uncaught}
// STORY-00367: Star pop-out animation for victory screen
let _starPopTimers = [0, 0, 0]; // per-star elapsed time, starts counting on result phase enter
// STORY-00373: Card entrance animation (translateY lerp + alpha fade)
let _resultEnterTimer = 0;  // seconds since result phase entered; drives entrance animation

// Pause state
let _paused     = false;
let _btnPause   = null;
// wx.onHide listener ref — stored to allow wx.offHide() cleanup
let _onHideCb   = null;
let _btnResume  = null;
let _btnPauseRetry  = null;
let _btnPauseLevels = null;

// SPRINT-55: Ma Shan Zheng font for title-level text
let _maShanZhengLoaded = false;

// Lore pagination (victory screen)
let _lorePage   = 0;
let _lorePages  = [];     // string[] — lore split into pages
let _loreDismissed = false; // true after "完成 ✓" tap; prevents lazy rebuild
let _btnLoreNext = null;

// Victory photo (STORY-00246)
let _victoryPhoto     = null;   // wx.createImage() object
let _victoryPhotoLoaded = false;
let _victoryPhotoFor  = -1;    // levelIdx the photo is for

// Girl PNG sprite (Sprint A — replaces bezier spacesuit; PNG not SVG — wx.createImage doesn't support SVG)
// Sprite: 880x220 (4 frames at 220x220 each, rendered 2x of original 110x110 SVG design)
const _girlImg = (typeof wx !== 'undefined' && wx.createImage) ? (() => {
  const img = wx.createImage();
  img.src = 'assets/sprites/girl.png';
  return img;
})() : null;
// Body-without-arms sprite (Phase 1 skeletal) — same source frame 0 with arms/pole erased
const _bodyNoArmsImg = (typeof wx !== 'undefined' && wx.createImage) ? (() => {
  const img = wx.createImage();
  img.src = 'assets/sprites/body_no_arms.png';
  return img;
})() : null;
// Sprite sheet dimensions: 880x220, 4 frames of 220x220 each
const _GIRL_FRAME_W = 220;  // px per frame in the sprite sheet
const _GIRL_FRAME_H = 220;
let _girlFrame     = 0;    // 0=idle, 1=blink, 2=throw, 3=catch
let _girlLastBlink = 0;    // ms timestamp of last blink start
// Smooth pose transitions (Sprint 67)
let _girlPrevFrame  = 0;   // previous frame for cross-fade
let _girlTransT     = 1.0; // 0→1 during cross-fade; 1 = no transition active
let _girlTransStart = 0;   // ms timestamp when transition started
const _GIRL_TRANS_MS = 180; // cross-fade duration in ms
// Skeletal arm animation state (Phase 1)
let _skelLastMs    = 0;    // previous frame timestamp for dt
let _skelBlendT    = 1.0;  // 0→1: blend from swing→pose (1 = fully in target pose)
let _skelBlendDir  = 1;    // +1 = blending in, -1 = unused
const _SKEL_BLEND_MS = 280; // blend duration ms
// Right wrist position (canvas pixels) — updated each frame by _drawGirl, used by _updateNetHead/_drawNet
let _skelRHandX    = 0;
let _skelRHandY    = 0;

// Victory animation state
let _celebrateTimer = 0;  // seconds remaining in celebrate phase
let _lineDrawProgress = 0; // float: how many lines have been drawn so far
let _lingerTimer = 0;     // seconds remaining in linger phase (STORY-00274)
let _revealedStarSet = new Set(); // STORY-00303: stars lit up by linedraw — indices into _conDef.lines
// STORY-00323: star flash sequence between celebrate and linedraw
let _flashPhaseTimer = 0;    // elapsed time in starflash phase
let _flashedStarSet  = new Set(); // star indices that have been revealed in flash phase
let _flashingStars   = [];   // [{idx, startT}] — stars currently mid-flash animation

// Tutorial hint
let _hintTimer  = 0;      // seconds remaining for hint display
const HINT_DURATION = 3.0;

// UI buttons (result screen)
let _btnNext    = null;
let _btnRetry   = null;
let _btnReplay  = null;
let _btnLevels  = null;
let _btnShop    = null;
let _btnGallery = null;

// Item effects (active during current level)
let _netSpeedMult  = 1;     // speed item: ×1.5
let _netRadiusMult = 1;     // enlarge item: ×1.5
let _debrisRadiusMult = 1;  // shrink item: ×0.5
let _coinsMult     = 1;     // double_coins: ×2
let _bombActive    = false; // bomb item: one-time debris clear
let _btnBomb       = null;  // bomb HUD button (legacy — kept for compatibility)
let _starMapActive = false; // star_map: show constellation line hints — STORY-00296
let _starMapTimer  = 0;     // star_map: seconds remaining
let _gloveActive   = false; // glove: no speed penalty on debris catch

// Item slot HUD system (STORY-00252)
// Each slot: { id, icon, duration, endTime, used }
// duration=0 means instant; duration>0 means timed (seconds)
let _slots      = [];  // up to 3 active item slots
let _slotBoxes  = [];  // [{x,y,w,h,slotIdx}] — tap zones, updated each draw frame
let _passiveCoins = false; // double_coins passive item

// STORY-00372: near-layer background sparkle stars + grass seeds (Sprint C bg upgrade)
let _nearBgSparkles = []; // [{x,y,r,ph,spd}] — 6 bright near-layer bg stars with diffraction arms
let _grassSeeds     = []; // [{x,dx,ph}] — grass stem positions near poleX

const ITEM_CONFIG = {
  net_speed:    { icon: '⚡', duration: 15 },
  net_enlarge:  { icon: '🪢', duration: 15 },
  space_bomb:   { icon: '💣', duration: 0  },
  time_ext:     { icon: '⏱', duration: 0  },
  shrink_debris:{ icon: '🔬', duration: 30 },
  star_map:     { icon: '🗺', duration: 60 },  // STORY-00296: replaces star_magnet
  glove:        { icon: '🧤', duration: 30 },
  double_coins: { icon: '🪙', duration: 0  },  // passive only
};

// ── Public API ────────────────────────────────────────────────
export function showGame(navigate) {
  _navigate = navigate;
  _cleanup();

  // CR-140: 防息屏 — 游戏运行时保持屏幕常亮
  try {
    if (typeof wx !== 'undefined' && wx.setKeepScreenOn) {
      wx.setKeepScreenOn({ keepScreenOn: true });
    }
  } catch (e) {}

  _levelIdx  = state.currentLevel || 0;
  _conDef    = CONSTELLATIONS[_levelIdx];
  _sceneIdx  = Math.min(Math.floor(_levelIdx / 5), SCENE_PALETTES.length - 1);
  _scene     = SCENE_PALETTES[_sceneIdx];

  const W = G.SCREEN_W;
  const H = G.SCREEN_H;

  _poleX     = W / 2;
  _poleY     = H * 0.87;  // STORY-00278: moved down from 0.82 to keep 130px character below star zone
  _netMaxLen = H * 0.88;  // fixed: was 0.75 — still too short for top-row stars (STORY-00272)
  _netLen    = 0;
  _extendHold = 0;
  _swingT    = 0;
  _netState  = 'swing';
  _phase     = 'play';
  _result    = null;
  _celebrateTimer = 0;
  _lineDrawProgress = 0;
  _lingerTimer = 0;
  _flashPhaseTimer = 0; // STORY-00323
  _flashedStarSet.clear();
  _flashingStars = [];
  _caughtDebris = null;

  // Timer — STORY-00353 / CR-144: base time by difficulty
  // CR-144: times relaxed to give room for obstacle-based challenge
  const diffMap = [120, 100, 90, 80, 70];
  const diff    = (_conDef.difficulty || 1) - 1;
  const baseTime = diffMap[Math.max(0, Math.min(4, diff))];
  const starCount = (_conDef.stars || []).length;
  const bonus   = Math.max(0, (starCount - 7) * 5);  // +5s per extra star beyond 7
  _timeLeft     = baseTime + bonus;
  _levelInitTime = _timeLeft;  // Arch fix: store for time_ext cap

  // Set up item slots (STORY-00252) — effects activate on tap, not at level start
  _netSpeedMult = _netRadiusMult = _coinsMult = 1;
  _debrisRadiusMult = 1;
  _bombActive = false;
  _starMapActive = false; _starMapTimer = 0;  // STORY-00296
  _gloveActive = false;
  _passiveCoins = false;
  _slots = [];
  _slotBoxes = [];

  for (const id of (state.selectedItems || [])) {
    if (id === 'double_coins') {
      // Passive: auto-apply at start
      _coinsMult = 2;
      _passiveCoins = true;
      continue;
    }
    if (id === 'time_ext') {
      // Keep time_ext in slots for tactical tap — don't apply at start
    }
    const cfg = ITEM_CONFIG[id];
    if (cfg && _slots.length < 3) {
      _slots.push({ id, icon: cfg.icon, duration: cfg.duration, endTime: 0, used: false });
    }
  }

  // Stars from constellation data
  _initStars(W, H);

  // Debris + obstacles (STORY-00366)
  _initDebris(W, H);
  _initObstacles(W, H);

  initBgStars(W, H, 100);  // 100 stars for denser sky (STORY-00260)
  _initBgEnhance(W, H);   // STORY-00372: near-layer sparkles + grass seeds
  _particles = [];
  _paused = false;
  _lorePage = 0;
  _lorePages = [];
  _loreDismissed = false;
  _btnNext = _btnRetry = _btnReplay = _btnLevels = _btnShop = _btnGallery = _btnBomb = null;
  _btnPause = _btnResume = _btnPauseRetry = _btnPauseLevels = _btnLoreNext = null;

  // Preload victory photo (STORY-00246)
  if (_victoryPhotoFor !== _levelIdx) {
    _victoryPhoto = null;
    _victoryPhotoLoaded = false;
    _victoryPhotoFor = _levelIdx;
    const photos = _conDef.photos;
    if (photos && photos.length > 0) {
      try {
        const img = wx.createImage();
        img.onload  = () => { if (_victoryPhotoFor === _levelIdx) { _victoryPhoto = img; _victoryPhotoLoaded = true; } };
        img.onerror = () => {};
        img.src = photos[0];
      } catch (e) {}
    }
  }

  // Show hint only on first-ever game session
  try {
    const seen = wx.getStorageSync('__hintSeen');
    _hintTimer = seen ? 0 : HINT_DURATION;
    if (!seen) wx.setStorageSync('__hintSeen', '1');
  } catch (e) {
    _hintTimer = HINT_DURATION;
  }

  // SPRINT-55: load Ma Shan Zheng for result/pause title text
  if (!_maShanZhengLoaded) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.loadFontFace === 'function') {
        wx.loadFontFace({
          family: 'Ma Shan Zheng',
          source: "url('https://fonts.gstatic.com/s/mashanzheng/v10/NaPecZTRCLxvwo41b4gvzkXaRMTsDIRSfr0.woff2')",
          scopes: ['webgl', '2d'],
          success: () => { _maShanZhengLoaded = true; },
          fail: () => {},
        });
      }
    } catch (e) {}
  }

  onTouch('start', _onTouch);
  // Suppress system scroll indicator: register no-op touchmove handler.
  // WeChat mini-game shows a scroll bar residual if touchmove is unhandled.
  onTouch('move', _onTouchMove);
  _lastNow = 0;
  _rafId = requestAnimationFrame(_loop);

  // Auto-pause when app goes to background (STORY-00247)
  // Store ref so we can wx.offHide in _cleanup (prevents stacking on retry/replay)
  if (_onHideCb) { try { wx.offHide(_onHideCb); } catch (e) {} }
  _onHideCb = () => {
    if (_phase === 'play' && !_paused) {
      _paused = true;
    }
  };
  wx.onHide(_onHideCb);
}

export function hideGame() {
  _cleanup();
}

// ── Init helpers ──────────────────────────────────────────────
function _initStars(W, H) {
  _stars = [];
  // STORY-00365: X range [W*0.05, W*0.90], Y range [H*0.08, H*0.65]
  // Avoids HUD (top-left), star stays within visible area, no overlap with girl zone (Y > H*0.82)
  const skyX0 = W * 0.05, skyX1 = W * 0.90;
  const skyY0 = H * 0.08, skyY1 = H * 0.65;

  // STORY-00353: center constellation — compute centroid of normalized coords,
  // then shift all stars so centroid maps to sky center (0.5, 0.5).
  const rawStars = _conDef.stars;
  const cx0 = rawStars.reduce((s, st) => s + st.x, 0) / rawStars.length;
  const cy0 = rawStars.reduce((s, st) => s + st.y, 0) / rawStars.length;
  const shiftX = 0.5 - cx0;
  const shiftY = 0.5 - cy0;

  rawStars.forEach((s, i) => {
    // All stars warm white/gold (STORY-00235 — removes confusing multi-color system)
    const warmPalette = ['#fff8e0', '#ffd700', '#fffbe8', '#ffec6e'];
    const starColor = warmPalette[i % warmPalette.length];
    const r = Math.max(3, Math.min(8, magToRadius(s.mag) * 1.4));  // STORY-00273: max 8 (was 10)
    // Apply centering shift, clamp to [0.05, 0.95] so no star goes off screen
    const nx = Math.max(0.05, Math.min(0.95, s.x + shiftX));
    const ny = Math.max(0.05, Math.min(0.95, s.y + shiftY));
    let cx = skyX0 + nx * (skyX1 - skyX0);
    let cy = skyY0 + ny * (skyY1 - skyY0);

    // Minimum separation check — nudge position if too close to existing star (STORY-00273)
    for (let attempt = 0; attempt < 10; attempt++) {
      let tooClose = false;
      for (const existing of _stars) {
        const dx = cx - existing.x, dy = cy - existing.y;
        if (dx * dx + dy * dy < (r + existing.r + 6) * (r + existing.r + 6)) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) break;
      // Nudge: offset by a fraction of the sky area
      cx = skyX0 + ((nx + (attempt + 1) * 0.07) % 1.0) * (skyX1 - skyX0);
      cy = skyY0 + ((ny + (attempt + 1) * 0.06) % 1.0) * (skyY1 - skyY0);
    }

    _stars.push({
      x:     cx,
      y:     cy,
      r:     r,
      color: starColor,
      phase: (i * 1.618) % TWO_PI,
      speed: 1.5 + (i % 5) * 0.6,  // STORY-00294: was 0.4+(i%5)*0.15 — wider range for visible twinkling
      caught: false,
      idx:   i,  // STORY-00303: star index for reveal tracking
    });
  });
  _caught = 0;
  _total  = _stars.length;
}

function _initDebris(W, H) {
  _debris = [];
  const types = ['meteor', 'satellite', 'rocket', 'cloth'];
  // CR-144 difficulty debris counts: [0, 1, 2, 3, 4] for levels 1-5
  const debrisCounts = [0, 1, 2, 3, 4];
  const diff = Math.max(0, Math.min(4, (_conDef.difficulty || 1) - 1));
  const count = debrisCounts[diff];

  const skyX0 = 20, skyX1 = W - 20;
  const skyY0 = G.SAFE_TOP + 70, skyY1 = H * 0.58;

  for (let i = 0; i < count; i++) {
    _debris.push({
      x:    skyX0 + Math.random() * (skyX1 - skyX0),
      y:    skyY0 + Math.random() * (skyY1 - skyY0),
      r:    (14 + Math.random() * 4) * _debrisRadiusMult,
      type: types[i % types.length],
      spin: 0.010 + Math.random() * 0.020,
      angle: Math.random() * TWO_PI,
    });
  }
}

// STORY-00366: Initialize magnetic field zones and debris clouds
function _initObstacles(W, H) {
  _magnetZones  = [];
  _debrisClouds = [];

  const diff = Math.max(0, Math.min(4, (_conDef.difficulty || 1) - 1));
  // Magnetic zone counts: [0, 0, 1, 2, 3] for levels 1-5
  const magnetCounts = [0, 0, 1, 2, 3];
  // Debris cloud counts: [0, 0, 0, 1, 2] for levels 1-5
  const cloudCounts  = [0, 0, 0, 1, 2];

  const mCount = magnetCounts[diff];
  const cCount = cloudCounts[diff];

  // Star positions for spacing check
  const starPositions = _stars.map(s => ({ x: s.x, y: s.y }));
  const MIN_DIST = 60; // min distance from stars

  function tooClose(ox, oy) {
    for (const sp of starPositions) {
      const dx = ox - sp.x, dy = oy - sp.y;
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return true;
    }
    return false;
  }

  const playX0 = W * 0.10, playX1 = W * 0.85;
  const playY0 = H * 0.12, playY1 = H * 0.60;

  // Magnetic field zones (semi-transparent purple circles)
  for (let i = 0; i < mCount; i++) {
    let ox, oy, attempts = 0;
    do {
      ox = playX0 + Math.random() * (playX1 - playX0);
      oy = playY0 + Math.random() * (playY1 - playY0);
      attempts++;
    } while (tooClose(ox, oy) && attempts < 30);
    _magnetZones.push({ x: ox, y: oy, r: 40 + Math.random() * 20, angle: 0 });
  }

  // Debris clouds (3 small particles drifting together)
  for (let i = 0; i < cCount; i++) {
    let cx, cy, attempts = 0;
    do {
      cx = playX0 + Math.random() * (playX1 - playX0);
      cy = playY0 + Math.random() * (playY1 - playY0);
      attempts++;
    } while (tooClose(cx, cy) && attempts < 30);
    const particles = [];
    for (let p = 0; p < 3; p++) {
      const ang = (p / 3) * TWO_PI + Math.random() * 0.5;
      const dist = 8 + Math.random() * 10;
      particles.push({
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        r: 4 + Math.random() * 3,
        baseX: cx, baseY: cy,
      });
    }
    _debrisClouds.push({ x: cx, y: cy, particles });
  }
}

// STORY-00372: Initialize near-layer background sparkles + grass seeds (Sprint C bg upgrade)
function _initBgEnhance(W, H) {
  // 6 bright near-layer bg stars with diffraction arms — scattered across upper sky
  _nearBgSparkles = [];
  const nx = [0.08, 0.22, 0.45, 0.62, 0.78, 0.91];
  const ny = [0.10, 0.20, 0.07, 0.18, 0.12, 0.22];
  for (let i = 0; i < 6; i++) {
    _nearBgSparkles.push({
      x:   nx[i] * W,
      y:   ny[i] * H,
      r:   1.4 + i * 0.12,
      ph:  i * 1.1,
      spd: 0.35 + i * 0.07,
    });
  }

  // 6 grass stems scattered near poleX: 3 left, 3 right, ±20-90px
  _grassSeeds = [];
  const offsets = [-80, -45, -22, 22, 48, 85];
  for (let i = 0; i < 6; i++) {
    _grassSeeds.push({
      dx: offsets[i],               // x offset from _poleX
      h:  H * (0.030 + 0.012 * (i % 3)), // stem height 3-5.4% of H
      ph: i * 1.3,                  // phase offset for sway
    });
  }
}
function _cleanup() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  // CR-140: 恢复正常息屏（离开游戏界面时）
  try {
    if (typeof wx !== 'undefined' && wx.setKeepScreenOn) {
      wx.setKeepScreenOn({ keepScreenOn: false });
    }
  } catch (e) {}
  if (G.CANVAS) {
    offTouch('start', _onTouch);
    offTouch('move', _onTouchMove);
  }
  // Remove wx.onHide listener to prevent stacking (STORY-00247 fix)
  if (_onHideCb) {
    try { wx.offHide(_onHideCb); } catch (e) {}
    _onHideCb = null;
  }
  _stars   = [];
  _debris  = [];
  _magnetZones  = [];   // STORY-00366
  _debrisClouds = [];   // STORY-00366
  _particles = [];
  _shakeFrames = 0;
  _shakeX = 0;
  _shakeY = 0;
  _trailPoints = [];
  _catchFlashFrames = 0;
  _phase   = 'play';
  _paused  = false;
  _hintTimer = 0;
  _lingerTimer = 0;
  _caughtDebris = null;
  _btnNext = _btnRetry = _btnReplay = _btnLevels = _btnShop = _btnGallery = _btnBomb = null;
  _btnPause = _btnResume = _btnPauseRetry = _btnPauseLevels = _btnLoreNext = null;
  _lorePage = 0;
  _lorePages = [];
  _loreDismissed = false;
  _netSpeedMult = _netRadiusMult = _coinsMult = 1;
  _debrisRadiusMult = 1;
  _bombActive = false;
  _starMapActive = false; _starMapTimer = 0;  // STORY-00296: replaces _magnetActive
  _gloveActive = false;
  _slots = [];
  _slotBoxes = [];
  _passiveCoins = false;
  _celebrateTimer = 0;
  _lineDrawProgress = 0;
  _revealedStarSet.clear(); // STORY-00303: reset star reveal tracking
  _flashPhaseTimer = 0;    // STORY-00323: reset star flash state
  _flashedStarSet.clear();
  _flashingStars = [];
  // Sprint 67: reset girl animation state
  _girlFrame = 0; _girlPrevFrame = 0; _girlTransT = 1.0; _girlLastBlink = Date.now();
  // Destroy cached line-draw SFX context to prevent cross-game leak (Arch review fix)
  if (_lineDrawSfxCtx) {
    try { _lineDrawSfxCtx.destroy(); } catch (e) {}
    _lineDrawSfxCtx = null;
  }
}

// ── Main loop ─────────────────────────────────────────────────
function _loop(now) {
  if (_lastNow === 0) _lastNow = now;
  const dt = Math.min((now - _lastNow) / 1000, 0.05); // max 50ms cap
  _lastNow = now;
  _dt = dt;
  const t  = now * 0.001;

  const ctx = G.CTX;
  const W   = G.SCREEN_W;
  const H   = G.SCREEN_H;

  // ── Background ──────────────────────────────────────────────
  drawSkyBg(ctx, W, H, _scene.sky0, _scene.sky1, _scene.sky2);
  drawBgStars(ctx, t);
  _drawNearBgSparkles(ctx, t); // STORY-00372: near-layer sparkle stars
  if (_scene.aurora) {
    const auroraT = now * 0.0004;
    for (let i = 0; i < 3; i++) {
      const y = H * (0.15 + i * 0.07 + Math.sin(auroraT + i * 1.2) * 0.03);
      const grd = ctx.createLinearGradient(0, y - 20, 0, y + 20);
      grd.addColorStop(0, 'rgba(0,220,180,0)');
      grd.addColorStop(0.5, 'rgba(0,220,180,0.12)');
      grd.addColorStop(1, 'rgba(0,220,180,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, y - 20, W, 40);
    }
  }
  drawGroundSilhouette(ctx, W, H, _sceneIdx);

  if (_phase === 'play') {
    if (!_paused) {
      _updateTimer(dt);
      _updateNet(dt);
      _updateParticles(dt);
      _updateSlots(now);
      if (_starMapActive) { _starMapTimer -= dt; if (_starMapTimer <= 0) _starMapActive = false; }  // STORY-00296
      _updateShake();
      _updateObstacles(dt); // STORY-00366
    }

    // Apply screen shake offset (game world only — HUD stays fixed)
    const didShake = _shakeFrames > 0;
    if (didShake) {
      ctx.save();
      ctx.translate(_shakeX, _shakeY);
    }

    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawObstacles(ctx, t); // STORY-00366
    _drawDebris(ctx);
    _drawParticles(ctx);
    _drawGrass(ctx, t, W, H); // STORY-00372: grass stems
    _drawGirl(ctx);
    _drawNet(ctx);

    if (didShake) {
      ctx.restore();
    }

    // HUD and overlays drawn after shake restore — always screen-space fixed
    _drawHUD(ctx, W);
    if (_hintTimer > 0 && !_paused) _drawHint(ctx, W, H);
    if (_paused) _drawPauseOverlay(ctx, W, H);
  } else if (_phase === 'celebrate') {
    _updateParticles(dt);
    _celebrateTimer -= dt;
    if (_celebrateTimer <= 0) {
      _phase = 'starflash'; // STORY-00323: star flash sequence before linedraw
      _flashPhaseTimer = 0;
      _flashedStarSet.clear();
      _flashingStars = [];
    }
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawParticles(ctx);
    _drawGrass(ctx, t, W, H); // STORY-00372
    _drawGirl(ctx);
  } else if (_phase === 'starflash') {
    // STORY-00323: sequential star flash — each constellation-line star flashes before lines appear
    _flashPhaseTimer += dt;
    _updateStarFlash(dt, t);
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawParticles(ctx);
    _drawStarFlash(ctx, t);
    _drawGrass(ctx, t, W, H); // STORY-00372
    _drawGirl(ctx);
  } else if (_phase === 'linedraw') {
    _updateLineDrawProgress(dt);
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawAnimatedConLines(ctx);
    _drawParticles(ctx);
    _drawGrass(ctx, t, W, H); // STORY-00372
    _drawGirl(ctx);
  } else if (_phase === 'linger') {
    // STORY-00274: all lines drawn — stars pulse/flash for 1.5s before result
    _lingerTimer -= dt;
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawAnimatedConLines(ctx);
    _drawLingerFlash(ctx, t);
    _drawGrass(ctx, t, W, H); // STORY-00372
    _drawGirl(ctx);
    if (_lingerTimer <= 0) {
      _phase = 'result';
      _resultEnterTimer = 0; // STORY-00373: reset entrance animation
    }
  } else {
    // Still draw scene for visual context
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawDebris(ctx);
    _drawGrass(ctx, t, W, H); // STORY-00372
    _drawGirl(ctx);
    _drawResultOverlay(ctx, W, H);
  }

  // Global fade overlay (STORY-00282)
  tickFade(dt);
  drawFadeOverlay(ctx, W, H);

  // Guard: tickFade's callback (fadeNavigate) may have called navigate() → _cleanup() → _rafId=null.
  // If so, do NOT re-schedule _loop — another screen has already taken over the canvas.
  if (_rafId !== null) {
    _rafId = requestAnimationFrame(_loop);
  }
}

// ── Timer ─────────────────────────────────────────────────────
function _updateTimer(dt) {
  if (_timeLeft <= 0) return;
  _timeLeft -= dt;
  if (_timerFlash > 0) _timerFlash = Math.max(0, _timerFlash - dt);
  if (_hintTimer > 0) _hintTimer -= dt;

  if (_timeLeft <= 0) {
    _timeLeft = 0;
    _triggerResult(false);
  }
}

// ── Slot timer update ─────────────────────────────────────────
function _updateSlots(nowMs) {
  const wallMs = Date.now(); // use wall clock — endTime is set via Date.now() in _activateSlot
  for (const slot of _slots) {
    if (!slot.used || slot.duration === 0) continue;
    // Expire timed items
    if (wallMs >= slot.endTime) {
      // Deactivate effect
      switch (slot.id) {
        case 'net_speed':     _netSpeedMult    = 1;    break;
        case 'net_enlarge':   _netRadiusMult   = 1;    break;
        case 'shrink_debris': _debrisRadiusMult = 1;   break;
        case 'star_map':      _starMapActive   = false; break;  // STORY-00296
        case 'glove':         _gloveActive     = false; break;
      }
      slot.duration = -1; // mark fully expired (duration = -1 sentinel)
    }
  }
}

// ── Slot activation ───────────────────────────────────────────
function _activateSlot(slotIdx, nowMs) {
  const slot = _slots[slotIdx];
  if (!slot || slot.used) return;
  if (!state.useItem(slot.id)) return; // not owned

  slot.used = true;
  if (slot.duration > 0) {
    slot.endTime = nowMs + slot.duration * 1000;
  }

  switch (slot.id) {
    case 'net_speed':     _netSpeedMult    = 1.5;  break;
    case 'net_enlarge':   _netRadiusMult   = 1.5;  break;
    case 'space_bomb':
      // Destroy currently caught debris + reset net (web parity: STORY-00296 Arch fix)
      if (_caughtDebris) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * TWO_PI;
          const speed = 3 + Math.random() * 4;
          _particles.push({
            x: _caughtDebris.x, y: _caughtDebris.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30, maxLife: 30,
            color: i % 2 === 0 ? '#ff6600' : '#ffcc00',
          });
        }
        const idx = _debris.indexOf(_caughtDebris);
        if (idx >= 0) _debris.splice(idx, 1);
        _caughtDebris = null;
      }
      // Reset net to swing state
      _netState = 'swing'; _netLen = 0;
      break;
    case 'time_ext':
      _timeLeft = Math.min(_timeLeft + 20, _levelInitTime + 20);  // STORY-00297 + Arch cap fix
      AudioAdapter.playSFX(SFX_TIMEEXT);
      break;
    case 'shrink_debris': _debrisRadiusMult = 0.5; break;
    case 'star_map':      _starMapActive = true; _starMapTimer = 60; break;  // STORY-00296: star_map replaces star_magnet
    case 'glove':         _gloveActive     = true;  break;
  }
}

// ── Net ───────────────────────────────────────────────────────
function _updateNet(dt) {
  // dt in seconds; scale by 60 so constants remain calibrated at 60fps reference
  const scale = dt * 60;
  if (_netState === 'swing') {
    _swingT += SWING_SPEED * scale;
    _netAngle = Math.sin(_swingT) * SWING_AMP;
    _netLen   = 0;
  } else if (_netState === 'extend') {
    _netLen += NET_SPEED * _netSpeedMult * scale;
    if (_netLen >= _netMaxLen) {
      _netLen = _netMaxLen;
      if (_extendHold < 12) {
        _extendHold++;          // hold at full extension ~0.2s before retracting
        _updateNetHead(dt);
        _checkCollisions();
      } else {
        _extendHold = 0;
        _netState   = 'retract';
      }
    } else {
      _updateNetHead(dt);
      _checkCollisions();
    }
    // Record trail point + spawn launch trail particles (STORY-00257/00259)
    _trailPoints.push({ x: _netHeadX, y: _netHeadY });
    if (_trailPoints.length > ARC_TRAIL_LEN) _trailPoints.shift();
    // Spawn 3-4 glowing trail particles per frame (BUG-00261 fix: was single probabilistic spawn)
    const trailCount = 3 + (Math.random() < 0.5 ? 1 : 0);  // 3 or 4 per frame
    for (let tp = 0; tp < trailCount; tp++) {
      _particles.push({
        x: _netHeadX + (Math.random() - 0.5) * 5,
        y: _netHeadY + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 15,
        maxLife: 15,
        color: '#ffffff',
        r: 1.5 + Math.random() * 1.0,
      });
    }
  } else if (_netState === 'retract') {
    // STORY-00286: if holding debris, retract very slowly (feels heavy); else normal speed
    const retractSpeed = _caughtDebris ? NET_SPEED * 0.20 : NET_SPEED;  // was 0.30
    _netLen -= retractSpeed * scale;
    if (_netLen <= 0) {
      _netLen   = 0;
      _netState = 'swing';
      _trailPoints = [];  // clear trail when retracted
      // Apply debris time penalty on arrival (STORY-00279)
      if (_caughtDebris) {
        if (!_gloveActive) {
          _timeLeft  = Math.max(0, _timeLeft - 1.0);
          _timerFlash = 0.5;
        }
        // Arch review: remove caught debris from array so it cannot be caught again
        const idx = _debris.indexOf(_caughtDebris);
        if (idx >= 0) _debris.splice(idx, 1);
        _caughtDebris = null;
      }
    }
  }
  _updateNetHead();
}

function _updateNetHead(dt) {
  // Rope origin: use right wrist position from skeletal arm (_skelRHandX/Y).
  // Falls back to hardcoded offset if _drawGirl hasn't run yet (first frame).
  const ropeOriX = _skelRHandX > 0 ? _skelRHandX : _poleX + 20;
  const ropeOriY = _skelRHandY > 0 ? _skelRHandY : _poleY - 65;

  // STORY-00366: Magnetic zone deflection — when net head enters a zone, deflect angle
  if (_netState === 'extend') {
    for (const mz of _magnetZones) {
      const hx = ropeOriX + Math.sin(_netAngle) * _netLen;
      const hy = ropeOriY - Math.cos(_netAngle) * _netLen;
      const dx = hx - mz.x, dy = hy - mz.y;
      if (dx * dx + dy * dy < mz.r * mz.r) {
        // Deflect: push angle away from zone center by ±0.04 rad per frame
        const deflect = (hx > mz.x ? 1 : -1) * 0.04 * (dt || 1/60) * 60;
        _netAngle += deflect;
      }
    }
  }

  _netHeadX = ropeOriX + Math.sin(_netAngle) * _netLen;
  _netHeadY = ropeOriY - Math.cos(_netAngle) * _netLen;
}

function _checkCollisions() {
  if (_netState !== 'extend') return;

  // Check stars
  for (const s of _stars) {
    if (s.caught) continue;
    const dx = _netHeadX - s.x;
    const dy = _netHeadY - s.y;
    if (dx * dx + dy * dy <= (s.r + 20 * _netRadiusMult) * (s.r + 20 * _netRadiusMult)) {
      s.caught = true;
      _caught++;
      _spawnParticles(s.x, s.y, s.color);
      _netState = 'retract';
      _catchFlashFrames = 18;  // ~0.3s gold flash + catch frame (was 3)
      AudioAdapter.playSFX(SFX_CATCH);

      if (_caught >= _total) {
        _triggerResult(true);
      }
      return;
    }
  }

  // Check debris
  for (const d of _debris) {
    const dx = _netHeadX - d.x;
    const dy = _netHeadY - d.y;
    if (dx * dx + dy * dy <= (d.r + 18 * _netRadiusMult) * (d.r + 18 * _netRadiusMult)) {
      // STORY-00279: mark debris as caught — time penalty applied on retract complete
      _caughtDebris = d;
      // Screen shake on debris hit (STORY-00259)
      _shakeFrames = 6;
      AudioAdapter.playSFX(SFX_DEBRIS);
      _netState   = 'retract';
      return;
    }
  }

  // STORY-00366: Debris cloud collision — touching any particle resets the net
  for (const cloud of _debrisClouds) {
    for (const p of cloud.particles) {
      const dx = _netHeadX - p.x;
      const dy = _netHeadY - p.y;
      if (dx * dx + dy * dy <= (p.r + 14) * (p.r + 14)) {
        _shakeFrames = 4;
        AudioAdapter.playSFX(SFX_DEBRIS);
        _netState = 'retract';
        return;
      }
    }
  }
}

// ── Particles ─────────────────────────────────────────────────
function _spawnParticles(x, y, color) {
  // 12 particles: 6 gold + 3 white + 3 star-color (STORY-00259)
  const colors = ['#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700',
                  '#ffffff', '#ffffff', '#ffffff', color, color, color];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TWO_PI + Math.random() * 0.3;
    const speed = 2.5 + Math.random() * 3;
    _particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 36,
      maxLife: 36,
      color: colors[i],
      r: 5,
    });
  }
}

function _updateParticles(dt) {
  const scale = dt * 60;
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x    += p.vx * scale;
    p.y    += p.vy * scale;
    if (p.gravity) p.vy += p.gravity * scale;  // gravity for victory particles (STORY-00260)
    p.life -= scale;
    if (p.life <= 0) _particles.splice(i, 1);
  }
}

// ── Screen shake (STORY-00259) ────────────────────────────────
function _updateShake() {
  if (_shakeFrames <= 0) return;
  _shakeFrames--;
  if (_shakeFrames > 0) {
    _shakeX = (Math.random() - 0.5) * 6;
    _shakeY = (Math.random() - 0.5) * 6;
  } else {
    _shakeX = 0;
    _shakeY = 0;
  }
}

// ── Draw: constellation lines ─────────────────────────────────
function _drawConLines(ctx) {
  if (!_conDef.lines) return;
  // star_map item: show bright lines when active; dim lines otherwise (STORY-00296)
  const alpha = _starMapActive ? 0.65 : 0.22;
  ctx.save();
  ctx.strokeStyle = `rgba(255,210,100,${alpha})`;
  ctx.lineWidth   = _starMapActive ? 1.8 : 1;
  for (const [ai, bi] of _conDef.lines) {
    const a = _stars[ai], b = _stars[bi];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Victory: line draw animation progress ────────────────────
function _updateLineDrawProgress(dt) {
  if (!_conDef.lines || _conDef.lines.length === 0) {
    _phase = 'linger';
    _lingerTimer = 1.5;
    return;
  }
  const totalLines = _conDef.lines.length;
  const totalDuration = Math.max(totalLines * 0.35, 1.5);  // STORY-00274: slowed from 0.12
  const prevDrawn = Math.floor(_lineDrawProgress);
  _lineDrawProgress += (dt / totalDuration) * totalLines;
  const newDrawn = Math.floor(_lineDrawProgress);
  // Play SFX for each newly drawn line (STORY-00259) — reuse cached context to avoid leak
  if (newDrawn > prevDrawn && newDrawn <= totalLines) {
    try {
      if (!_lineDrawSfxCtx) {
        _lineDrawSfxCtx = wx.createInnerAudioContext();
        _lineDrawSfxCtx.src = SFX_CATCH;
        _lineDrawSfxCtx.volume = 0.4;  // fixed: was 0.3, AC specifies 0.4
      }
      _lineDrawSfxCtx.stop();
      _lineDrawSfxCtx.play();
    } catch (e) {}
    // STORY-00303: mark stars revealed as each line completes
    for (let li = prevDrawn; li < newDrawn && li < totalLines; li++) {
      _revealedStarSet.add(_conDef.lines[li][0]);
      _revealedStarSet.add(_conDef.lines[li][1]);
    }
  }
  if (_lineDrawProgress >= totalLines) {
    _lineDrawProgress = totalLines;
    _phase = 'linger';       // STORY-00274: linger before result
    _lingerTimer = 1.5;
  }
}

// ── Victory: animated constellation lines (STORY-00260) ──────
function _drawAnimatedConLines(ctx) {
  if (!_conDef.lines) return;
  const drawn = Math.floor(_lineDrawProgress);
  ctx.save();
  ctx.lineWidth   = 2.5;
  for (let i = 0; i <= drawn && i < _conDef.lines.length; i++) {
    const [ai, bi] = _conDef.lines[i];
    const a = _stars[ai], b = _stars[bi];
    if (!a || !b) continue;
    // Newest line pulses bright, older lines settle at 0.75
    const isNewest = i === drawn;
    const baseAlpha = isNewest ? _lineDrawProgress - drawn : 0.75;
    const alpha = isNewest ? Math.min(1.0, baseAlpha * 2) : 0.75;
    ctx.strokeStyle = `rgba(255,215,0,${alpha.toFixed(2)})`;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = isNewest ? 16 : 12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Victory star flash sequence (STORY-00323) ────────────────
// Sequential: each pair of stars in constellation.lines flashes 150ms apart
// Flash animation: scale 1→2→1 over FLASH_DUR seconds, with shadowBlur glow
const FLASH_INTERVAL = 0.15; // seconds between each star reveal
const FLASH_DUR      = 0.35; // seconds per star flash animation

function _updateStarFlash(dt, t) {
  if (!_conDef.lines || _conDef.lines.length === 0) {
    // No lines — skip directly to linedraw
    _phase = 'linedraw';
    _lineDrawProgress = 0;
    return;
  }
  // Determine which stars should be revealed based on elapsed time
  const totalStarSlots = _conDef.lines.length * 2; // both endpoints per line
  const revealIdx = Math.floor(_flashPhaseTimer / FLASH_INTERVAL);

  // Add newly revealed stars
  let slot = 0;
  for (let li = 0; li < _conDef.lines.length; li++) {
    const [ai, bi] = _conDef.lines[li];
    for (const starIdx of [ai, bi]) {
      if (slot <= revealIdx && !_flashedStarSet.has(starIdx)) {
        _flashedStarSet.add(starIdx);
        _flashingStars.push({ idx: starIdx, startT: t });
        // Also add to revealedStarSet so linedraw knows which to reveal
        _revealedStarSet.add(starIdx);
      }
      slot++;
    }
  }

  // Check if all stars have been flashed and their animations are complete
  const allRevealed = _flashedStarSet.size >= totalStarSlots || revealIdx >= totalStarSlots;
  if (allRevealed) {
    const oldestFlash = _flashingStars[0];
    const flashAge = oldestFlash ? (t - oldestFlash.startT) : FLASH_DUR;
    if (flashAge >= FLASH_DUR) {
      // All stars flashed — transition to linedraw
      _phase = 'linedraw';
      _lineDrawProgress = 0;
    }
  }
}

function _drawStarFlash(ctx, t) {
  if (!_flashingStars.length) return;
  ctx.save();
  for (const entry of _flashingStars) {
    const s = _stars[entry.idx];
    if (!s) continue;
    const age = t - entry.startT;
    if (age > FLASH_DUR) continue; // animation complete
    // Scale pulse: 1 → 2 → 1 over FLASH_DUR
    const progress = age / FLASH_DUR;
    const scale = 1 + Math.sin(progress * Math.PI) * 1.0; // peak scale = 2.0
    const glow  = Math.sin(progress * Math.PI) * 20;      // peak shadowBlur = 20

    ctx.save();
    ctx.globalAlpha = 0.85 + Math.sin(progress * Math.PI) * 0.15;
    ctx.shadowColor = '#ffe566';
    ctx.shadowBlur  = glow;
    ctx.fillStyle   = '#ffe566';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * scale, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── Victory linger: stars pulse bright (STORY-00274) ─────────
function _drawLingerFlash(ctx, t) {
  if (!_conDef.lines || !_stars) return;
  // Collect which star indices appear in constellation lines
  const linedStarSet = new Set();
  for (const [ai, bi] of _conDef.lines) { linedStarSet.add(ai); linedStarSet.add(bi); }
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 5.5));  // fast pulse ~0.57s period
  ctx.save();
  for (const idx of linedStarSet) {
    const s = _stars[idx];
    if (!s) continue;
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffe566';
    ctx.shadowBlur  = 20 * pulse;
    ctx.fillStyle   = '#ffe566';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 1.3, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

// ── Draw: near-layer bg sparkles (STORY-00372 Sprint C) ──
// 6 bright near-layer background stars with cross diffraction arms
// Called after drawBgStars — adds depth without touching canvas-utils
function _drawNearBgSparkles(ctx, t) {
  ctx.save();
  for (const s of _nearBgSparkles) {
    const a = 0.30 + 0.28 * Math.abs(Math.sin(t * s.spd + s.ph));
    const armLen = s.r * (3.5 + 2.0 * Math.abs(Math.sin(t * s.spd * 1.4 + s.ph)));

    // Core
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#e8f4ff';
    ctx.shadowColor = '#cce8ff';
    ctx.shadowBlur  = s.r * 5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cross diffraction arms
    ctx.strokeStyle = _hexAlpha('#ddeeff', a * 0.55);
    ctx.lineWidth   = 0.8;
    ctx.lineCap     = 'round';
    ctx.shadowColor = '#cce8ff';
    ctx.shadowBlur  = 3;
    ctx.beginPath(); ctx.moveTo(s.x - armLen, s.y); ctx.lineTo(s.x + armLen, s.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x, s.y - armLen); ctx.lineTo(s.x, s.y + armLen); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Draw: grass stems (STORY-00372 Sprint C) ──
// 6 bezier grass stems near poleX base — decorative foreground
function _drawGrass(ctx, t, W, H) {
  const baseY = _poleY + 6; // slightly below pole base
  ctx.save();
  ctx.strokeStyle = '#050810';
  ctx.lineWidth   = 1.2;
  ctx.lineCap     = 'round';
  ctx.globalAlpha = 0.85;
  for (const g of _grassSeeds) {
    const sway = Math.sin(t * 0.8 + g.ph) * 3; // ±3px sway
    const tipX  = _poleX + g.dx + sway;
    const tipY  = baseY - g.h;
    const ctrlX = _poleX + g.dx + sway * 0.5;
    const ctrlY = baseY - g.h * 0.5;
    ctx.beginPath();
    ctx.moveTo(_poleX + g.dx, baseY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Draw: stars (STORY-00260 sparkle upgrade, STORY-00371 mag tiering) ──
function _drawStars(ctx, t) {
  // STORY-00303: in linedraw/linger phase, dim unrevealed stars; brighten revealed ones (web parity)
  // STORY-00323: also dim stars during starflash — only _flashedStarSet members are bright
  const inRevealPhase = (_phase === 'starflash' || _phase === 'linedraw' || _phase === 'linger');
  for (const s of _stars) {
    if (s.caught) {
      // Caught stars: dim, small, grey
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle   = '#aaaacc';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.4, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      continue;
    }
    // STORY-00303: during linedraw/linger, unrevealed stars are dim (alpha 0.3 base), revealed are full bright
    // STORY-00323: during starflash, use _flashedStarSet (not _revealedStarSet)
    const flashRevealSet = _phase === 'starflash' ? _flashedStarSet : _revealedStarSet;
    const revealed = !inRevealPhase || flashRevealSet.has(s.idx);
    const alphaBase = revealed ? (0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase))) : 0.3;
    const alpha = alphaBase;

    // STORY-00371: 3-tier magnitude rendering
    const mag = s.mag != null ? s.mag : 3;
    let tierColor, coreR, haloR, sparkDirs;
    if (mag < 2.5) {
      // Bright star: blue-white, large halo, 8-direction sparkle
      tierColor = '#ddeeff';
      coreR     = 6 + 2 * Math.abs(Math.sin(t * s.speed * 0.7 + s.phase));   // 6-8px
      haloR     = 30 + 10 * Math.abs(Math.sin(t * s.speed * 0.5 + s.phase)); // 30-40px
      sparkDirs = 8;
    } else if (mag < 4) {
      // Medium star: warm gold, moderate halo, 4-direction sparkle
      tierColor = '#ffe0a0';
      coreR     = 4 + 1 * Math.abs(Math.sin(t * s.speed * 0.7 + s.phase));   // 4-5px
      haloR     = 16 + 6 * Math.abs(Math.sin(t * s.speed * 0.5 + s.phase));  // 16-22px
      sparkDirs = 4;
    } else {
      // Dim star: cool white, small halo, no sparkle
      tierColor = '#ccddff';
      coreR     = 2 + 1 * Math.abs(Math.sin(t * s.speed * 0.7 + s.phase));   // 2-3px
      haloR     = 8 + 4 * Math.abs(Math.sin(t * s.speed * 0.5 + s.phase));   // 8-12px
      sparkDirs = 0;
    }

    // Glow halo
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
    grd.addColorStop(0, _hexAlpha(tierColor, alpha * 0.40));
    grd.addColorStop(0.4, _hexAlpha(tierColor, alpha * 0.15));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y, haloR, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Core
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = tierColor;
    ctx.shadowColor = tierColor;
    ctx.shadowBlur  = revealed ? coreR * 7.5 : coreR * 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, coreR, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Sparkle arms (0 = none, 4 = cross, 8 = cross + diagonal)
    if (sparkDirs > 0) {
      const sparkleLen  = coreR * (2.2 + 1.3 * Math.abs(Math.sin(t * s.speed * 1.3 + s.phase)));
      const sparkleAlpha = alpha * 0.70;
      ctx.save();
      ctx.strokeStyle = _hexAlpha(tierColor, sparkleAlpha);
      ctx.lineWidth   = mag < 2.5 ? 1.2 : 0.9;
      ctx.lineCap     = 'round';
      ctx.shadowColor = tierColor;
      ctx.shadowBlur  = 4;
      // Horizontal arm
      ctx.beginPath();
      ctx.moveTo(s.x - sparkleLen, s.y);
      ctx.lineTo(s.x + sparkleLen, s.y);
      ctx.stroke();
      // Vertical arm
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - sparkleLen);
      ctx.lineTo(s.x, s.y + sparkleLen);
      ctx.stroke();
      // Diagonal arms for 8-direction (bright stars always show, plus peak fade-in for medium)
      if (sparkDirs === 8 || alpha > 0.85) {
        const diagLen = sparkleLen * 0.60;
        const diagAlpha = sparkDirs === 8
          ? sparkleAlpha * 0.80
          : (alpha - 0.85) / 0.15 * 0.5;
        ctx.globalAlpha = diagAlpha;
        ctx.beginPath();
        ctx.moveTo(s.x - diagLen, s.y - diagLen);
        ctx.lineTo(s.x + diagLen, s.y + diagLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x + diagLen, s.y - diagLen);
        ctx.lineTo(s.x - diagLen, s.y + diagLen);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ── STORY-00366: Update obstacle state ───────────────────────
function _updateObstacles(dt) {
  // Rotate magnet zone border animation
  for (const mz of _magnetZones) {
    mz.angle = (mz.angle || 0) + dt * 1.2;
  }
  // Drift debris cloud particles in slow orbit around cloud center
  for (const cloud of _debrisClouds) {
    for (const p of cloud.particles) {
      p.x += p.vx;
      p.y += p.vy;
      // Gentle spring back towards orbit
      const dx = p.x - p.baseX, dy = p.y - p.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist > 25) {
        p.vx -= dx / dist * 0.08;
        p.vy -= dy / dist * 0.08;
      }
    }
  }
}

// ── STORY-00366: Draw magnetic zones and debris clouds ────────
function _drawObstacles(ctx, t) {
  // Magnetic field zones
  for (const mz of _magnetZones) {
    ctx.save();
    ctx.translate(mz.x, mz.y);

    // Fill: semi-transparent purple
    const fillGrd = ctx.createRadialGradient(0, 0, 0, 0, 0, mz.r);
    fillGrd.addColorStop(0, 'rgba(150,80,255,0.18)');
    fillGrd.addColorStop(0.6, 'rgba(100,40,200,0.12)');
    fillGrd.addColorStop(1, 'rgba(80,20,180,0)');
    ctx.fillStyle = fillGrd;
    ctx.beginPath(); ctx.arc(0, 0, mz.r, 0, TWO_PI); ctx.fill();

    // Rotating dashed border
    ctx.rotate(mz.angle);
    ctx.strokeStyle = 'rgba(180,100,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(0, 0, mz.r, 0, TWO_PI); ctx.stroke();
    ctx.setLineDash([]);

    // Inner magnetic icon (small ⊕ symbol using canvas paths)
    ctx.rotate(-mz.angle); // counter-rotate so icon stays upright
    ctx.strokeStyle = 'rgba(200,140,255,0.70)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TWO_PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();

    ctx.restore();
  }

  // Debris clouds
  for (const cloud of _debrisClouds) {
    for (const p of cloud.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // Red-orange warning glow
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2.5);
      grd.addColorStop(0, 'rgba(255,120,60,0.35)');
      grd.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, p.r * 2.5, 0, TWO_PI); ctx.fill();
      // Core
      ctx.fillStyle = '#cc4422';
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TWO_PI); ctx.fill();
      ctx.restore();
    }
  }
}

// ── Draw: debris ──────────────────────────────────────────────
function _drawDebris(ctx) {
  for (const d of _debris) {
    if (d === _caughtDebris) continue;  // Arch review: skip — already drawn at net head in _drawNet
    d.angle += d.spin * (_dt * 60);
    ctx.save();
    ctx.translate(d.x, d.y);

    // Red warning glow (danger signal)
    const warnGrd = ctx.createRadialGradient(0, 0, d.r * 0.6, 0, 0, d.r * 3.0);
    warnGrd.addColorStop(0, 'rgba(255,40,40,0.28)');
    warnGrd.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = warnGrd;
    ctx.beginPath();
    ctx.arc(0, 0, d.r * 3.0, 0, TWO_PI);
    ctx.fill();

    ctx.rotate(d.angle);
    switch (d.type) {
      case 'meteor':    _drawMeteor(ctx, d.r);    break;
      case 'satellite': _drawSatellite(ctx, d.r); break;
      case 'rocket':    _drawRocket(ctx, d.r);    break;
      case 'cloth':     _drawCloth(ctx, d.r);     break;
    }

    ctx.restore();
  }
}

function _drawMeteor(ctx, r) {
  ctx.fillStyle = '#8a6840';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = r * 1.5;
  ctx.beginPath();
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const a   = (i / sides) * TWO_PI;
    const rr  = r * (0.55 + (i % 2) * 0.40);
    const px  = Math.cos(a) * rr;
    const py  = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function _drawSatellite(ctx, r) {
  // Body
  ctx.fillStyle = '#8899aa';
  ctx.fillRect(-r * 0.35, -r * 0.55, r * 0.70, r * 1.10);
  // Solar panels
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(-r * 1.40, -r * 0.20, r * 0.90, r * 0.40);
  ctx.fillRect( r * 0.50, -r * 0.20, r * 0.90, r * 0.40);
  // Antenna
  ctx.strokeStyle = '#aabbcc';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(0, -r * 1.0);
  ctx.stroke();
}

function _drawRocket(ctx, r) {
  // Body
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.10);
  ctx.lineTo(r * 0.35, -r * 0.30);
  ctx.lineTo(r * 0.35, r * 0.60);
  ctx.lineTo(-r * 0.35, r * 0.60);
  ctx.lineTo(-r * 0.35, -r * 0.30);
  ctx.closePath();
  ctx.fill();
  // Nozzle
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.arc(0, r * 0.70, r * 0.22, 0, TWO_PI);
  ctx.fill();
  // Exhaust glow
  ctx.fillStyle = 'rgba(255,120,40,0.45)';
  ctx.beginPath();
  ctx.arc(0, r * 0.90, r * 0.15, 0, TWO_PI);
  ctx.fill();
}

function _drawCloth(ctx, r) {
  ctx.strokeStyle = '#886644';
  ctx.lineWidth   = 2;
  ctx.fillStyle   = 'rgba(150,100,60,0.35)';
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.40);
  ctx.bezierCurveTo(-r * 0.60, -r * 1.0, r * 0.60, -r * 1.0, r, -r * 0.40);
  ctx.bezierCurveTo(r * 1.1,  r * 0.30, r * 0.50,  r * 0.85, 0, r * 0.90);
  ctx.bezierCurveTo(-r * 0.50, r * 0.85, -r * 1.1, r * 0.30, -r, -r * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ── Draw: particles ───────────────────────────────────────────
function _drawParticles(ctx) {
  for (const p of _particles) {
    const alpha = p.life / p.maxLife;
    const pr = p.r || 3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = pr * 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

// ── Draw: girl character (Sprint A — PNG sprite; Sprint 67 — smooth transitions) ──
// Skeletal girl drawing — Phase 1 (bones only, no flesh).
// Body sprite: body_no_arms.png (220×220, arms/pole erased), scaled to 110×110 in-game.
// Right arm + pole: Canvas bone segments driven by _netAngle (swing) or pose keyframes.
// Left arm: Canvas bone segments, pose-driven.
// Scale: 110/220 = 0.5. Sprite origin: (dstX, dstY) = (_poleX-55, _poleY-98).
// Shoulder positions (sprite coords → canvas): L=(83,117)*0.5+origin, R=(133,117)*0.5+origin.
function _drawGirl(ctx) {
  const now = Date.now();
  const dt  = _skelLastMs > 0 ? Math.min(now - _skelLastMs, 50) : 16;
  _skelLastMs = now;

  // ── Blink logic — only used when body_no_arms.png is available ──
  // Frame transitions (_girlTransT) are skipped in skeletal mode to avoid flicker:
  // the body sprite is always frame 0 / single frame, no cross-fade needed.
  if (_netState === 'swing') {
    const elapsed = now - _girlLastBlink;
    if (_girlFrame === 0 && elapsed > 3500) { _girlLastBlink = now; _girlFrame = 1; }
    else if (_girlFrame === 1 && elapsed > 150) { _girlLastBlink = now; _girlFrame = 0; }
  } else {
    _girlFrame = 0;
  }
  _girlTransT = 1; // always 1 in skeletal mode — no cross-fade

  // ── Blend control: skeletal blends smoothly when state changes ──
  if (_netState === 'swing') {
    _skelBlendT = Math.max(0, _skelBlendT - dt / _SKEL_BLEND_MS);
  } else {
    _skelBlendT = Math.min(1, _skelBlendT + dt / _SKEL_BLEND_MS);
  }

  // ── Geometry constants (all in canvas pixels) ──
  const sc   = 0.5;                              // sprite → canvas scale
  const dstX = _poleX - 55;
  const dstY = _poleY - 110 + 12;               // = _poleY - 98
  const lShX = dstX + 83 * sc;                  // left  shoulder x
  const lShY = dstY + 117 * sc;                 // left  shoulder y
  const rShX = dstX + 133 * sc;                 // right shoulder x
  const rShY = dstY + 117 * sc;                 // right shoulder y
  const uLen = 28 * sc;                          // upper-arm length
  const fLen = 26 * sc;                          // forearm length
  const hR   = 6  * sc;                          // hand radius
  const pLen = 68 * sc;                          // pole length

  // ── Arm pose keyframes (degrees, same convention as demo) ──
  // 0=down, 90=right, 180=up. lLower/rLower = elbow bend relative to upper arm.
  // Swing: right arm driven by _netAngle live; left arm hangs naturally.
  // Extend/retract: right arm raised to ~upper-left (holding net up), left slightly forward.
  const POSES_SKEL = {
    swing:   { lUpper:  10, lLower:  -5, rUpper:   0, rLower:   0, poleAngle:  90 },
    extend:  { lUpper:  20, lLower: -10, rUpper: -130, rLower: -20, poleAngle: -55 },
    retract: { lUpper:  15, lLower:  -8, rUpper: -130, rLower: -20, poleAngle: -55 },
    catch:   { lUpper: -130, lLower: -20, rUpper: -130, rLower: -20, poleAngle: -60 },
  };

  // Determine target pose
  let poseName;
  if (_netState === 'extend') poseName = 'extend';
  else if (_netState === 'retract' && _catchFlashFrames > 0) poseName = 'catch';
  else if (_netState === 'retract') poseName = 'retract';
  else poseName = 'swing';

  const pose = POSES_SKEL[poseName];
  const swingPose = POSES_SKEL.swing;

  // Blend swing ↔ action pose based on _skelBlendT
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eio(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  const et = eio(_skelBlendT);
  let lUpper    = lerp(swingPose.lUpper,    pose.lUpper,    et);
  let lLower    = lerp(swingPose.lLower,    pose.lLower,    et);
  let rUpper    = lerp(swingPose.rUpper,    pose.rUpper,    et);
  let rLower    = lerp(swingPose.rLower,    pose.rLower,    et);
  let poleAngle = lerp(swingPose.poleAngle, pose.poleAngle, et);

  // During swing, override right arm+pole with net angle (rigid-rod from shoulder)
  // _netAngle: 0=up, positive=right (same as game physics).
  // Convert to bone degrees: bone 180=up, so rodAngle = 180 - netAngleDeg.
  const swingWeight = 1 - _skelBlendT;
  if (swingWeight > 0) {
    const netDeg = _netAngle * 180 / Math.PI;
    const rodAngle = 180 - netDeg;
    rUpper    = lerp(rUpper,    rodAngle,      swingWeight);
    rLower    = lerp(rLower,    0,             swingWeight * 0.5);
    poleAngle = lerp(poleAngle, rodAngle + 10, swingWeight);
  }

  // ── Draw body sprite (no arms) ──
  const bodyImg = _bodyNoArmsImg;
  const fallbackImg = _girlImg;
  const img = (bodyImg && bodyImg.complete !== false) ? bodyImg
            : (fallbackImg && fallbackImg.complete !== false) ? fallbackImg : null;
  if (img) {
    ctx.save();
    ctx.globalAlpha = 1;
    // body_no_arms.png: single 220×220 frame. girl.png fallback: use frame 0 (idle).
    ctx.drawImage(img, 0, 0, _GIRL_FRAME_W, _GIRL_FRAME_H, dstX, dstY, 110, 110);
    // Blink overlay: draw girl.png frame 1 (eyes closed) on top when blinking
    if (img === bodyImg && fallbackImg && fallbackImg.complete !== false && _girlFrame === 1) {
      ctx.drawImage(fallbackImg, 1 * _GIRL_FRAME_W, 0, _GIRL_FRAME_W, _GIRL_FRAME_H, dstX, dstY, 110, 110);
    }
    ctx.restore();
  }

  // ── Bone drawing helpers ──
  const SKIN_FILL   = '#FFDFC4';
  const SKIN_STROKE = '#D4A882';
  const POLE_COL    = '#EAB045';
  const POLE_STROKE = '#C8882A';

  function drawArm(ox, oy, uAng, lAng) {
    const uRad = uAng * Math.PI / 180;
    const ex = ox + Math.sin(uRad) * uLen;
    const ey = oy + Math.cos(uRad) * uLen;
    const lRad = uRad + lAng * Math.PI / 180;
    const wx2 = ex + Math.sin(lRad) * fLen;
    const wy2 = ey + Math.cos(lRad) * fLen;
    // Thicker lines for more "flesh" appearance
    const thick = 18 * sc;   // was 12*sc — wider = more body mass
    const thin  = 14 * sc;   // forearm slightly thinner
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Upper arm — outline + fill
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = SKIN_STROKE; ctx.lineWidth = thick + 2*sc; ctx.stroke();
    ctx.strokeStyle = SKIN_FILL;   ctx.lineWidth = thick; ctx.stroke();
    // Forearm
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(wx2, wy2);
    ctx.strokeStyle = SKIN_STROKE; ctx.lineWidth = thin + 2*sc; ctx.stroke();
    ctx.strokeStyle = SKIN_FILL;   ctx.lineWidth = thin; ctx.stroke();
    // Hand
    ctx.beginPath(); ctx.arc(wx2, wy2, hR + sc, 0, TWO_PI);
    ctx.fillStyle = SKIN_STROKE; ctx.fill();
    ctx.beginPath(); ctx.arc(wx2, wy2, hR - sc, 0, TWO_PI);
    ctx.fillStyle = SKIN_FILL; ctx.fill();
    return { wx: wx2, wy: wy2 };
  }

  function drawPole(wx2, wy2, pAng) {
    const pRad = pAng * Math.PI / 180;
    const px = wx2 + Math.sin(pRad) * pLen;
    const py = wy2 + Math.cos(pRad) * pLen;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(wx2, wy2); ctx.lineTo(px, py);
    ctx.strokeStyle = POLE_STROKE; ctx.lineWidth = 7*sc; ctx.stroke();
    ctx.strokeStyle = POLE_COL;    ctx.lineWidth = 5*sc; ctx.stroke();
    return { px, py };
  }

  // ── Draw left arm ──
  drawArm(lShX, lShY, lUpper, lLower);

  // ── Draw right arm + pole ──
  const rHand = drawArm(rShX, rShY, rUpper, rLower);
  // Export wrist position for _updateNetHead / _drawNet (rope origin sync)
  _skelRHandX = rHand.wx;
  _skelRHandY = rHand.wy;

  // Draw pole only during swing/retract (extend uses existing _drawNet pole rendering)
  if (_netState !== 'extend') {
    drawPole(rHand.wx, rHand.wy, poleAngle);
  }
}

// ── Draw: net — triangle bag (Sprint A, 方案B; Sprint 67 — swing visibility) ───────────────
function _drawNet(ctx) {
  const extended  = _netState === 'extend';
  const showLen   = _netState !== 'swing' ? _netLen : 28;  // Sprint 67: 28px visible pole during swing
  const angle     = _netAngle;
  const swingAlpha = _netState === 'extend' ? 1.0 : 0.55;   // Sprint 67: swing/retract semi-transparent

  // Rope origin: use right wrist position from skeletal arm (_skelRHandX/Y).
  // Falls back to hardcoded offset if skeletal data not yet available.
  const ropeOriX = _skelRHandX > 0 ? _skelRHandX : _poleX + 20;
  const ropeOriY = _skelRHandY > 0 ? _skelRHandY : _poleY - 65;

  // Net head position
  const headX = ropeOriX + Math.sin(angle) * showLen;
  const headY = ropeOriY - Math.cos(angle) * showLen;

  // ── Arc trail (STORY-00257) — glowing white dots behind head ──
  if (_trailPoints.length > 1) {
    ctx.save();
    for (let i = 0; i < _trailPoints.length; i++) {
      const tp   = _trailPoints[i];
      const frac = (i + 1) / _trailPoints.length;
      ctx.globalAlpha = frac * 0.6;
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = '#aaccff';
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, frac * 3.5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Bamboo pole ───────────────────────────────────────────────
  // Only draw code pole during swing/retract — throw frame sprite already has the pole drawn in it
  if (_netState !== 'extend') {
    const poleLen = Math.min(showLen + 22, 90);
    const px2 = ropeOriX + Math.sin(angle) * poleLen;
    const py2 = ropeOriY - Math.cos(angle) * poleLen;
    const pg = ctx.createLinearGradient(ropeOriX, ropeOriY, px2, py2);
    pg.addColorStop(0, '#6a4520'); pg.addColorStop(0.5, '#a07840'); pg.addColorStop(1, '#7a5828');
    ctx.save();
    ctx.globalAlpha = swingAlpha;
    ctx.strokeStyle = pg; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ropeOriX, ropeOriY); ctx.lineTo(px2, py2); ctx.stroke();
    ctx.restore();
  }

  // ── Thin string from pole tip to net head ────────────────────
  if (_netLen > 40) {
    const poleLen = Math.min(_netLen + 22, 90);
    const px2 = ropeOriX + Math.sin(angle) * poleLen;
    const py2 = ropeOriY - Math.cos(angle) * poleLen;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,180,140,0.60)';
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(headX, headY); ctx.stroke();
    ctx.restore();
  }

  // Sprint 67: removed early-return that hid net bag during swing — now always draw with swingAlpha

  const mouthR = (extended ? 16 : 10) * _netRadiusMult;
  const bagD   = mouthR * 1.9;
  const flashAlpha = _catchFlashFrames / 6;

  ctx.save();
  ctx.globalAlpha = swingAlpha;  // Sprint 67: semi-transparent during swing
  ctx.translate(headX, headY);
  ctx.rotate(angle);

  // Bag fill — mouth at headX/headY (pole tip), bag extends toward throw direction (-y in rotated frame)
  const bagGrd = ctx.createLinearGradient(0, 0, 0, -bagD);
  bagGrd.addColorStop(0, flashAlpha > 0 ? 'rgba(255,230,150,0.18)' : 'rgba(160,200,255,0.14)');
  bagGrd.addColorStop(1, 'rgba(80,120,200,0.04)');
  ctx.fillStyle = bagGrd;
  ctx.beginPath();
  ctx.arc(0, 0, mouthR, 0, Math.PI, false);
  ctx.bezierCurveTo(-mouthR * 0.9, -bagD * 0.5, -mouthR * 0.4, -bagD, 0, -bagD);
  ctx.bezierCurveTo(mouthR * 0.4, -bagD, mouthR * 0.9, -bagD * 0.5, mouthR, 0);
  ctx.closePath();
  ctx.fill();

  // Bag outline
  ctx.strokeStyle = flashAlpha > 0
    ? `rgba(255,220,100,${0.65 + flashAlpha * 0.35})`
    : 'rgba(180,210,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, mouthR, 0, Math.PI, false);
  ctx.bezierCurveTo(-mouthR * 0.9, -bagD * 0.5, -mouthR * 0.4, -bagD, 0, -bagD);
  ctx.bezierCurveTo(mouthR * 0.4, -bagD, mouthR * 0.9, -bagD * 0.5, mouthR, 0);
  ctx.stroke();

  // Net mesh — horizontal arcs and vertical seams toward -y (throw direction)
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = flashAlpha > 0 ? 'rgba(255,240,180,0.6)' : 'rgba(180,210,255,0.6)';
  ctx.lineWidth = 0.6;
  for (let i = 1; i <= 3; i++) {
    const yt = -(i / 4) * bagD;
    const xr = mouthR * (1 - i * 0.18);
    ctx.beginPath(); ctx.arc(0, yt, xr, 0, Math.PI, false); ctx.stroke();
  }
  for (let xi = -1; xi <= 1; xi += 2) {
    ctx.beginPath();
    ctx.moveTo(xi * mouthR * 0.5, 0);
    ctx.quadraticCurveTo(xi * mouthR * 0.35, -bagD * 0.5, xi * mouthR * 0.1, -bagD);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // Catch flash sparkles
  if (flashAlpha > 0) {
    _catchFlashFrames--;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    const t = Date.now() * 0.001;
    for (let i = 0; i < 6; i++) {
      const fa = (i / 6) * TWO_PI + t * 4;
      const fr = mouthR * 1.5 + (1 - flashAlpha) * 10;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(headX + Math.cos(fa) * fr, headY + Math.sin(fa) * fr, 1.5 + flashAlpha * 1.5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Caught debris drag visual (STORY-00286) ──────────────────
  if (_caughtDebris && _netState === 'retract') {
    const d = _caughtDebris;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = d.type === 'cloth' ? '#cc8844' : '#886644';
    ctx.shadowColor = 'rgba(255,100,30,0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(headX, headY + bagD * 0.6, (d.r || 12) * 0.7, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

// ── Tutorial hint ─────────────────────────────────────────────
function _drawHint(ctx, W, H) {
  const alpha = Math.min(1, _hintTimer / 0.5);  // fade out in last 0.5s
  const text  = '点击屏幕发射网兜！';
  const hintY = H * 0.50;
  const padX  = 24, padY = 12, r = 14;
  const fontSize = 18;

  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(text).width;
  const boxW = tw + padX * 2;
  const boxH = fontSize + padY * 2;
  const boxX = (W - boxW) / 2;
  const boxY = hintY - boxH / 2;

  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle   = 'rgba(10,14,50,0.88)';
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha  = alpha;
  ctx.fillStyle    = '#fffbe0';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = '#ffd700';
  ctx.shadowBlur   = 10;
  ctx.fillText(text, W / 2, hintY);
  ctx.restore();
}

// ── Draw: HUD ─────────────────────────────────────────────────
function _drawHUD(ctx, W) {
  const ST = G.SAFE_TOP;   // notch height (0 on non-notch phones)
  // HUD bar background — extends from y=0 down through the notch + 52px of UI
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,40,0.72)';
  ctx.fillRect(0, 0, W, ST + 52);
  ctx.restore();

  // Level name (top-left) — STORY-00311: web parity layout
  ctx.save();
  ctx.font         = 'bold 12px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = 'rgba(220,200,255,0.90)';
  const levelLabel = _conDef.nameZh + ' · 第' + (_levelIdx + 1) + '关';
  ctx.fillText(levelLabel, G.SAFE_LEFT + 14, ST + 26);
  ctx.restore();

  // Timer ring (center top) — STORY-00325 (CR-123): circular countdown ring matching web version
  {
    const t2 = Date.now() * 0.001;
    const timerUrgent = _timeLeft <= 10;
    const timerFlashing = _timerFlash > 0 || _timeLeft <= 15;
    const ringCX = W / 2;
    const ringCY = ST + 26;
    const baseR  = 18;
    // Pulse ring radius when urgent (2Hz)
    const ringR  = timerUrgent ? (baseR - 1 + 2 * Math.abs(Math.sin(t2 * Math.PI * 2))) : baseR;
    // Ratio of time remaining
    const ratio  = _levelInitTime > 0 ? Math.max(0, Math.min(1, _timeLeft / _levelInitTime)) : 1;
    const arcColor = (timerUrgent || timerFlashing) ? '#ff5252' : '#4fc3f7';

    ctx.save();
    // Background ring
    ctx.beginPath();
    ctx.arc(ringCX, ringCY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 4;
    ctx.stroke();
    // Progress arc (clockwise from top)
    if (ratio > 0) {
      ctx.beginPath();
      ctx.arc(ringCX, ringCY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth   = 4;
      if (timerUrgent) { ctx.shadowColor = arcColor; ctx.shadowBlur = 8; }
      ctx.stroke();
    }
    // Timer number inside ring
    const secsTotal = Math.ceil(_timeLeft);
    const mins = Math.floor(secsTotal / 60);
    const secs = secsTotal % 60;
    const timerStr = mins > 0 ? (mins + ':' + String(secs).padStart(2, '0')) : String(secs);
    ctx.font         = `bold 13px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = timerUrgent ? arcColor : '#ffffff';
    ctx.shadowBlur   = 0;
    ctx.fillText(timerStr, ringCX, ringCY);
    ctx.restore();
  }

  // Star count (top-right) — STORY-00311: moved from left to right for web parity
  ctx.save();
  ctx.font         = 'bold 14px sans-serif';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.starGold;
  ctx.fillText('★ ' + _caught + '/' + _total, W - G.SAFE_RIGHT - 50, ST + 26);
  ctx.restore();

  // Bomb button (legacy — kept for backward compat; slot system handles space_bomb now)
  _btnBomb = null;

  // ── Item slot HUD (STORY-00252) ────────────────────────────
  _slotBoxes = [];
  if (_slots.length > 0) {
    const SLOT_W = 48;
    const SLOT_H = 52;
    const SLOT_GAP = 6;
    const H = G.SCREEN_H;
    const totalW = _slots.length * SLOT_W + (_slots.length - 1) * SLOT_GAP;
    const startX = W - G.SAFE_RIGHT - totalW - 8;
    const startY = H - G.SAFE_BOTTOM - SLOT_H - 8;

    for (let i = 0; i < _slots.length; i++) {
      const slot = _slots[i];
      const sx = startX + i * (SLOT_W + SLOT_GAP);
      const sy = startY;

      // Determine slot state
      const isExpired = slot.used && (slot.duration <= 0 || slot.duration === -1);
      const isActive  = slot.used && slot.duration > 0 && slot.duration !== -1;
      const isReady   = !slot.used;

      // Background box
      ctx.save();
      ctx.globalAlpha = isExpired ? 0.35 : 0.85;
      ctx.fillStyle = isReady ? 'rgba(20,25,70,0.85)' : 'rgba(10,12,35,0.85)';
      ctx.strokeStyle = isActive ? '#ffd700' : (isReady ? 'rgba(150,160,220,0.7)' : 'rgba(80,85,120,0.4)');
      ctx.lineWidth = isActive ? 1.5 : 1;
      const r2 = 6;
      ctx.beginPath();
      ctx.moveTo(sx + r2, sy);
      ctx.lineTo(sx + SLOT_W - r2, sy);
      ctx.quadraticCurveTo(sx + SLOT_W, sy, sx + SLOT_W, sy + r2);
      ctx.lineTo(sx + SLOT_W, sy + SLOT_H - r2);
      ctx.quadraticCurveTo(sx + SLOT_W, sy + SLOT_H, sx + SLOT_W - r2, sy + SLOT_H);
      ctx.lineTo(sx + r2, sy + SLOT_H);
      ctx.quadraticCurveTo(sx, sy + SLOT_H, sx, sy + SLOT_H - r2);
      ctx.lineTo(sx, sy + r2);
      ctx.quadraticCurveTo(sx, sy, sx + r2, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.globalAlpha = isExpired ? 0.3 : 1;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(slot.icon, sx + SLOT_W / 2, sy + SLOT_H * 0.38);

      // Slot number
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = isReady ? '#aac0ff' : 'rgba(140,150,200,0.6)';
      ctx.fillText(String(i + 1), sx + SLOT_W / 2, sy + SLOT_H * 0.75);

      // Countdown bar for timed items
      if (isActive && slot.endTime > 0) {
        const now2 = Date.now();
        const remaining = Math.max(0, slot.endTime - now2);
        const pct = remaining / (slot.duration * 1000);
        const barW = (SLOT_W - 8) * pct;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = pct > 0.33 ? '#ffd700' : '#ff6644';
        ctx.fillRect(sx + 4, sy + SLOT_H - 7, barW, 4);
      }

      ctx.restore();

      // Store tap zone (only for unused slots)
      if (!slot.used) {
        _slotBoxes.push({ x: sx, y: sy, w: SLOT_W, h: SLOT_H, slotIdx: i });
      }
    }

    // Passive coins indicator
    if (_passiveCoins) {
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,215,0,0.8)';
      ctx.fillText('🪙×2', startX - 4, startY + SLOT_H / 2);
      ctx.restore();
    }
  }

  // Pause button (top-right corner, STORY-00282: moved right so timer doesn't overlap)
  const pauseX = W - G.SAFE_RIGHT - 36;
  const pauseY = ST + 6;
  _btnPause = { x: pauseX, y: pauseY, w: 36, h: 36 };
  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.70)';
  ctx.beginPath();
  ctx.arc(pauseX + 18, pauseY + 18, 18, 0, TWO_PI);
  ctx.fill();
  ctx.font         = '18px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#e8e8f0';
  ctx.fillText(_paused ? '▶' : '⚙', pauseX + 18, pauseY + 18);
  ctx.restore();
}

// ── Result: trigger ───────────────────────────────────────────
function _triggerResult(victory) {
  if (_phase !== 'play') return;
  _netState = 'swing';

  const coins   = victory ? Math.floor(_timeLeft) * 10 * _coinsMult : 0;
  // STORY-00344: star rating based on catch rate, not time left
  // 3★ = caught ≥90% of stars | 2★ = ≥60% | 1★ = <60% (but still victory)
  const catchRate = _total > 0 ? _caught / _total : 0;
  const stars3  = catchRate >= 0.90 ? 3 : catchRate >= 0.60 ? 2 : 1;
  const uncaught = _total - _caught;

  _result = { victory, timeLeft: _timeLeft, coins, stars: stars3, uncaught, caught: _caught, total: _total };
  _lorePage  = 0;
  _lorePages = []; // will be built on first result overlay render
  _loreDismissed = false;

  if (victory) {
    state.addCoins(coins);
    state.setScore(_levelIdx, { stars: stars3, time: _timeLeft });
    if (_levelIdx < 29) state.unlock(_levelIdx + 1);
  }

  // Items already consumed on activation via _activateSlot — just clear the list
  state.selectedItems = [];

  if (victory) {
    AudioAdapter.playSFX(SFX_VICTORY);
    // Spawn victory celebration particles — 40 particles with gravity (STORY-00260)
    const W = G.SCREEN_W;
    const H = G.SCREEN_H;
    for (let i = 0; i < 40; i++) {
      const pColor = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffd700' : '#ffee88';
      _particles.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 3,
        life: 80 + Math.random() * 40,
        maxLife: 120,
        color: pColor,
        r: 3 + Math.random() * 3,
        gravity: 0.04,
      });
    }
    _phase = 'celebrate';
    _celebrateTimer = 1.5;
    _starPopTimers = [0, 0, 0]; // STORY-00367: reset pop animation
  } else {
    _phase = 'result';
    _starPopTimers = [0, 0, 0]; // STORY-00367: reset pop animation
    _resultEnterTimer = 0;      // STORY-00373: reset entrance animation
  }
}

// ── Draw: result overlay (STORY-00322 / STORY-00367) ─────────
function _drawResultOverlay(ctx, W, H) {
  const r = _result;
  if (!r) return;

  // STORY-00367: Advance star pop timers
  for (let i = 0; i < 3; i++) {
    _starPopTimers[i] = (_starPopTimers[i] || 0) + _dt;
  }

  // STORY-00373: Card entrance animation — slide up + alpha fade over 0.5s
  _resultEnterTimer = (_resultEnterTimer || 0) + _dt;
  const enterProgress = Math.min(1, _resultEnterTimer / 0.50);  // 0→1 over 0.5s
  // ease-out: cubic
  const enterEase = 1 - Math.pow(1 - enterProgress, 3);
  const cardAlpha  = enterEase;
  const cardSlideY = (1 - enterEase) * 30;  // starts 30px lower, slides up

  const t = _lastNow * 0.001;

  // ── Nebula background layer (STORY-00367) ─────────────────────
  ctx.save();
  if (r.victory) {
    ctx.fillStyle = 'rgba(5,8,30,0.78)';
  } else {
    // STORY-00373: fail — breathing vignette overlay to feel like fading starlight
    const vignetteAlpha = 0.82 + 0.06 * Math.sin(t * 0.5); // slow pulse 0.76-0.88
    ctx.fillStyle = `rgba(2,5,22,${vignetteAlpha.toFixed(3)})`;
  }
  ctx.fillRect(0, 0, W, H);

  // Nebula wisps — canvas path clouds
  const nebulaColor = r.victory ? 'rgba(100,60,200,0.07)' : 'rgba(30,60,120,0.10)';
  for (let i = 0; i < 4; i++) {
    const nx = W * (0.15 + i * 0.22 + Math.sin(t * 0.3 + i) * 0.04);
    const ny = H * (0.25 + i * 0.12 + Math.cos(t * 0.2 + i * 1.5) * 0.03);
    const nr = 80 + i * 25;
    const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    grd.addColorStop(0, nebulaColor);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TWO_PI); ctx.fill();
  }
  ctx.restore();

  // ── Card (STORY-00373: entrance animation — slide up + alpha fade) ──
  const cardW = Math.min(W - 32, 340);
  const cardH = Math.min(H - 20, 360);
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  // Apply entrance: translate down by cardSlideY (starts at +30, animates to 0), fade in
  ctx.save();
  ctx.globalAlpha = cardAlpha;
  ctx.translate(0, cardSlideY);

  const bgGrd = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  if (r.victory) {
    bgGrd.addColorStop(0, 'rgba(25,18,55,0.97)');
    bgGrd.addColorStop(1, 'rgba(15,10,40,0.97)');
  } else {
    bgGrd.addColorStop(0, 'rgba(8,15,45,0.97)');
    bgGrd.addColorStop(1, 'rgba(5,8,30,0.97)');
  }
  ctx.fillStyle = bgGrd;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Border: gold shimmer for victory, subtle cold-blue for fail
  if (r.victory) {
    // Animated gold border shimmer
    const shimmerPos = (t * 0.8) % 1.0;
    const bGrd = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    bGrd.addColorStop(Math.max(0, shimmerPos - 0.3), 'rgba(255,215,0,0.30)');
    bGrd.addColorStop(shimmerPos, 'rgba(255,215,0,0.85)');
    bGrd.addColorStop(Math.min(1, shimmerPos + 0.3), 'rgba(255,215,0,0.30)');
    ctx.strokeStyle = bGrd;
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = 'rgba(80,120,200,0.30)';
    ctx.lineWidth = 1;
  }
  _roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.stroke();
  // Note: ctx.restore() for entrance animation is at end of _drawResultOverlay

  const cx = W / 2;
  const titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';

  // ── Title ──────────────────────────────────────────────────────
  const titleY = cardY + 28;
  ctx.save();
  ctx.font = `bold 22px ${titleFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (r.victory) {
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 14;
    ctx.fillText('星座揭秘！', cx, titleY);
  } else {
    // Cold blue-white for fail (STORY-00367: no emoji as main decoration)
    ctx.fillStyle = '#a8c4ff';
    ctx.shadowColor = '#4060c0';
    ctx.shadowBlur = 12;
    ctx.fillText('星光消逝了\u2026', cx, titleY); // STORY-00373: more evocative wording
  }
  ctx.restore();

  // ── Stars row (STORY-00367: pop-out animation for victory) ─────
  const starsY = titleY + 24;
  const starSpacing = 28;
  const starStartX = cx - starSpacing;
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.2; // 200ms per star
    const elapsed = (_starPopTimers[i] || 0) - delay;
    const filled = i < r.stars;
    let scale = 1.0;
    if (r.victory && elapsed > 0 && elapsed < 0.35) {
      // Pop: scale up to 1.5 then settle to 1.0
      scale = 1.0 + Math.sin(elapsed / 0.35 * Math.PI) * 0.5;
    }
    const sx = starStartX + i * starSpacing;
    ctx.save();
    ctx.translate(sx, starsY);
    ctx.scale(scale, scale);
    _drawStarShape(ctx, 0, 0, 9, filled ? '#ffd700' : 'rgba(255,255,255,0.20)', filled ? 'rgba(255,215,0,0.35)' : null);
    ctx.restore();
  }

  // ── Stats line ─────────────────────────────────────────────────
  const statsY = starsY + 20;
  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (r.victory) {
    ctx.fillStyle = 'rgba(255,215,0,0.85)';
    ctx.fillText('+' + r.coins + ' 金币   剩余 ' + Math.floor(Math.max(0, r.timeLeft)) + 's', cx, statsY);
  } else {
    ctx.fillStyle = 'rgba(160,180,240,0.80)';
    const caught = r.caught || 0;
    const total  = r.total  || 0;
    ctx.fillText('已捕获 ' + caught + '/' + total + ' 颗星', cx, statsY);
  }
  ctx.restore();

  // ── Content area ───────────────────────────────────────────────
  const btnAreaH = 52;
  const btnAreaY = cardY + cardH - btnAreaH;
  const contentY = statsY + 14;
  const contentH = btnAreaY - contentY - 4;

  if (r.victory) {
    // Photo area
    let photoBottom = contentY;
    const photoH = 120;
    const photoW = cardW - 16;
    const photoX = cardX + 8;

    if (_victoryPhotoLoaded && _victoryPhoto) {
      ctx.save();
      ctx.beginPath();
      _roundRect(ctx, photoX, contentY, photoW, photoH, 8);
      ctx.clip();
      ctx.drawImage(_victoryPhoto, photoX, contentY, photoW, photoH);
      ctx.restore();
      // Gold frame around photo
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,0,0.50)';
      ctx.lineWidth = 1.5;
      _roundRect(ctx, photoX, contentY, photoW, photoH, 8);
      ctx.stroke();
      ctx.restore();
      photoBottom = contentY + photoH + 6;
    } else {
      photoBottom = contentY;
    }

    // Lore text
    const storyH = btnAreaY - photoBottom - 8;
    if (_conDef.lore && storyH > 20 && !_loreDismissed) {
      if (_lorePages.length === 0) {
        _lorePages = _splitLorePages(_conDef.lore, 60);
        _lorePage = 0;
      }
      const page = _lorePages[_lorePage] || '';
      const totalPages = _lorePages.length;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cardX + 8, photoBottom, cardW - 16, storyH);
      ctx.clip();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLORS.text2;
      _drawWrappedText(ctx, page, cx, photoBottom + 4, cardW - 32, 16);
      ctx.restore();

      const fadeGrd = ctx.createLinearGradient(0, btnAreaY - 20, 0, btnAreaY - 2);
      fadeGrd.addColorStop(0, 'rgba(25,18,55,0)');
      fadeGrd.addColorStop(1, 'rgba(25,18,55,0.97)');
      ctx.save();
      ctx.fillStyle = fadeGrd;
      ctx.fillRect(cardX + 8, btnAreaY - 20, cardW - 16, 20);
      ctx.restore();

      if (totalPages > 1) {
        const isLast = _lorePage >= totalPages - 1;
        _btnLoreNext = drawButton(ctx, cardX + cardW - 82, btnAreaY - 28, 72, 22, isLast ? '完成 ✓' : '下一段 ›', {
          fontSize: 10, radius: 6,
          color0: 'rgba(80,60,140,0.75)', color1: 'rgba(60,90,180,0.75)',
        });
      } else {
        _btnLoreNext = null;
      }
    } else {
      _btnLoreNext = null;
    }

    // Buttons: 下一关 / 重玩 / 选关
    const btnH = 36;
    const btnGap = 6;
    const totalBtnW = cardW - 24;
    const btnW3 = (totalBtnW - btnGap * 2) / 3;
    const bY = btnAreaY + (btnAreaH - btnH) / 2;
    const isLastLevel = _levelIdx >= 29;

    if (isLastLevel) {
      _btnNext = drawButton(ctx, cardX + 12, bY, btnW3, btnH, '图鉴', {
        fontSize: 13, color0: 'rgba(60,50,10,0.85)', color1: 'rgba(100,80,10,0.85)',
      });
    } else {
      _btnNext = drawButton(ctx, cardX + 12, bY, btnW3, btnH, '下一关', { fontSize: 14 });
    }
    _btnReplay = drawButton(ctx, cardX + 12 + btnW3 + btnGap, bY, btnW3, btnH, '重玩', {
      fontSize: 14, color0: 'rgba(40,80,60,0.85)', color1: 'rgba(20,120,80,0.85)',
    });
    _btnLevels = drawButton(ctx, cardX + 12 + (btnW3 + btnGap) * 2, bY, btnW3, btnH, '选关', {
      fontSize: 14, color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
    });
    _btnRetry = null;
    _btnShop = null;
    _btnGallery = null;

  } else {
    // STORY-00367: Fail screen — cold-blue stardust + constellation silhouette
    // Animated cold-blue stardust particles (pseudo-random, seeded from time)
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const px = cardX + 12 + (Math.sin(t * 0.5 + i * 1.7) * 0.5 + 0.5) * (cardW - 24);
      const py = contentY + 4 + (Math.cos(t * 0.4 + i * 2.3) * 0.5 + 0.5) * contentH * 0.7;
      const pr = 1.5 + Math.sin(t * 1.1 + i) * 0.8;
      const pa = 0.3 + Math.sin(t * 0.8 + i * 0.9) * 0.15;
      ctx.fillStyle = `rgba(140,180,255,${pa.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TWO_PI); ctx.fill();
    }
    ctx.restore();

    // Encouragement text
    const conName = _conDef ? _conDef.nameZh : '星星';
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(160,190,255,0.85)';
    ctx.fillText(conName + '还在等你，再试一次！', cx, contentY + 2);
    ctx.restore();

    // Constellation silhouette (compact)
    if (_conDef.stars && _conDef.lines) {
      const silH = Math.min(70, contentH - 22);
      const silW = silH * 1.3;
      const silX0 = cx - silW / 2;
      const silY0 = contentY + 22;
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const s of _conDef.stars) {
        if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x;
        if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y;
      }
      const rangeX = Math.max(maxX - minX, 0.1);
      const rangeY = Math.max(maxY - minY, 0.1);
      const toSilX = (nx) => silX0 + ((nx - minX) / rangeX) * silW;
      const toSilY = (ny) => silY0 + ((ny - minY) / rangeY) * silH;
      ctx.save();
      ctx.strokeStyle = 'rgba(100,140,220,0.22)';
      ctx.lineWidth = 1;
      for (const [ai, bi] of _conDef.lines) {
        const a = _conDef.stars[ai], b = _conDef.stars[bi];
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(toSilX(a.x), toSilY(a.y));
        ctx.lineTo(toSilX(b.x), toSilY(b.y)); ctx.stroke();
      }
      for (const s of _conDef.stars) {
        ctx.fillStyle = 'rgba(140,170,255,0.28)';
        ctx.beginPath(); ctx.arc(toSilX(s.x), toSilY(s.y), 2.5, 0, TWO_PI); ctx.fill();
      }
      ctx.restore();
    }

    // Buttons: 重试 / 选关
    const btnH = 36;
    const totalBtnW = cardW - 24;
    const btnW2 = (totalBtnW - 8) / 2;
    const bY = btnAreaY + (btnAreaH - btnH) / 2;

    _btnRetry  = drawButton(ctx, cardX + 12, bY, btnW2, btnH, '重试', {
      fontSize: 14, color0: 'rgba(30,55,110,0.90)', color1: 'rgba(50,80,160,0.90)',
    });
    _btnLevels = drawButton(ctx, cardX + 12 + btnW2 + 8, bY, btnW2, btnH, '选关', {
      fontSize: 14, color0: 'rgba(60,40,100,0.90)', color1: 'rgba(80,55,150,0.90)',
    });
    _btnNext = null;
  }

  // STORY-00373: end entrance animation transform
  ctx.restore();
}

// ── Helper: draw 5-point star shape ──────────────────────────
function _drawStarShape(ctx, cx, cy, r, fillColor, glowColor) {
  if (glowColor) {
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
    grd.addColorStop(0, glowColor);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, TWO_PI); ctx.fill();
  }
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerA = (i * 2 * Math.PI / 5) - Math.PI / 2;
    const innerA = outerA + Math.PI / 5;
    const ox = cx + Math.cos(outerA) * r;
    const oy = cy + Math.sin(outerA) * r;
    const ix = cx + Math.cos(innerA) * (r * 0.4);
    const iy = cy + Math.sin(innerA) * (r * 0.4);
    if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath(); ctx.fill();
}


// ── Pause overlay (STORY-00236) ───────────────────────────────
function _drawPauseOverlay(ctx, W, H) {
  // Dim background
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,30,0.70)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const cardW = Math.min(W - 60, 260);
  const cardH = 220;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.95)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124,92,191,0.50)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font         = `bold 22px ${_maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif'}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#e8e8f0';
  ctx.fillText('游戏暂停', W / 2, cardY + 36);
  ctx.restore();

  const btnW = cardW - 40;
  const btnH = 40;
  const btnX = cardX + 20;

  _btnResume = drawButton(ctx, btnX, cardY + 70, btnW, btnH, '继续 ▶', {
    fontSize: 15,
    color0: '#7c5cbf', color1: '#4a90d9',
  });
  _btnPauseRetry = drawButton(ctx, btnX, cardY + 120, btnW, btnH, '重试 🔄', {
    fontSize: 14,
    color0: 'rgba(40,80,60,0.85)', color1: 'rgba(20,120,80,0.85)',
  });
  _btnPauseLevels = drawButton(ctx, btnX, cardY + 168, btnW - 0, 36, '选关', {
    fontSize: 13,
    color0: 'rgba(80,60,140,0.75)', color1: 'rgba(60,90,180,0.75)',
  });
}

// ── Touch handling ────────────────────────────────────────────
// No-op touchmove handler — prevents WeChat mini-game scroll bar residual
function _onTouchMove() {}

function _onTouch(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const tx = touch.x;
  const ty = touch.y;

  if (_phase === 'play') {
    // Pause button check (STORY-00236)
    if (_btnPause && hitTest(_btnPause, tx, ty)) {
      _paused = !_paused;
      return;
    }

    // Pause overlay buttons
    if (_paused) {
      if (_btnResume && hitTest(_btnResume, tx, ty)) {
        _paused = false;
        return;
      }
      if (_btnPauseRetry && hitTest(_btnPauseRetry, tx, ty)) {
        if (_navigate) fadeNavigate(() => _navigate('game'));
        return;
      }
      if (_btnPauseLevels && hitTest(_btnPauseLevels, tx, ty)) {
        if (_navigate) fadeNavigate(() => _navigate('levels'));
        return;
      }
      return; // swallow all other taps while paused
    }

    // Item slot tap check (STORY-00252) — before net fire
    for (const box of _slotBoxes) {
      if (hitTest(box, tx, ty)) {
        _activateSlot(box.slotIdx, Date.now());
        return;
      }
    }

    // Fire net on tap (ignore if already extending)
    if (_netState === 'swing') {
      _netState = 'extend';
      _netLen   = 0;
    }
    return;
  }

  // Tap during celebrate/starflash/linedraw/linger: skip to result
  if (_phase === 'celebrate' || _phase === 'starflash' || _phase === 'linedraw' || _phase === 'linger') {
    _phase = 'result';
    _resultEnterTimer = 0; // STORY-00373
    return;
  }

  // Result screen buttons
  if (_phase === 'result') {
    // Lore page navigation (STORY-00238 / STORY-00239)
    if (_btnLoreNext && hitTest(_btnLoreNext, tx, ty)) {
      if (_lorePage < _lorePages.length - 1) {
        _lorePage++;
      } else {
        // Last page "完成 ✓" — dismiss lore to reveal action buttons
        _loreDismissed = true;
        _lorePages = [];
        _lorePage = 0;
      }
      return;
    }
    if (_btnNext && hitTest(_btnNext, tx, ty)) {
      _cleanup(); // STORY-00324: stop RAF before any navigation — prevents girl/list flicker
      if (_levelIdx >= 29) {
        // Last level completed → go to achievement screen
        if (_navigate) fadeNavigate(() => _navigate('achievement'));
      } else {
        const nextIdx = _levelIdx + 1;
        state.currentLevel = nextIdx;
        if (_navigate) fadeNavigate(() => _navigate('game'));
      }
      return;
    }
    if (_btnRetry && hitTest(_btnRetry, tx, ty)) {
      _cleanup(); // STORY-00324
      if (_navigate) fadeNavigate(() => _navigate('game'));
      return;
    }
    if (_btnReplay && hitTest(_btnReplay, tx, ty)) {
      _cleanup(); // STORY-00324
      if (_navigate) fadeNavigate(() => _navigate('game'));
      return;
    }
    if (_btnLevels && hitTest(_btnLevels, tx, ty)) {
      _cleanup(); // STORY-00324: stop RAF before levels nav — prevents girl/list flicker
      if (_navigate) fadeNavigate(() => _navigate('levels'));
      return;
    }
    if (_btnShop && hitTest(_btnShop, tx, ty)) {
      _cleanup(); // STORY-00324
      if (_navigate) fadeNavigate(() => _navigate('shop'));
      return;
    }
    if (_btnGallery && hitTest(_btnGallery, tx, ty)) {
      if (_navigate) {
        _cleanup();  // STORY-00302: stop game RAF immediately before fade — prevents girl/gallery flicker
        fadeNavigate(() => _navigate('gallery'));
      }
      return;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────
// Split lore text into pages of ~maxChars chars at space/sentence boundary
function _splitLorePages(text, maxChars) {
  const pages = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    // Find last space or punctuation at or before maxChars
    let cut = maxChars;
    for (let i = maxChars; i > maxChars - 20 && i > 0; i--) {
      const ch = remaining[i];
      if (ch === '。' || ch === '，' || ch === ' ' || ch === '！' || ch === '？') {
        cut = i + 1;
        break;
      }
    }
    pages.push(remaining.substring(0, cut).trim());
    remaining = remaining.substring(cut).trim();
  }
  if (remaining.length > 0) pages.push(remaining.trim());
  return pages;
}

function _hexAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _drawWrappedText(ctx, text, cx, startY, maxW, lineH) {
  const words = text.split('');  // Chinese: split by character
  let   line  = '';
  let   y     = startY;
  const measW = maxW;

  for (const ch of words) {
    const test = line + ch;
    if (ctx.measureText(test).width > measW && line.length > 0) {
      ctx.fillText(line, cx, y);
      line = ch;
      y   += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, y);
}
