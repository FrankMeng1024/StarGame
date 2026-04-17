// game.js — Canvas 游戏屏幕（微信小游戏版）
// 涵盖：背景场景 + 角色 + 网兜机制 + 星星 + 垃圾 + HUD + 胜负 + 结算卡

import { G } from '../engine/globals.js';
import {
  COLORS, drawSkyBg, initBgStars, drawBgStars,
  drawButton, drawTitle, drawCard, hitTest,
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
const NET_SPEED     = 9;                             // px per frame extension/retraction
const NET_MAX_LEN   = 0;                             // computed at showGame time (55% H)
const GIRL_W        = 44;
const GIRL_H        = 78;

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
let _timeLeft   = 0;
let _lastNow    = 0;
let _dt         = 0;      // last frame dt (seconds) — used by draw helpers needing physics
let _timerFlash = 0;     // seconds of red flash remaining on HUD

// Result state
let _phase      = 'play'; // 'play' | 'celebrate' | 'linedraw' | 'result'
let _result     = null;   // {victory, timeLeft, coins, stars, uncaught}

// Pause state
let _paused     = false;
let _btnPause   = null;
// wx.onHide listener ref — stored to allow wx.offHide() cleanup
let _onHideCb   = null;
let _btnResume  = null;
let _btnPauseRetry  = null;
let _btnPauseLevels = null;

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
let _magnetActive  = false; // star_magnet: stars drift toward net head
let _gloveActive   = false; // glove: no speed penalty on debris catch

// Item slot HUD system (STORY-00252)
// Each slot: { id, icon, duration, endTime, used }
// duration=0 means instant; duration>0 means timed (seconds)
let _slots      = [];  // up to 3 active item slots
let _slotBoxes  = [];  // [{x,y,w,h,slotIdx}] — tap zones, updated each draw frame
let _passiveCoins = false; // double_coins passive item

const ITEM_CONFIG = {
  net_speed:    { icon: '⚡', duration: 15 },
  net_enlarge:  { icon: '🔵', duration: 15 },
  space_bomb:   { icon: '💣', duration: 0  },
  time_ext:     { icon: '⏱', duration: 0  },
  shrink_debris:{ icon: '🔬', duration: 30 },
  star_magnet:  { icon: '🧲', duration: 15 },
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
  _poleY     = H * 0.82;
  _netMaxLen = H * 0.75;  // fixed: was 0.55 — net couldn't reach stars (STORY-00265)
  _netLen    = 0;
  _swingT    = 0;
  _netState  = 'swing';
  _phase     = 'play';
  _result    = null;
  _celebrateTimer = 0;
  _lineDrawProgress = 0;

  // Timer
  const diffMap = [90, 80, 70, 60, 50];
  const diff    = (_conDef.difficulty || 1) - 1;
  _timeLeft     = diffMap[Math.max(0, Math.min(4, diff))];

  // Set up item slots (STORY-00252) — effects activate on tap, not at level start
  _netSpeedMult = _netRadiusMult = _coinsMult = 1;
  _debrisRadiusMult = 1;
  _bombActive = false;
  _magnetActive = false;
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

  _conDef.stars.forEach((s, i) => {
    // All stars warm white/gold (STORY-00235 — removes confusing multi-color system)
    const warmPalette = ['#fff8e0', '#ffd700', '#fffbe8', '#ffec6e'];
    const starColor = warmPalette[i % warmPalette.length];
    _stars.push({
      x:     skyX0 + s.x * (skyX1 - skyX0),
      y:     skyY0 + s.y * (skyY1 - skyY0),
      r:     Math.max(3, Math.min(10, magToRadius(s.mag) * 1.4)),
      color: starColor,
      phase: (i * 1.618) % TWO_PI,
      speed: 0.4 + (i % 5) * 0.15,
      caught: false,
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
  _btnNext = _btnRetry = _btnReplay = _btnLevels = _btnShop = _btnGallery = _btnBomb = null;
  _btnPause = _btnResume = _btnPauseRetry = _btnPauseLevels = _btnLoreNext = null;
  _lorePage = 0;
  _lorePages = [];
  _loreDismissed = false;
  _netSpeedMult = _netRadiusMult = _coinsMult = 1;
  _debrisRadiusMult = 1;
  _bombActive = false;
  _magnetActive = false;
  _gloveActive = false;
  _slots = [];
  _slotBoxes = [];
  _passiveCoins = false;
  _celebrateTimer = 0;
  _lineDrawProgress = 0;
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
      if (_magnetActive) _updateMagnet(dt);
      _updateShake();
    }

    // Apply screen shake offset
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
    _drawHUD(ctx, W);
    if (_hintTimer > 0 && !_paused) _drawHint(ctx, W, H);
    if (_paused) _drawPauseOverlay(ctx, W, H);

    if (didShake) {
      ctx.restore();
    }
  } else if (_phase === 'celebrate') {
    _updateParticles(dt);
    _celebrateTimer -= dt;
    if (_celebrateTimer <= 0) {
      _phase = 'linedraw';
      _lineDrawProgress = 0;
    }
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawParticles(ctx);
    _drawGirl(ctx);
  } else if (_phase === 'linedraw') {
    _updateLineDrawProgress(dt);
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawAnimatedConLines(ctx);
    _drawParticles(ctx);
    _drawGirl(ctx);
  } else {
    // Still draw scene for visual context
    _drawConLines(ctx);
    _drawStars(ctx, t);
    _drawDebris(ctx);
    _drawGirl(ctx);
    _drawResultOverlay(ctx, W, H);
  }

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
        case 'star_magnet':   _magnetActive    = false; break;
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
      // Explode all debris
      for (const d of _debris) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * TWO_PI;
          const speed = 3 + Math.random() * 4;
          _particles.push({
            x: d.x, y: d.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30, maxLife: 30,
            color: i % 2 === 0 ? '#ff6600' : '#ffcc00',
          });
        }
      }
      _debris = [];
      break;
    case 'time_ext':
      _timeLeft += 15;
      AudioAdapter.playSFX(SFX_TIMEEXT);
      break;
    case 'shrink_debris': _debrisRadiusMult = 0.5; break;
    case 'star_magnet':   _magnetActive    = true;  break;
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
    _netLen -= NET_SPEED * scale;
    if (_netLen <= 0) {
      _netLen   = 0;
      _netState = 'swing';
      _trailPoints = [];  // clear trail when retracted
    }
  }
  _updateNetHead();
}

function _updateNetHead() {
  // Rope origin = girl's right hand position (same as _drawNet rope origin)
  const ropeOriX = _poleX + 12;
  const ropeOriY = _poleY - 60;
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
      if (!_gloveActive) {
        _timeLeft  = Math.max(0, _timeLeft - 1.0);
        _timerFlash = 0.5; // 0.5 seconds of red flash
        // Screen shake on debris hit (STORY-00259)
        _shakeFrames = 6;
      }
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

// star_magnet: pull uncaught stars toward net head
function _updateMagnet(dt) {
  const scale = dt * 60;
  const MAGNET_RANGE = 80;
  const PULL_SPEED   = 1.2;
  for (const s of _stars) {
    if (s.caught) continue;
    const dx = _netHeadX - s.x;
    const dy = _netHeadY - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MAGNET_RANGE && dist > 1) {
      const move = PULL_SPEED * scale;
      // Move toward net head, cap to not overshoot
      const fraction = Math.min(move / dist, 1);
      s.x += dx * fraction;
      s.y += dy * fraction;
    }
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
  ctx.save();
  ctx.strokeStyle = 'rgba(255,210,100,0.22)';
  ctx.lineWidth   = 1;
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
    _phase = 'result';
    return;
  }
  const totalLines = _conDef.lines.length;
  const totalDuration = Math.max(totalLines * 0.12, 0.5);
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
  }
  if (_lineDrawProgress >= totalLines) {
    _lineDrawProgress = totalLines;
    _phase = 'result';
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

// ── Draw: stars (STORY-00260 sparkle upgrade) ────────────────
function _drawStars(ctx, t) {
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
    const alpha = 0.50 + 0.50 * Math.abs(Math.sin(t * s.speed + s.phase));

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
    ctx.shadowBlur  = s.r * 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // 4-point cross sparkle (STORY-00260)
    const sparkleLen = s.r * 3;
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
    ctx.restore();
  }
}

// ── Draw: debris ──────────────────────────────────────────────
function _drawDebris(ctx) {
  for (const d of _debris) {
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

// ── Draw: girl character (STORY-00267) ───────────────────────
// Redesigned v3: total visual height ≤78px (hat top -65, shoes +12)
// Proper anime proportions: head ~1/4 total height, body compact
// Scale factor ~0.55× vs original 140px design
function _drawGirl(ctx) {
  const x = _poleX;
  const y = _poleY;

  ctx.save();
  ctx.translate(x, y);

  // ── Soft aura ────────────────────────────────────────────────
  const auraGrd = ctx.createRadialGradient(0, -24, 3, 0, -24, 38);
  auraGrd.addColorStop(0, 'rgba(160,80,240,0.14)');
  auraGrd.addColorStop(1, 'rgba(160,80,240,0)');
  ctx.save();
  ctx.fillStyle = auraGrd;
  ctx.beginPath();
  ctx.arc(0, -24, 38, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // ── Shoes ────────────────────────────────────────────────────
  ctx.fillStyle = '#331144';
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.bezierCurveTo(-10, 8, -13, 10, -12, 12);
  ctx.bezierCurveTo(-11, 14, -6, 14, -5, 12);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.bezierCurveTo(10, 8, 13, 10, 12, 12);
  ctx.bezierCurveTo(11, 14, 6, 14, 5, 12);
  ctx.lineTo(6, 8);
  ctx.closePath();
  ctx.fill();

  // ── Legs ─────────────────────────────────────────────────────
  ctx.strokeStyle = '#d4736a';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-7, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 3);  ctx.lineTo(7, 9);  ctx.stroke();

  // ── Dress ────────────────────────────────────────────────────
  const dressGrd = ctx.createLinearGradient(-17, -27, 17, 4);
  dressGrd.addColorStop(0, '#7733bb');
  dressGrd.addColorStop(0.55, '#9944cc');
  dressGrd.addColorStop(1, '#cc55aa');
  ctx.fillStyle = dressGrd;
  ctx.beginPath();
  ctx.moveTo(-8, -27);
  ctx.lineTo(-17, 3);
  ctx.quadraticCurveTo(-13, 7, -9, 6);
  ctx.quadraticCurveTo(-3, 8, 0, 8);
  ctx.quadraticCurveTo(3, 8, 9, 6);
  ctx.quadraticCurveTo(13, 7, 17, 3);
  ctx.lineTo(8, -27);
  ctx.closePath();
  ctx.fill();
  // Shimmer
  ctx.save();
  ctx.globalAlpha = 0.18;
  const shimGrd = ctx.createLinearGradient(-4, -27, 1, 6);
  shimGrd.addColorStop(0, '#ffffff');
  shimGrd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimGrd;
  ctx.beginPath();
  ctx.moveTo(-3, -27); ctx.lineTo(-4, 5); ctx.lineTo(3, 5); ctx.lineTo(4, -27);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Bodice sparkles
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  for (const [sx, sy] of [[-3, -20], [3, -15], [-1, -11]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TWO_PI); ctx.fill();
  }
  ctx.restore();

  // ── Left arm (lowered, relaxed) ───────────────────────────────
  ctx.strokeStyle = '#f5c8a0';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -22);
  ctx.bezierCurveTo(-16, -20, -18, -13, -15, -7);
  ctx.stroke();
  ctx.fillStyle = '#f5c8a0';
  ctx.beginPath(); ctx.arc(-15, -6, 2.5, 0, TWO_PI); ctx.fill();

  // ── Right arm (raised — holding net rope) ────────────────────
  ctx.strokeStyle = '#f5c8a0';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(8, -22);
  ctx.bezierCurveTo(13, -26, 12, -32, 8, -36);
  ctx.stroke();
  ctx.fillStyle = '#f5c8a0';
  ctx.beginPath(); ctx.arc(8, -36, 2.5, 0, TWO_PI); ctx.fill();

  // ── Neck ─────────────────────────────────────────────────────
  ctx.fillStyle = '#f5c8a0';
  ctx.beginPath();
  ctx.moveTo(-3, -27); ctx.lineTo(-2, -32); ctx.lineTo(2, -32); ctx.lineTo(3, -27);
  ctx.closePath(); ctx.fill();

  // ── Head ─────────────────────────────────────────────────────
  // Face
  ctx.fillStyle = '#f8d5b0';
  ctx.beginPath(); ctx.arc(0, -41, 10, 0, TWO_PI); ctx.fill();
  // Ears
  ctx.fillStyle = '#f0c090';
  ctx.beginPath(); ctx.arc(-10, -41, 2.5, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -41, 2.5, 0, TWO_PI); ctx.fill();
  // Cheeks
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ff8899';
  ctx.beginPath(); ctx.ellipse(-5.5, -38, 3, 2.5, 0, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5.5, -38, 3, 2.5, 0, 0, TWO_PI); ctx.fill();
  ctx.restore();
  // Eyes (large anime style)
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath(); ctx.arc(-3.5, -42, 2.2, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5, -42, 2.2, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = '#6633cc';
  ctx.beginPath(); ctx.arc(-3.5, -42, 1.5, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5, -42, 1.5, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-2.8, -43, 0.8, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(4.2, -43, 0.8, 0, TWO_PI); ctx.fill();
  // Smile
  ctx.strokeStyle = '#cc6644';
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.arc(0, -39, 3, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // ── Hair ─────────────────────────────────────────────────────
  ctx.fillStyle = '#1a0808';
  // Back hair tails (below ears)
  ctx.beginPath();
  ctx.moveTo(-9, -33);
  ctx.bezierCurveTo(-15, -26, -16, -16, -12, -6);
  ctx.bezierCurveTo(-10, -2, -7, 0, -5, 2);
  ctx.lineTo(-5, -8);
  ctx.bezierCurveTo(-8, -16, -9, -26, -6, -35);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, -33);
  ctx.bezierCurveTo(15, -26, 16, -16, 12, -6);
  ctx.bezierCurveTo(10, -2, 7, 0, 5, 2);
  ctx.lineTo(5, -8);
  ctx.bezierCurveTo(8, -16, 9, -26, 6, -35);
  ctx.closePath(); ctx.fill();
  // Top hair cap
  ctx.beginPath();
  ctx.arc(0, -46, 9, Math.PI + 0.15, TWO_PI - 0.15);
  ctx.fill();
  // Side tufts
  ctx.beginPath(); ctx.ellipse(-9, -41, 3.5, 6, -0.25, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -41, 3.5, 6, 0.25, 0, TWO_PI);  ctx.fill();
  // Fringe
  ctx.beginPath();
  ctx.moveTo(-9, -49);
  ctx.bezierCurveTo(-6, -44, -2, -43, 0, -41);
  ctx.bezierCurveTo(2, -43, 6, -44, 9, -49);
  ctx.closePath(); ctx.fill();

  // ── Witch hat ────────────────────────────────────────────────
  const hatGrd = ctx.createLinearGradient(-14, -53, 14, -48);
  hatGrd.addColorStop(0, '#5522aa');
  hatGrd.addColorStop(1, '#8833cc');
  ctx.fillStyle = hatGrd;
  // Brim
  ctx.beginPath();
  ctx.ellipse(0, -51, 14, 3.5, 0, 0, TWO_PI);
  ctx.fill();
  // Crown
  ctx.beginPath();
  ctx.moveTo(-8, -51);
  ctx.bezierCurveTo(-9, -62, -4, -66, 0, -67);
  ctx.bezierCurveTo(4, -66, 9, -62, 8, -51);
  ctx.closePath();
  ctx.fill();
  // Gold band
  ctx.save();
  ctx.globalAlpha = 0.85;
  const bandGrd = ctx.createLinearGradient(-8, -56, 8, -53);
  bandGrd.addColorStop(0, '#cc9900');
  bandGrd.addColorStop(0.5, '#ffdd44');
  bandGrd.addColorStop(1, '#cc9900');
  ctx.fillStyle = bandGrd;
  ctx.fillRect(-8, -56, 16, 3);
  ctx.restore();
  // Star on hat
  ctx.fillStyle    = '#ffee88';
  ctx.shadowColor  = '#ffd700';
  ctx.shadowBlur   = 5;
  ctx.font         = '8px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 2, -62);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── Draw: net (STORY-00257) ───────────────────────────────────
function _drawNet(ctx) {
  const isExtended = _netLen > 0;
  const showLen = isExtended ? _netLen : 20;
  const angle   = _netAngle;

  // Rope origin — from girl's right hand position
  const ropeOriX = _poleX + 12;
  const ropeOriY = _poleY - 60;

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

  // Level name (center) — drawn below the notch
  ctx.save();
  ctx.font         = 'bold 16px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.text;
  ctx.fillText((_conDef.icon || '★') + ' ' + _conDef.nameZh, W / 2, ST + 26);
  ctx.restore();

  // Caught count (left)
  ctx.save();
  ctx.font         = 'bold 15px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = COLORS.starGold;
  ctx.fillText('已抓: ' + _caught + ' / ' + _total, G.SAFE_LEFT + 14, ST + 26);
  ctx.restore();

  // Timer (right)
  const mins    = Math.floor(_timeLeft / 60);
  const secs    = Math.floor(_timeLeft % 60);
  const timerStr = mins + ':' + String(secs).padStart(2, '0');
  const timerFlashing = _timerFlash > 0 || _timeLeft <= 15;
  const timerUrgent   = _timeLeft <= 10;

  ctx.save();
  // Pulse font size when urgent (STORY-00260)
  const t2 = Date.now() * 0.001;
  const pulsedSize = timerUrgent ? Math.round(18 + 4 * Math.abs(Math.sin(t2 * Math.PI * 2))) : 18;
  ctx.font         = `bold ${pulsedSize}px sans-serif`;
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = timerFlashing ? '#ff4444' : COLORS.text;
  if (timerFlashing) {
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur  = timerUrgent ? 14 : 8;
  }
  ctx.fillText(timerStr, W - G.SAFE_RIGHT - 14, ST + 26);
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

  // Pause button (top-right corner, STORY-00236)
  const pauseX = W - G.SAFE_RIGHT - 44;
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
  ctx.fillText(_paused ? '▶' : '⏸', pauseX + 18, pauseY + 18);
  ctx.restore();
}

// ── Result: trigger ───────────────────────────────────────────
function _triggerResult(victory) {
  if (_phase !== 'play') return;
  _netState = 'swing';

  const coins   = victory ? Math.floor(_timeLeft) * 10 * _coinsMult : 0;
  const stars3  = coins >= 300 ? 3 : coins >= 100 ? 2 : 1;
  const uncaught = _total - _caught;

  _result = { victory, timeLeft: _timeLeft, coins, stars: stars3, uncaught };
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

// ── Draw: result overlay ──────────────────────────────────────
function _drawResultOverlay(ctx, W, H) {
  const r = _result;
  if (!r) return;

  // Dim overlay
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,30,0.80)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Card — clamp to screen height with 20px margin so it fits landscape (H≈390)
  const cardW = Math.min(W - 40, 340);
  const cardH = Math.min(r.victory ? 460 : 340, H - 20);
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;

  // Card background
  ctx.save();
  ctx.fillStyle = 'rgba(20,25,60,0.95)';
  _roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = r.victory ? 'rgba(255,215,0,0.50)' : 'rgba(200,50,50,0.50)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  const cx  = W / 2;
  let   cy  = cardY + 36;

  if (r.victory) {
    // ── Victory card ────────────────────────────────────────
    // Headline
    ctx.save();
    ctx.font         = 'bold 26px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd700';
    ctx.shadowColor  = '#ffd700';
    ctx.shadowBlur   = 14;
    ctx.fillText('恭喜通关！', cx, cy);
    ctx.restore();
    cy += 38;

    // Constellation icon + name
    ctx.save();
    ctx.font         = '20px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLORS.text;
    ctx.fillText((_conDef.icon || '★') + '  ' + _conDef.nameZh, cx, cy);
    ctx.restore();
    cy += 32;

    // Star rating
    const starStr = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    ctx.save();
    ctx.font         = '22px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLORS.starGold;
    ctx.fillText(starStr, cx, cy);
    ctx.restore();
    cy += 30;

    // Coins + time
    ctx.save();
    ctx.font         = '14px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#aaffaa';
    const coinsText = _coinsMult > 1
      ? '+' + r.coins + '金币  🪙×2  剩余' + Math.floor(r.timeLeft) + '秒'
      : '+' + r.coins + '金币   剩余' + Math.floor(r.timeLeft) + '秒';
    ctx.fillText(coinsText, cx, cy);
    ctx.restore();
    cy += 28;

    // Constellation photo (STORY-00246)
    const photoH = 70;
    const photoW = cardW - 16;
    const photoX = cardX + 8;
    ctx.save();
    ctx.beginPath();
    _roundRect(ctx, photoX, cy, photoW, photoH, 6);
    ctx.clip();
    if (_victoryPhotoLoaded && _victoryPhoto) {
      ctx.drawImage(_victoryPhoto, photoX, cy, photoW, photoH);
    } else {
      ctx.fillStyle = 'rgba(30,40,80,0.6)';
      ctx.fillRect(photoX, cy, photoW, photoH);
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.text2;
      ctx.fillText('★ ' + (_conDef.nameZh || ''), cx, cy + photoH / 2);
    }
    ctx.restore();
    cy += photoH + 8;

    // Lore text — paginated (STORY-00238)
    if (_conDef.lore && !_loreDismissed) {
      // Build pages on first render (when _lorePages is empty for this result)
      if (_lorePages.length === 0) {
        _lorePages = _splitLorePages(_conDef.lore, 80);
        _lorePage = 0;
      }
      const page = _lorePages[_lorePage] || '';
      const totalPages = _lorePages.length;

      ctx.save();
      ctx.beginPath();
      ctx.rect(cardX + 8, cy - 6, cardW - 16, 80);
      ctx.clip();
      ctx.font         = '12px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = COLORS.text2;
      _drawWrappedText(ctx, page, cx, cy, cardW - 32, 16);
      ctx.restore();
      cy += 80;

      // Page nav button + indicator
      if (totalPages > 1) {
        const isLast = _lorePage >= totalPages - 1;
        const pgLabel = isLast ? '完成 ✓' : '下一段 ›';
        _btnLoreNext = drawButton(ctx, cardX + cardW - 90, cy - 2, 80, 26, pgLabel, {
          fontSize: 11, radius: 8,
          color0: 'rgba(80,60,140,0.75)', color1: 'rgba(60,90,180,0.75)',
          alpha: isLast ? 0.6 : 1.0,
        });
        ctx.save();
        ctx.font      = '10px sans-serif';
        ctx.fillStyle = COLORS.text2;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText((_lorePage + 1) + '/' + totalPages, cardX + 14, cy + 10);
        ctx.restore();
        cy += 34;
      } else {
        _btnLoreNext = null;
        cy += 4;
      }
    }

    // Buttons (3 buttons: 下一关/全部通关, 重玩, 选关)
    const btnW3 = (cardW - 20) / 3;
    const btnH = 40;
    const bY   = cardY + cardH - 112;
    const isLastLevel = _levelIdx >= 29;

    if (isLastLevel) {
      _btnNext = drawButton(ctx, cardX + 10, bY, btnW3, btnH, '🏆 图鉴', {
        fontSize: 12, color0: 'rgba(60,50,10,0.85)', color1: 'rgba(100,80,10,0.85)',
      });
    } else {
      _btnNext = drawButton(ctx, cardX + 10, bY, btnW3, btnH, '下一关', { fontSize: 14 });
    }
    _btnReplay = drawButton(ctx, cardX + 10 + btnW3 + 5, bY, btnW3 - 10, btnH, '重玩', {
      fontSize: 14, color0: 'rgba(40,80,60,0.85)', color1: 'rgba(20,120,80,0.85)',
    });
    _btnLevels = drawButton(ctx, cardX + cardW - btnW3 - 10, bY, btnW3, btnH, '选关', {
      fontSize: 14, color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
    });
    _btnRetry  = null;

    // Secondary row: 去商店 + 看展厅
    const sec2W = (cardW - 24) / 2;
    const secY  = bY + btnH + 10;
    _btnShop = drawButton(ctx, cardX + 10, secY, sec2W, 32, '🛒 去商店', {
      fontSize: 12, radius: 8,
      color0: 'rgba(40,60,100,0.75)', color1: 'rgba(30,80,140,0.75)',
    });
    _btnGallery = drawButton(ctx, cardX + 10 + sec2W + 4, secY, sec2W, 32, '🔭 看展厅', {
      fontSize: 12, radius: 8,
      color0: 'rgba(40,60,100,0.75)', color1: 'rgba(30,80,140,0.75)',
    });

  } else {
    // ── Failure card ────────────────────────────────────────
    ctx.save();
    ctx.font         = 'bold 26px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ff5555';
    ctx.shadowColor  = '#ff3333';
    ctx.shadowBlur   = 12;
    ctx.fillText('时间到！', cx, cy);
    ctx.restore();
    cy += 40;

    ctx.save();
    ctx.font         = '16px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLORS.text;
    ctx.fillText('还差 ' + r.uncaught + ' 颗星', cx, cy);
    ctx.restore();
    cy += 28;

    // Personalized encouragement (STORY-00237)
    ctx.save();
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLORS.text2;
    ctx.fillText((_conDef.nameZh || '星星') + '还在等你！', cx, cy);
    ctx.restore();
    cy += 20;

    // Constellation silhouette (STORY-00237)
    if (_conDef.stars && _conDef.lines) {
      const silW = 110, silH = 80;
      const silX0 = cx - silW / 2;
      const silY0 = cy + 4;
      // compute bounding box of star positions (normalized 0-1)
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
      ctx.strokeStyle = 'rgba(180,180,220,0.28)';
      ctx.lineWidth   = 1;
      for (const [ai, bi] of _conDef.lines) {
        const a = _conDef.stars[ai], b = _conDef.stars[bi];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(toSilX(a.x), toSilY(a.y));
        ctx.lineTo(toSilX(b.x), toSilY(b.y));
        ctx.stroke();
      }
      for (const s of _conDef.stars) {
        ctx.beginPath();
        ctx.arc(toSilX(s.x), toSilY(s.y), 2.5, 0, TWO_PI);
        ctx.fillStyle = 'rgba(200,200,240,0.35)';
        ctx.fill();
      }
      ctx.restore();
      cy += silH + 14;
    } else {
      cy += 44;
    }

    const btnW = cardW * 0.44;
    const btnH = 40;
    const bY   = cardY + cardH - 52;

    _btnRetry  = drawButton(ctx, cardX + 10,               bY, btnW, btnH, '重试', { fontSize: 14 });
    _btnLevels = drawButton(ctx, cardX + cardW - btnW - 10, bY, btnW, btnH, '选关', {
      fontSize: 14, color0: 'rgba(80,60,140,0.85)', color1: 'rgba(60,90,180,0.85)',
    });
    _btnNext   = null;
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
  ctx.font         = 'bold 22px sans-serif';
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
        if (_navigate) _navigate('game');
        return;
      }
      if (_btnPauseLevels && hitTest(_btnPauseLevels, tx, ty)) {
        if (_navigate) _navigate('levels');
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

  // Tap during celebrate/linedraw: skip to result
  if (_phase === 'celebrate' || _phase === 'linedraw') {
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
      if (_levelIdx >= 29) {
        // Last level completed → go to achievement screen
        if (_navigate) _navigate('achievement');
      } else {
        const nextIdx = _levelIdx + 1;
        state.currentLevel = nextIdx;
        if (_navigate) _navigate('game');
      }
      return;
    }
    if (_btnRetry && hitTest(_btnRetry, tx, ty)) {
      if (_navigate) _navigate('game');
      return;
    }
    if (_btnReplay && hitTest(_btnReplay, tx, ty)) {
      if (_navigate) _navigate('game');
      return;
    }
    if (_btnLevels && hitTest(_btnLevels, tx, ty)) {
      if (_navigate) _navigate('levels');
      return;
    }
    if (_btnShop && hitTest(_btnShop, tx, ty)) {
      if (_navigate) _navigate('shop');
      return;
    }
    if (_btnGallery && hitTest(_btnGallery, tx, ty)) {
      if (_navigate) _navigate('gallery');
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
