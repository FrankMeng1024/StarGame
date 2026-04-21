// game.js — Canvas 游戏屏幕（微信小游戏版）
// 涵盖：背景场景 + 角色 + 网兜机制 + 星星 + 垃圾 + HUD + 胜负 + 结算卡

import { G } from '../engine/globals.js';
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

  // Timer — STORY-00353: base time by difficulty, +5s per star beyond 7 (ensures fairness for large constellations)
  const diffMap = [90, 80, 70, 60, 50];
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

  // Debris
  _initDebris(W, H);

  initBgStars(W, H, 100);  // 100 stars for denser sky (STORY-00260)
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

  G.CANVAS.addEventListener('touchstart', _onTouch);
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
  const skyX0 = 16, skyX1 = W - 16;
  const skyY0 = G.SAFE_TOP + 60, skyY1 = H * 0.62;

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
  const count = Math.min(5, 2 + Math.floor((_conDef.difficulty || 1) * 0.8));

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

// ── Cleanup ───────────────────────────────────────────────────
function _cleanup() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  if (G.CANVAS) {
    G.CANVAS.removeEventListener('touchstart', _onTouch);
  }
  // Remove wx.onHide listener to prevent stacking (STORY-00247 fix)
  if (_onHideCb) {
    try { wx.offHide(_onHideCb); } catch (e) {}
    _onHideCb = null;
  }
  _stars   = [];
  _debris  = [];
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
    }

    // Apply screen shake offset (game world only — HUD stays fixed)
    const didShake = _shakeFrames > 0;
    if (didShake) {
      ctx.save();
      ctx.translate(_shakeX, _shakeY);
    }

    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawDebris(ctx);
    _drawParticles(ctx);
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
    _drawGirl(ctx);
  } else if (_phase === 'starflash') {
    // STORY-00323: sequential star flash — each constellation-line star flashes before lines appear
    _flashPhaseTimer += dt;
    _updateStarFlash(dt, t);
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawParticles(ctx);
    _drawStarFlash(ctx, t);
    _drawGirl(ctx);
  } else if (_phase === 'linedraw') {
    _updateLineDrawProgress(dt);
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawAnimatedConLines(ctx);
    _drawParticles(ctx);
    _drawGirl(ctx);
  } else if (_phase === 'linger') {
    // STORY-00274: all lines drawn — stars pulse/flash for 1.5s before result
    _lingerTimer -= dt;
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawAnimatedConLines(ctx);
    _drawLingerFlash(ctx, t);
    _drawGirl(ctx);
    if (_lingerTimer <= 0) {
      _phase = 'result';
    }
  } else {
    // Still draw scene for visual context
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawDebris(ctx);
    _drawGirl(ctx);
    _drawResultOverlay(ctx, W, H);
  }

  // Global fade overlay (STORY-00282)
  tickFade(dt);
  drawFadeOverlay(ctx, W, H);

  _rafId = requestAnimationFrame(_loop);
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
      _netLen   = _netMaxLen;
      _netState = 'retract';
    } else {
      _updateNetHead();
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

function _updateNetHead() {
  // Rope origin = girl's right hand position (STORY-00321: updated for 145px character v6)
  const ropeOriX = _poleX + 18;
  const ropeOriY = _poleY - 75;
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
      _catchFlashFrames = 3;  // gold flash on net (STORY-00257)
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

// ── Draw: stars (STORY-00260 sparkle upgrade) ────────────────
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

    // Glow halo
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4.5);
    grd.addColorStop(0, _hexAlpha(s.color, alpha * 0.35));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 4.5, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Core
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = s.color;
    ctx.shadowColor = s.color;
    // STORY-00303: revealed stars get 3× glow (web parity)
    ctx.shadowBlur  = revealed ? s.r * 7.5 : s.r * 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // 4-point cross sparkle (STORY-00260) + pulsing arm length + 8-point at peak (STORY-00294)
    const sparkleLen = s.r * (2.5 + 1.5 * Math.abs(Math.sin(t * s.speed * 1.3 + s.phase)));  // arms pulse with twinkle
    const sparkleAlpha = alpha * 0.65;
    ctx.save();
    ctx.strokeStyle = _hexAlpha(s.color, sparkleAlpha);
    ctx.lineWidth   = 0.9;
    ctx.lineCap     = 'round';
    ctx.shadowColor = s.color;
    ctx.shadowBlur  = 3;
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
    // Diagonal arms at peak brightness (STORY-00294: 8-point star effect)
    if (alpha > 0.85) {
      const diagLen = sparkleLen * 0.55;
      ctx.globalAlpha = (alpha - 0.85) / 0.15 * 0.5;  // fade in only at peak
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

// ── Draw: girl character (STORY-00321) ───────────────────────
// v6: GIRL_W=90 GIRL_H=145, head r=28, expressive anime eyes,
//     flowing bezier hair, flared dress ±40px, lace hem, arms per spec.
// Origin: center bottom at (_poleX, _poleY). All coords relative to that.
function _drawGirl(ctx) {
  const x = _poleX;
  const y = _poleY;

  ctx.save();
  ctx.translate(x, y);

  // ── Body aura ────────────────────────────────────────────────
  const auraGrd = ctx.createRadialGradient(0, -70, 8, 0, -70, 80);
  auraGrd.addColorStop(0, 'rgba(255,160,200,0.18)');
  auraGrd.addColorStop(1, 'rgba(255,200,220,0)');
  ctx.fillStyle = auraGrd;
  ctx.beginPath(); ctx.arc(0, -70, 80, 0, TWO_PI); ctx.fill();

  // ── Shoes (round-toed, bright coral-red) ─────────────────────
  ctx.fillStyle = '#e84466';
  ctx.beginPath();
  ctx.moveTo(-13, 14); ctx.bezierCurveTo(-16, 14, -21, 16, -20, 20);
  ctx.bezierCurveTo(-19, 24, -10, 24, -8, 21); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(13, 14); ctx.bezierCurveTo(16, 14, 21, 16, 20, 20);
  ctx.bezierCurveTo(19, 24, 10, 24, 8, 21); ctx.lineTo(10, 14); ctx.closePath(); ctx.fill();
  // Shoe strap shine
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-16, 17, 4, 1.5, 0.2, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, 17, 4, 1.5, -0.2, 0, TWO_PI); ctx.fill();
  ctx.restore();

  // ── Legs ──────────────────────────────────────────────────────
  ctx.strokeStyle = '#e8b89a';
  ctx.lineWidth   = 6;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(-7, 5); ctx.lineTo(-11, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, 5);  ctx.lineTo(11, 16);  ctx.stroke();

  // ── White petticoat ──────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.50;
  ctx.fillStyle   = '#f0eaff';
  ctx.beginPath();
  ctx.moveTo(-32, 3); ctx.quadraticCurveTo(-24, 14, -18, 12);
  ctx.quadraticCurveTo(-5, 16, 0, 16);
  ctx.quadraticCurveTo(5, 16, 18, 12);
  ctx.quadraticCurveTo(24, 14, 32, 3);
  ctx.lineTo(24, 3); ctx.lineTo(-24, 3); ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── Dress body (sky-blue + soft pink flare) ──────────────────
  const dressGrd = ctx.createLinearGradient(-40, -50, 40, 10);
  dressGrd.addColorStop(0, '#44aaee');
  dressGrd.addColorStop(0.45, '#66ccff');
  dressGrd.addColorStop(1, '#ff99cc');
  ctx.fillStyle = dressGrd;
  ctx.beginPath();
  ctx.moveTo(-14, -50);
  ctx.lineTo(-40, 5);
  ctx.quadraticCurveTo(-28, 14, -18, 12);
  ctx.quadraticCurveTo(-5, 16, 0, 16);
  ctx.quadraticCurveTo(5, 16, 18, 12);
  ctx.quadraticCurveTo(28, 14, 40, 5);
  ctx.lineTo(14, -50);
  ctx.closePath(); ctx.fill();
  // Dress shimmer streak
  ctx.save(); ctx.globalAlpha = 0.13;
  const shimGrd = ctx.createLinearGradient(-4, -50, 2, 12);
  shimGrd.addColorStop(0, '#ffffff'); shimGrd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimGrd;
  ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(-6, 10); ctx.lineTo(5, 10); ctx.lineTo(6, -50); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Bodice sparkles
  ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = '#ffffff';
  for (const [sx, sy] of [[-6, -38], [5, -30], [-3, -22], [7, -43]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, TWO_PI); ctx.fill();
  }
  ctx.restore();
  // Lace hem scallops — white half-circles along dress bottom edge (STORY-00321)
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.70;
  for (let hx = -36; hx < 36; hx += 5) {
    ctx.beginPath();
    ctx.arc(hx + 2.5, 9, 2.5, Math.PI, TWO_PI);
    ctx.stroke();
  }
  ctx.restore();

  // ── Waist bow ────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = '#ff88bb';
  ctx.shadowColor = '#ff44aa'; ctx.shadowBlur = 5;
  // Bow center knot
  ctx.beginPath(); ctx.ellipse(0, -50, 4.5, 3.5, 0, 0, TWO_PI); ctx.fill();
  // Left petal
  ctx.beginPath();
  ctx.moveTo(-2, -50); ctx.bezierCurveTo(-11, -56, -16, -54, -13, -48);
  ctx.bezierCurveTo(-11, -43, -5, -46, -2, -50); ctx.fill();
  // Right petal
  ctx.beginPath();
  ctx.moveTo(2, -50); ctx.bezierCurveTo(11, -56, 16, -54, 13, -48);
  ctx.bezierCurveTo(11, -43, 5, -46, 2, -50); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Left arm — angle 15° outward for balance ─────────────────
  ctx.strokeStyle = '#f5c090';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -44);
  ctx.bezierCurveTo(-27, -40, -32, -26, -28, -16);
  ctx.stroke();
  ctx.fillStyle = '#f5c090';
  ctx.beginPath(); ctx.arc(-28, -15, 5, 0, TWO_PI); ctx.fill();

  // ── Right arm — angle -55° raised, holding pole ──────────────
  ctx.strokeStyle = '#f5c090';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(14, -44);
  ctx.bezierCurveTo(22, -52, 24, -65, 18, -75);
  ctx.stroke();
  ctx.fillStyle = '#f5c090';
  ctx.beginPath(); ctx.arc(18, -75, 5, 0, TWO_PI); ctx.fill();

  // ── Neck ─────────────────────────────────────────────────────
  ctx.fillStyle = '#f8d5b0';
  ctx.beginPath();
  ctx.moveTo(-5, -50); ctx.lineTo(-4, -60); ctx.lineTo(4, -60); ctx.lineTo(5, -50);
  ctx.closePath(); ctx.fill();

  // ── Head (r=28) ──────────────────────────────────────────────
  ctx.fillStyle = '#f8d5b0';
  ctx.beginPath(); ctx.arc(0, -88, 28, 0, TWO_PI); ctx.fill();
  // Rim light
  ctx.save();
  ctx.strokeStyle = '#b088ff';
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.arc(0, -88, 29, 0, TWO_PI); ctx.stroke();
  ctx.restore();
  // Ears
  ctx.fillStyle = '#f0c090';
  ctx.beginPath(); ctx.arc(-28, -88, 5.5, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -88, 5.5, 0, TWO_PI); ctx.fill();

  // Cheek blush (r=6 per spec)
  ctx.save(); ctx.globalAlpha = 0.38; ctx.fillStyle = '#ff8899';
  ctx.beginPath(); ctx.ellipse(-12, -82, 6, 4.5, 0, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -82, 6, 4.5, 0, 0, TWO_PI); ctx.fill();
  ctx.restore();

  // Eyes: white sclera r=5, purple iris r=4, black pupil r=2, white shine r=1.8
  ctx.fillStyle = '#f0f0ff';
  ctx.beginPath(); ctx.ellipse(-8, -90, 5, 6, 0, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, -90, 5, 6, 0, 0, TWO_PI); ctx.fill();
  // Iris with radial gradient
  const irisG1 = ctx.createRadialGradient(-8, -91, 0.5, -8, -90, 4);
  irisG1.addColorStop(0, '#9977ff'); irisG1.addColorStop(0.5, '#6644cc'); irisG1.addColorStop(1, '#2211aa');
  ctx.fillStyle = irisG1;
  ctx.beginPath(); ctx.arc(-8, -90, 4, 0, TWO_PI); ctx.fill();
  const irisG2 = ctx.createRadialGradient(8, -91, 0.5, 8, -90, 4);
  irisG2.addColorStop(0, '#9977ff'); irisG2.addColorStop(0.5, '#6644cc'); irisG2.addColorStop(1, '#2211aa');
  ctx.fillStyle = irisG2;
  ctx.beginPath(); ctx.arc(8, -90, 4, 0, TWO_PI); ctx.fill();
  // Pupils (r=2)
  ctx.fillStyle = '#1a0a2a';
  ctx.beginPath(); ctx.arc(-8, -90, 2, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -90, 2, 0, TWO_PI); ctx.fill();
  // Eye shine r=1.8
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-6, -93, 1.8, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -93, 1.8, 0, TWO_PI); ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.arc(-9, -87, 1, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(6.5, -87, 1, 0, TWO_PI); ctx.fill();
  ctx.restore();
  // Eyelashes
  ctx.save();
  ctx.strokeStyle = '#221133';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const [ex, eAngle] of [[-11, -0.3], [-7, 0], [-3, 0.3], [5, -0.3], [9, 0], [13, 0.3]]) {
    const baseY = -95;
    const eyeCx = ex < 0 ? -8 : 8;
    const dx = (ex - eyeCx) * 0.5;
    ctx.beginPath();
    ctx.moveTo(eyeCx + dx, baseY);
    ctx.lineTo(eyeCx + dx + Math.sin(eAngle) * 2, baseY - 3);
    ctx.stroke();
  }
  ctx.restore();
  // Eyebrows
  ctx.strokeStyle = '#331122';
  ctx.lineWidth   = 2.8;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(-14, -97); ctx.quadraticCurveTo(-8, -101, -2, -97); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -97); ctx.quadraticCurveTo(8, -101, 14, -97); ctx.stroke();
  // Smile + lips
  ctx.save();
  ctx.strokeStyle = '#e05060';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.arc(0, -80, 6, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.fillStyle = 'rgba(220,80,100,0.32)';
  ctx.beginPath(); ctx.arc(0, -80, 6, 0.25, Math.PI - 0.25); ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── Hair ─────────────────────────────────────────────────────
  const hairGrd = ctx.createLinearGradient(-18, -120, 18, -20);
  hairGrd.addColorStop(0, '#3d1a0a');
  hairGrd.addColorStop(0.4, '#2a0f05');
  hairGrd.addColorStop(1, '#1a0808');
  ctx.fillStyle = hairGrd;
  // Back twin tails
  ctx.beginPath();
  ctx.moveTo(-18, -66);
  ctx.bezierCurveTo(-32, -52, -36, -32, -28, -14);
  ctx.bezierCurveTo(-24, -4, -16, 2, -10, 4);
  ctx.lineTo(-10, -14);
  ctx.bezierCurveTo(-16, -32, -16, -56, -10, -70);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -66);
  ctx.bezierCurveTo(32, -52, 36, -32, 28, -14);
  ctx.bezierCurveTo(24, -4, 16, 2, 10, 4);
  ctx.lineTo(10, -14);
  ctx.bezierCurveTo(16, -32, 16, -56, 10, -70);
  ctx.closePath(); ctx.fill();
  // Hair cap over head
  ctx.beginPath(); ctx.arc(0, -95, 26, Math.PI + 0.15, TWO_PI - 0.15); ctx.fill();
  // Side tufts
  ctx.beginPath(); ctx.ellipse(-24, -88, 7, 12, -0.3, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(24, -88, 7, 12, 0.3, 0, TWO_PI); ctx.fill();
  // Fringe
  ctx.beginPath();
  ctx.moveTo(-23, -102);
  ctx.bezierCurveTo(-14, -93, -5, -88, 0, -84);
  ctx.bezierCurveTo(5, -88, 14, -93, 23, -102);
  ctx.closePath(); ctx.fill();
  // Hair highlight arc
  ctx.save();
  ctx.strokeStyle = '#664422';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -100, 16, Math.PI + 0.35, TWO_PI - 0.35); ctx.stroke();
  ctx.restore();
  // Purple hair shine streak
  ctx.save();
  ctx.strokeStyle = '#ccaaff';
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -104); ctx.bezierCurveTo(-4, -107, 4, -107, 10, -103); ctx.stroke();
  ctx.restore();
  // Purple butterfly hair clip on twin tails
  ctx.fillStyle = '#ff55bb';
  ctx.shadowColor = '#ff88dd'; ctx.shadowBlur = 4;
  // Left clip
  ctx.beginPath(); ctx.ellipse(-24, -14, 5, 3, -0.4, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-22, -16, 3, 2, 0.8, 0, TWO_PI); ctx.fill();
  // Right clip
  ctx.beginPath(); ctx.ellipse(24, -14, 5, 3, 0.4, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(22, -16, 3, 2, -0.8, 0, TWO_PI); ctx.fill();
  ctx.shadowBlur = 0;

  // ── Star hairpin on top of head ───────────────────────────────
  // Pin stick
  ctx.save();
  ctx.strokeStyle = '#ffaacc';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, -116); ctx.lineTo(2, -108); ctx.stroke();
  // 5-point star badge (r_outer=11, r_inner=5)
  ctx.fillStyle   = '#ffee44';
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur  = 12;
  ctx.globalAlpha = 0.97;
  ctx.translate(0, -120);
  ctx.beginPath();
  for (let sp = 0; sp < 5; sp++) {
    const outerA = (sp * TWO_PI / 5) - Math.PI / 2;
    const innerA = outerA + Math.PI / 5;
    if (sp === 0) ctx.moveTo(Math.cos(outerA) * 11, Math.sin(outerA) * 11);
    else          ctx.lineTo(Math.cos(outerA) * 11, Math.sin(outerA) * 11);
    ctx.lineTo(Math.cos(innerA) * 5, Math.sin(innerA) * 5);
  }
  ctx.closePath(); ctx.fill();
  // Star center sparkle dot
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.75;
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TWO_PI); ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ── Draw: net (STORY-00257) ───────────────────────────────────
function _drawNet(ctx) {
  const isExtended = _netLen > 0;
  const showLen = isExtended ? _netLen : 20;
  const angle   = _netAngle;

  // Rope origin — from girl's right hand position (STORY-00321: updated for 145px character v6)
  const ropeOriX = _poleX + 18;
  const ropeOriY = _poleY - 75;

  // Net head (mouth ring center)
  const headX = ropeOriX + Math.sin(angle) * showLen;
  const headY = ropeOriY - Math.cos(angle) * showLen;

  // ── Arc trail (STORY-00257) — glowing white dots behind head ──
  if (_trailPoints.length > 1) {
    ctx.save();
    for (let i = 0; i < _trailPoints.length; i++) {
      const tp   = _trailPoints[i];
      const frac = (i + 1) / _trailPoints.length;  // 0→1 (oldest→newest)
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

  // ── Rope ──────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = isExtended ? '#c8874a' : 'rgba(200,135,74,0.45)';
  ctx.lineWidth   = isExtended ? 2.5 : 1.8;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(ropeOriX, ropeOriY);
  ctx.lineTo(headX, headY);
  ctx.stroke();
  ctx.restore();

  // ── Net bag ───────────────────────────────────────────────────
  const mouthR = (isExtended ? 14 : 8) * _netRadiusMult;
  const bagDepth = mouthR * 1.8;

  // Bag fill
  ctx.save();
  ctx.globalAlpha = isExtended ? 0.22 : 0.12;
  ctx.fillStyle   = '#ffd770';
  ctx.beginPath();
  // Mouth opening (top arc)
  ctx.arc(headX, headY, mouthR, Math.PI, 0, false);  // top semicircle
  // Bag sides taper to a point
  ctx.bezierCurveTo(
    headX + mouthR * 0.8, headY + bagDepth * 0.6,
    headX + mouthR * 0.3, headY + bagDepth,
    headX, headY + bagDepth
  );
  ctx.bezierCurveTo(
    headX - mouthR * 0.3, headY + bagDepth,
    headX - mouthR * 0.8, headY + bagDepth * 0.6,
    headX - mouthR, headY
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Bag outline stroke
  ctx.save();
  ctx.strokeStyle = isExtended ? 'rgba(255,210,80,0.75)' : 'rgba(255,210,80,0.35)';
  ctx.lineWidth   = isExtended ? 1.5 : 1.0;
  ctx.beginPath();
  ctx.arc(headX, headY, mouthR, Math.PI, 0, false);
  ctx.bezierCurveTo(
    headX + mouthR * 0.8, headY + bagDepth * 0.6,
    headX + mouthR * 0.3, headY + bagDepth,
    headX, headY + bagDepth
  );
  ctx.bezierCurveTo(
    headX - mouthR * 0.3, headY + bagDepth,
    headX - mouthR * 0.8, headY + bagDepth * 0.6,
    headX - mouthR, headY
  );
  ctx.stroke();
  ctx.restore();

  // Mesh lines inside bag — horizontal arcs
  if (isExtended) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,100,0.55)';  // fixed: was 0.40, AC specifies 0.55
    ctx.lineWidth   = 0.8;
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const yr   = headY + bagDepth * frac;
      const xr   = mouthR * (1 - frac * 0.85);
      ctx.beginPath();
      ctx.arc(headX, yr, xr, Math.PI, 0, false);
      ctx.stroke();
    }
    // Vertical lines (2 center lines)
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue;
      const xOff = mouthR * i * 0.45;
      ctx.beginPath();
      ctx.moveTo(headX + xOff, headY);
      ctx.quadraticCurveTo(headX + xOff * 0.7, headY + bagDepth * 0.6, headX + xOff * 0.15, headY + bagDepth);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Mouth ring (hoop)
  ctx.save();
  const ringAlpha = isExtended ? 0.9 : 0.45;
  ctx.strokeStyle = `rgba(255,215,0,${ringAlpha})`;
  ctx.lineWidth   = isExtended ? 2.5 : 1.5;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = isExtended ? 6 : 2;
  ctx.beginPath();
  ctx.ellipse(headX, headY, mouthR, mouthR * 0.35, 0, 0, TWO_PI);
  ctx.stroke();
  ctx.restore();

  // Catch flash (STORY-00257) — brief gold overlay on bag
  if (_catchFlashFrames > 0) {
    _catchFlashFrames--;
    ctx.save();
    ctx.globalAlpha = _catchFlashFrames / 3 * 0.7;
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.arc(headX, headY + bagDepth * 0.4, mouthR * 1.1, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  // ── Caught debris drag visual (STORY-00286) ──────────────────
  // During retract, draw the caught debris at the net head so it visibly follows
  if (_caughtDebris && _netState === 'retract') {
    const d = _caughtDebris;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = d.type === 'cloth' ? '#cc8844' : '#886644';
    ctx.shadowColor = 'rgba(255,100,30,0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(headX, headY + bagDepth * 0.6, (d.r || 12) * 0.7, 0, TWO_PI);
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
  } else {
    _phase = 'result';
  }
}

// ── Draw: result overlay (STORY-00322) ───────────────────────
function _drawResultOverlay(ctx, W, H) {
  const r = _result;
  if (!r) return;

  // Dim overlay
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,30,0.80)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Card: compact, centered, no overflow (STORY-00322)
  const cardW = Math.min(W - 32, 340);
  const cardH = Math.min(H - 20, 360);
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  // Card background
  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.95)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = r.victory ? 'rgba(255,215,0,0.50)' : 'rgba(255,255,255,0.15)';  // STORY-00328: fail border changed from red to subtle white
  ctx.lineWidth   = r.victory ? 1.5 : 1;  // STORY-00328: fail border thinner
  ctx.stroke();
  ctx.restore();

  const cx  = W / 2;
  // Title area (32px)
  const titleY = cardY + 16 + 11; // top padding + half-height
  ctx.save();
  const _titleFont = _maShanZhengLoaded ? "'Ma Shan Zheng', serif" : 'serif';
  ctx.font         = `bold 22px ${_titleFont}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = r.victory ? '#ffd700' : '#ff8a65';  // STORY-00328: fail title warm orange-red (was #ff5555)
  ctx.shadowColor  = r.victory ? '#ffd700' : '#ff6b35';  // STORY-00328: matching shadow
  ctx.shadowBlur   = 10;
  ctx.fillText(r.victory ? '✦ 关卡完成！' : '⏰ 时间到了！', cx, titleY);
  ctx.restore();

  // Stats row (28px below title): ★★★ | +X金币 | 剩余Ys (STORY-00322)
  const statsY = titleY + 16 + 14; // 16 margin + 14 half-height
  const starStr = r.victory
    ? ('★'.repeat(r.stars) + '☆'.repeat(3 - r.stars))
    : ('★'.repeat(r.stars) + '☆'.repeat(3 - r.stars));
  const statsStr = starStr + '  |  +' + r.coins + '金币  |  剩余' + Math.floor(Math.max(0, r.timeLeft)) + 's';
  ctx.save();
  ctx.font         = '13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = r.victory ? COLORS.starGold : 'rgba(255,255,255,0.80)';  // STORY-00328: fail stats lighter
  ctx.fillText(statsStr, cx, statsY);
  ctx.restore();

  // Content area: between stats row and button area
  // Buttons occupy bottom 52px of card
  const btnAreaH  = 52;
  const btnAreaY  = cardY + cardH - btnAreaH;
  const contentY  = statsY + 14 + 8; // bottom of stats + gap
  const contentH  = btnAreaY - contentY - 4;

  if (r.victory) {
    // Photo area: 120px if photo exists, 0 if no photo
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
      photoBottom = contentY + photoH + 6;
    } else {
      // No photo placeholder — zero height
      photoBottom = contentY;
    }

    // Story text area — height self-adapts (clip to remaining space)
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
      ctx.font         = '12px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = COLORS.text2;
      _drawWrappedText(ctx, page, cx, photoBottom + 4, cardW - 32, 16);
      ctx.restore();

      // Bottom fade gradient on story text
      ctx.save();
      const fadeGrd = ctx.createLinearGradient(0, btnAreaY - 20, 0, btnAreaY - 2);
      fadeGrd.addColorStop(0, 'rgba(20,25,60,0)');
      fadeGrd.addColorStop(1, 'rgba(20,25,60,0.95)');
      ctx.fillStyle = fadeGrd;
      ctx.fillRect(cardX + 8, btnAreaY - 20, cardW - 16, 20);
      ctx.restore();

      // Page nav
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

    // 3 buttons: 下一关 / 重玩 / 选关 — uniformly distributed, height 36px (STORY-00322)
    const btnH   = 36;
    const btnGap = 6;
    const totalBtnW = cardW - 24;
    const btnW3  = (totalBtnW - btnGap * 2) / 3;
    const bY     = btnAreaY + (btnAreaH - btnH) / 2;
    const isLastLevel = _levelIdx >= 29;

    if (isLastLevel) {
      _btnNext = drawButton(ctx, cardX + 12, bY, btnW3, btnH, '🏆 图鉴', {
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
    _btnRetry  = null;
    _btnShop   = null;
    _btnGallery = null;

  } else {
    // Fail card: stats already shown; show constellation silhouette + encouragement
    const failContentH = btnAreaY - contentY - 4;

    // Personalized encouragement
    const conName = _conDef ? _conDef.nameZh : '星星';
    ctx.save();
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLORS.text2;
    ctx.fillText(conName + '跑得太快了，再来一次！✨', cx, contentY);
    ctx.restore();

    // Constellation silhouette (compact)
    if (_conDef.stars && _conDef.lines) {
      const silH = Math.min(70, failContentH - 22);
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
      ctx.strokeStyle = 'rgba(180,180,220,0.25)';
      ctx.lineWidth   = 1;
      for (const [ai, bi] of _conDef.lines) {
        const a = _conDef.stars[ai], b = _conDef.stars[bi];
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(toSilX(a.x), toSilY(a.y));
        ctx.lineTo(toSilX(b.x), toSilY(b.y)); ctx.stroke();
      }
      for (const s of _conDef.stars) {
        ctx.fillStyle = 'rgba(200,200,240,0.3)';
        ctx.beginPath(); ctx.arc(toSilX(s.x), toSilY(s.y), 2.5, 0, TWO_PI); ctx.fill();
      }
      ctx.restore();
    }

    // 2 buttons: 重试 / 选关 (height 36px, STORY-00322)
    const btnH   = 36;
    const totalBtnW = cardW - 24;
    const btnW2  = (totalBtnW - 8) / 2;
    const bY     = btnAreaY + (btnAreaH - btnH) / 2;

    _btnRetry  = drawButton(ctx, cardX + 12, bY, btnW2, btnH, '重试', { fontSize: 14 });
    _btnLevels = drawButton(ctx, cardX + 12 + btnW2 + 8, bY, btnW2, btnH, '选关', {
      fontSize: 14, color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
    });
    _btnNext = null;
  }
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
function _onTouch(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  const tx = touch.clientX;  // fixed: revert incorrect DPR (STORY-00269)
  const ty = touch.clientY;  // fixed: revert incorrect DPR (STORY-00269)

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
