// game/engine.js — Core game loop, pendulum net, star/debris objects
import state from '../state.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { playCatch, playDebrisCatch, startCountdownBeeps, stopCountdownBeeps } from '../audio.js';
import { SCENE_PALETTES, drawGroundSilhouette } from '../data/scenes.js';

const TWO_PI = Math.PI * 2;
const TIME_BY_DIFFICULTY = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50 };

// ── Particle class ────────────────────────────────────────────
class Particle {
  constructor(x, y, color, vx, vy, life, size) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size;
    this.gravity = 0.12;
  }
  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += this.gravity;
    this.life--;
  }
  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
  get dead() { return this.life <= 0; }
}

// ── Debris types ──────────────────────────────────────────────
const DEBRIS_TYPES = ['meteor', 'satellite', 'rocket', 'cloth'];

function drawMeteor(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#8a8a9a';
  ctx.strokeStyle = '#5a5a6a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const pts = 7;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * TWO_PI;
    const rad = r * (0.7 + 0.3 * Math.sin(i * 2.5));
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSatellite(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#7a8a9a';
  ctx.strokeStyle = '#b0c4de';
  ctx.lineWidth = 1;
  // Body
  ctx.fillRect(-r * 0.5, -r * 0.35, r, r * 0.7);
  // Solar panels
  ctx.fillStyle = '#4a7abf';
  ctx.fillRect(-r * 1.4, -r * 0.15, r * 0.8, r * 0.3);
  ctx.fillRect(r * 0.6, -r * 0.15, r * 0.8, r * 0.3);
  ctx.restore();
}

function drawRocket(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#8a6050';
  ctx.strokeStyle = '#b08070';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.35, r, 0, 0, TWO_PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCloth(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#9090a0';
  ctx.lineWidth = 1.5;
  // Simple jagged cloth shape
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.3);
  ctx.lineTo(-r * 0.3, r * 0.5);
  ctx.lineTo(r * 0.2, -r * 0.2);
  ctx.lineTo(r * 0.8, r * 0.6);
  ctx.lineTo(r, -r * 0.1);
  ctx.stroke();
  ctx.restore();
}

// ── GameEngine class ──────────────────────────────────────────
export class GameEngine {
  constructor(canvas, levelIdx, onComplete, onFail) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.levelIdx  = levelIdx;
    this.onComplete = onComplete;
    this.onFail    = onFail;
    this.running   = false;
    this.rafId     = null;

    this.level = CONSTELLATIONS[levelIdx];

    // Canvas dimensions
    this.W = canvas.width;
    this.H = canvas.height;

    // Game state
    this.startTime = TIME_BY_DIFFICULTY[this.level.difficulty] ?? 90;
    this.timeLeft  = this.startTime;
    this.lastTick  = null;
    this.caughtStars = 0;
    this.totalStars  = this.level.stars.length;
    this.finished    = false;

    // Pendulum
    this.swingAngle   = 0;       // current angle in radians (0 = up)
    this.swingSpeed   = (Math.PI * 2) / (3.5 * 60); // full swing in 3.5s at 60fps
    this.swingDir     = 1;
    this.swingMax     = Math.PI * 60 / 180; // ±60°

    // Net / hook
    this.netState  = 'swing'; // 'swing' | 'extend' | 'retract'
    this.netPos    = 0;       // 0..1 along pole
    this.netSpeed  = 0.025;
    this.netMax    = 0.78;    // ~2/3 canvas height
    this.caughtObj = null;

    // Character
    this.charX = this.W * 0.5;
    this.charY = this.H * 0.85;
    this.poleLen = this.H * 0.18;

    // Objects
    this.stars   = this._buildStars();
    this.debris  = this._buildDebris(3 + Math.floor(levelIdx / 5));

    this.particles = [];

    // ── Item system (new: 被动/主动 split) ─────────────────────
    // 被动 items: auto-consumed from inventory, apply permanently
    const PASSIVE_ITEMS = ['double_coins'];
    this.activeItems = new Set(); // currently active passive effects
    for (const id of PASSIVE_ITEMS) {
      if (state.getItemQty(id) > 0) {
        state.useItem(id);
        this.activeItems.add(id);
      }
    }
    this.coinMultiplier = this.activeItems.has('double_coins') ? 2 : 1;

    // 主动 items: from state.selectedItems, slots 0/1/2
    // Each slot: { id, icon, duration_s, endTime, active, used }
    // Items are NOT consumed from inventory until activated
    const ACTIVE_ITEM_CONFIG = {
      net_speed:     { icon: '⚡', duration: 15 },
      star_magnet:   { icon: '🧲', duration: 30 },
      space_bomb:    { icon: '💣', duration: 0  },
      time_ext:      { icon: '⏱️', duration: 0  },
      shrink_debris: { icon: '🔬', duration: 30 },
      star_map:      { icon: '🗺️', duration: 60 },
      glove:         { icon: '🧤', duration: 30 },
    };
    this.activeSlots = (state.selectedItems || []).slice(0, 3).map(id => ({
      id,
      icon:     ACTIVE_ITEM_CONFIG[id]?.icon || '?',
      duration: ACTIVE_ITEM_CONFIG[id]?.duration ?? 0,
      endTime:  0,
      active:   false,
      used:     false,
    }));

    // Bind
    this._handleInput = this._handleInput.bind(this);
    this._handleKeySlot = this._handleKeySlot.bind(this);
  }

  // ── Build level objects ────────────────────────────────────
  _buildStars() {
    const padX = this.W * 0.12;
    const padY = this.H * 0.12;
    const areaW = this.W - padX * 2;
    const areaH = this.H * 0.58; // stars occupy upper 60% of screen

    return this.level.stars.map((s, i) => ({
      id: i,
      x: padX + s.x * areaW,
      y: padY + s.y * areaH,
      r: magToRadius(s.mag),
      color: typeToColor(s.type),
      name: s.name,
      mag: s.mag,
      caught: false,
      twinklePh: Math.random() * TWO_PI,
      // Store original positions so caught stars remain at their constellation position
      origX: padX + s.x * areaW,
      origY: padY + s.y * areaH,
    }));
  }

  _buildDebris(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: this.W * (0.1 + Math.random() * 0.8),
        y: this.H * (0.1 + Math.random() * 0.55),
        r: 14 + Math.random() * 10,
        type: DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)],
        angle: Math.random() * TWO_PI,
        spinSpeed: (Math.random() - 0.5) * 0.02,
        caught: false,
      });
    }
    return result;
  }

  // ── Geometry helpers ───────────────────────────────────────
  _poleTop() {
    const angle = this.swingAngle - Math.PI / 2; // 0 = pointing straight up
    return {
      x: this.charX + Math.cos(angle) * this.poleLen,
      y: this.charY + Math.sin(angle) * this.poleLen,
    };
  }

  _netTip() {
    const top = this._poleTop();
    const angle = this.swingAngle - Math.PI / 2;
    const extLen = this.H * this.netMax * this.netPos;
    return {
      x: top.x + Math.cos(angle) * extLen,
      y: top.y + Math.sin(angle) * extLen,
    };
  }

  // ── Input ─────────────────────────────────────────────────
  _handleInput(e) {
    if (this._introPlaying) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (this.netState === 'swing' && !this.finished) {
      this.netState   = 'extend';
      this.netPos     = 0;
      this.caughtObj  = null;
    }
  }

  _handleKeySlot(e) {
    if (this._introPlaying || this.finished) return;
    const slotIdx = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : -1;
    if (slotIdx < 0) return;
    this.activateSlot(slotIdx);
  }

  activateSlot(slotIdx) {
    const slot = this.activeSlots[slotIdx];
    if (!slot || slot.used) return;
    if (!state.useItem(slot.id)) return; // not owned

    slot.used   = true;
    slot.active = true;
    const now   = performance.now();
    slot.endTime = slot.duration > 0 ? now + slot.duration * 1000 : now;

    this._applySlotEffect(slot.id, slot.duration);
  }

  _applySlotEffect(id, duration) {
    switch (id) {
      case 'net_speed':
        this.netSpeed *= 1.5;
        if (duration > 0) {
          setTimeout(() => { if (this.running) this.netSpeed /= 1.5; }, duration * 1000);
        }
        break;
      case 'shrink_debris':
        for (const d of this.debris) d.r *= 0.5;
        this._shrinkDebrisActive = true;
        setTimeout(() => {
          for (const d of this.debris) if (!d.caught) d.r *= 2;
          this._shrinkDebrisActive = false;
        }, duration * 1000);
        break;
      case 'space_bomb':
        this.debris = this.debris.filter(d => {
          if (!d.caught) { this._emitDebrisParticles(d.x, d.y); return false; }
          return true;
        });
        break;
      case 'time_ext':
        this.timeLeft = Math.min(this.timeLeft + 20, this.startTime + 20);
        if (typeof this.onTimeExt === 'function') this.onTimeExt();
        break;
      // star_magnet, star_map, glove: checked in _update via active slot state
    }
  }

  _isSlotActive(id) {
    const now = performance.now();
    return this.activeSlots.some(s => s.id === id && s.active && (s.duration === 0 || now < s.endTime));
  }
  start() {
    this.running = true;
    this.lastTick = performance.now();
    document.addEventListener('click', this._handleInput);
    document.addEventListener('keydown', this._handleInput);
    document.addEventListener('keydown', this._handleKeySlot);

    // Scene transition ceremony — show on first entry to a new scene group
    const sceneIdx = Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1);
    if (!state.seenScenes.has(sceneIdx)) {
      state.seenScenes.add(sceneIdx);
      state.save();
      this._introPlaying = true;
      this._showSceneIntro(sceneIdx, () => {
        this._introPlaying = false;
        this.lastTick = performance.now();
        this._loop(performance.now());
      });
    } else {
      this._loop(performance.now());
    }
  }

  stop() {
    this.running = false;
    document.removeEventListener('click', this._handleInput);
    document.removeEventListener('keydown', this._handleInput);
    document.removeEventListener('keydown', this._handleKeySlot);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    stopCountdownBeeps();
  }

  _showSceneIntro(sceneIdx, onDone) {
    const scene = SCENE_PALETTES[sceneIdx];
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const FADE_IN = 500;     // ms
    const HOLD    = 1500;    // ms
    const FADE_OUT = 500;    // ms
    const TOTAL   = FADE_IN + HOLD + FADE_OUT;
    const start   = performance.now();

    const draw = (now) => {
      const elapsed = now - start;
      let alpha;
      if (elapsed < FADE_IN) {
        alpha = elapsed / FADE_IN;
      } else if (elapsed < FADE_IN + HOLD) {
        alpha = 1;
      } else {
        alpha = 1 - (elapsed - FADE_IN - HOLD) / FADE_OUT;
      }
      alpha = Math.max(0, Math.min(1, alpha));

      // Draw background first
      this._drawBackground();

      // Dark overlay
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Scene name text
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Location name
      ctx.font = `bold ${Math.round(H * 0.042)}px 'Noto Sans SC', sans-serif`;
      ctx.fillStyle = scene.starColor || '#ffffff';
      ctx.shadowColor = scene.sky1 || '#000';
      ctx.shadowBlur = 18;
      ctx.fillText(scene.name, W / 2, H / 2);
      // Subtitle
      ctx.font = `${Math.round(H * 0.024)}px 'Noto Sans SC', sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.shadowBlur = 0;
      ctx.fillText(`— 第 ${sceneIdx * 5 + 1}–${sceneIdx * 5 + 5} 关 —`, W / 2, H / 2 + Math.round(H * 0.058));
      ctx.restore();

      if (elapsed < TOTAL) {
        requestAnimationFrame(draw);
      } else {
        onDone();
      }
    };
    requestAnimationFrame(draw);
  }

  _loop(now) {
    if (!this.running) return;
    const dt = now - (this.lastTick || now);
    this.lastTick = now;

    this._update(dt);
    this._draw();

    this.rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.finished) return;

    // Timer
    this.timeLeft -= dt / 1000;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finished = true;
      this.stop();
      stopCountdownBeeps();
      setTimeout(() => this.onFail(), 300);
      return;
    }

    // Countdown warning beeps at ≤10s
    if (this.timeLeft <= 10 && !this._beeping) {
      this._beeping = true;
      startCountdownBeeps();
    } else if (this.timeLeft > 10 && this._beeping) {
      this._beeping = false;
      stopCountdownBeeps();
    }

    // Pendulum swing
    if (this.netState === 'swing') {
      this.swingAngle += this.swingSpeed * this.swingDir;
      if (Math.abs(this.swingAngle) >= this.swingMax) {
        this.swingDir *= -1;
        this.swingAngle = Math.sign(this.swingAngle) * this.swingMax;
      }
    }

    // Net extend
    if (this.netState === 'extend') {
      this.netPos += this.netSpeed;
      const tip = this._netTip();

      // Check collision
      let hit = null;
      for (const s of this.stars) {
        if (s.caught) continue;
        const dx = tip.x - s.x, dy = tip.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < s.r + 8) { hit = { type: 'star', obj: s }; break; }
      }
      if (!hit) {
        for (const d of this.debris) {
          if (d.caught) continue;
          const dx = tip.x - d.x, dy = tip.y - d.y;
          if (Math.sqrt(dx * dx + dy * dy) < d.r + 8) { hit = { type: 'debris', obj: d }; break; }
        }
      }

      if (hit) {
        this.caughtObj = hit;
        this.netState  = 'retract';
      } else if (this.netPos >= 1) {
        this.netState = 'retract';
      }
    }

    // Net retract
    if (this.netState === 'retract') {
      this.netPos -= this.netSpeed * 1.5;
      // Drag caught debris only — stars stay at original position
      if (this.caughtObj && this.caughtObj.type === 'debris') {
        const tip = this._netTip();
        this.caughtObj.obj.x = tip.x;
        this.caughtObj.obj.y = tip.y;
      }
      if (this.netPos <= 0) {
        this.netPos   = 0;
        this.netState = 'swing';
        if (this.caughtObj) {
          this._processCatch(this.caughtObj);
          this.caughtObj = null;
        }
      }
    }

    // Spin debris
    for (const d of this.debris) {
      if (!d.caught) d.angle += d.spinSpeed;
    }

    // Star magnet — pull uncaught stars toward net tip (active slot)
    if (this._isSlotActive('star_magnet')) {
      const tip = this._netTip();
      for (const s of this.stars) {
        if (s.caught) continue;
        const dx = tip.x - s.x, dy = tip.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50 && dist > 0) {
          s.x += (dx / dist) * 1.5;
          s.y += (dy / dist) * 1.5;
        }
      }
    }

    // Update particles
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => !p.dead);
  }

  _processCatch(hit) {
    if (hit.type === 'star') {
      hit.obj.caught = true;
      // Snap origX/origY to actual catch position so dim persistence dot
      // appears where the star was when caught (matters if star_magnet moved it)
      hit.obj.origX = hit.obj.x;
      hit.obj.origY = hit.obj.y;
      this.caughtStars++;
      playCatch();
      this._emitStarParticles(hit.obj.x, hit.obj.y);
      this._updateHUD();
      if (this.caughtStars >= this.totalStars) {
        this.finished = true;
        this.stop();
        setTimeout(() => this.onComplete(Math.floor(this.timeLeft)), 400);
      }
    } else {
      hit.obj.caught = true;
      playDebrisCatch();
      this._emitDebrisParticles(hit.obj.x, hit.obj.y);
      // Time penalty for catching debris (waived with glove active slot)
      if (!this._isSlotActive('glove')) {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this._showPenaltyText(hit.obj.x, hit.obj.y);
      }
    }
  }

  _showPenaltyText(x, y) {
    const screen = document.getElementById('screen-game');
    if (!screen) return;
    const el = document.createElement('div');
    el.className = 'penalty-text';
    el.textContent = '-1秒';
    el.style.left = `${x}px`;
    el.style.top  = `${y - 20}px`;
    screen.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  _emitStarParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * TWO_PI;
      const spd   = 1 + Math.random() * 4;
      this.particles.push(new Particle(
        x, y, '#ffd700',
        Math.cos(angle) * spd, Math.sin(angle) * spd,
        28 + Math.random() * 20, 2 + Math.random() * 3
      ));
    }
    // White sparkle ring
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TWO_PI;
      this.particles.push(new Particle(
        x, y, '#fff8e0',
        Math.cos(angle) * 3, Math.sin(angle) * 3,
        18, 1.5
      ));
    }
  }

  _emitDebrisParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * TWO_PI;
      const spd   = 1 + Math.random() * 2.5;
      this.particles.push(new Particle(
        x, y, ['#7a8a9a', '#8a6050', '#606070'][Math.floor(Math.random() * 3)],
        Math.cos(angle) * spd, Math.sin(angle) * spd,
        20 + Math.random() * 15, 2 + Math.random() * 2
      ));
    }
  }

  _updateHUD() {
    const el = document.querySelector('.hud-stars .star-count');
    if (el) el.textContent = `${this.caughtStars}/${this.totalStars}`;
    const timerEl = document.querySelector('.hud-timer');
    if (timerEl) {
      const s = Math.ceil(this.timeLeft);
      timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
      timerEl.classList.toggle('warning', s <= 10);
    }
  }

  // ── Rendering ─────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this._drawBackground();
    if (this._isSlotActive('star_map')) this._drawStarMap();
    this._drawStars();
    this._drawDebris();
    this._drawNet();
    this._drawCharacter();
    this._drawParticles();
    this._updateHUD();
  }

  _drawBackground() {
    const ctx = this.ctx;
    const scene = SCENE_PALETTES[Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1)];

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0,   scene.sky0);
    grad.addColorStop(0.6, scene.sky1);
    grad.addColorStop(1,   scene.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Aurora shimmer bands (Scene 4 only)
    if (scene.aurora) {
      const t = Date.now() * 0.0004;
      for (let band = 0; band < 3; band++) {
        const yBase = this.H * (0.12 + band * 0.10);
        const alpha = 0.10 + 0.06 * Math.sin(t + band * 1.3);
        const aGrad = ctx.createLinearGradient(0, yBase - 18, 0, yBase + 18);
        const colors = ['rgba(60,220,140,', 'rgba(40,180,200,', 'rgba(80,240,160,'];
        aGrad.addColorStop(0,   colors[band % 3] + '0)');
        aGrad.addColorStop(0.5, colors[band % 3] + alpha + ')');
        aGrad.addColorStop(1,   colors[band % 3] + '0)');
        ctx.fillStyle = aGrad;
        const waveOff = 12 * Math.sin(t * 0.7 + band);
        ctx.fillRect(0, yBase - 18 + waveOff, this.W, 36);
      }
    }

    // Background particle stars — density and color vary by scene
    // Stars only in sky zone (upper 75% of canvas)
    const skyHeight = this.H * 0.74;
    const starCount = scene.aurora ? 80 : (scene === SCENE_PALETTES[5] ? 160 : 120);
    const seed = this.levelIdx * 100;
    for (let i = 0; i < starCount; i++) {
      const x = ((seed * 7 + i * 137.508) % this.W);
      const y = ((seed * 3 + i * 97.31) % skyHeight);
      const r = (i % 5 === 0) ? 1.2 : 0.6;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.001 + i));
      ctx.globalAlpha = twinkle * scene.starAlpha;
      ctx.fillStyle = scene.starColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground silhouette (drawn on top of sky gradient + stars)
    const sceneIdx = Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1);
    drawGroundSilhouette(ctx, this.W, this.H, sceneIdx);
  }

  _drawStarMap() {
    const ctx = this.ctx;
    const lines = this.level.lines || [];
    const scene = SCENE_PALETTES[Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1)];
    // Use light-blue on aurora scene (gold would be lost against teal-green)
    const lineColor = scene.aurora ? 'rgba(200, 235, 255, 0.45)' : 'rgba(255, 215, 0, 0.25)';
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (const [a, b] of lines) {
      const sA = this.stars[a], sB = this.stars[b];
      if (!sA || !sB) continue;
      ctx.beginPath();
      ctx.moveTo(sA.origX ?? sA.x, sA.origY ?? sA.y);
      ctx.lineTo(sB.origX ?? sB.x, sB.origY ?? sB.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStars() {
    const ctx = this.ctx;
    const t = Date.now() * 0.002;
    for (const s of this.stars) {
      if (s.caught) {
        // Caught stars: dim glowing dot at original constellation position
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.r;
        ctx.beginPath();
        ctx.arc(s.origX, s.origY, s.r * 0.7, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
        continue;
      }
      const twinkle = 0.7 + 0.3 * Math.sin(t + s.twinklePh);

      // Glow
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
      grd.addColorStop(0, s.color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.5, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      // Core
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = s.r * 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawDebris() {
    const ctx = this.ctx;
    for (const d of this.debris) {
      if (d.caught) continue;
      switch (d.type) {
        case 'meteor':    drawMeteor(ctx, d.x, d.y, d.r, d.angle); break;
        case 'satellite': drawSatellite(ctx, d.x, d.y, d.r, d.angle); break;
        case 'rocket':    drawRocket(ctx, d.x, d.y, d.r, d.angle); break;
        default:          drawCloth(ctx, d.x, d.y, d.r, d.angle);
      }
    }
  }

  _drawCharacter() {
    const ctx = this.ctx;
    const cx = this.charX;
    const cy = this.charY;

    // Ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 22, 5, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.fillStyle = '#f5c5a0'; // skin
    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 44, 14, 0, TWO_PI);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#3a2010';
    ctx.beginPath();
    ctx.arc(cx, cy - 48, 14, Math.PI, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 38, 5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    // Dress body
    ctx.fillStyle = '#7c5cbf';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 30);
    ctx.lineTo(cx + 12, cy - 30);
    ctx.lineTo(cx + 16, cy - 2);
    ctx.lineTo(cx - 16, cy - 2);
    ctx.closePath();
    ctx.fill();
    // Skirt
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 2);
    ctx.lineTo(cx + 16, cy - 2);
    ctx.lineTo(cx + 20, cy + 12);
    ctx.lineTo(cx - 20, cy + 12);
    ctx.closePath();
    ctx.fill();
    // Legs
    ctx.fillStyle = '#f0d0b0';
    ctx.fillRect(cx - 10, cy + 12, 8, 14);
    ctx.fillRect(cx + 2,  cy + 12, 8, 14);
    // Shoes
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(cx - 11, cy + 24, 10, 5);
    ctx.fillRect(cx + 1,  cy + 24, 10, 5);
    ctx.restore();

    // Pole
    const poleTop = this._poleTop();
    ctx.save();
    ctx.strokeStyle = '#c8a060';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(poleTop.x, poleTop.y);
    ctx.stroke();
    ctx.restore();
  }

  _drawNet() {
    const ctx  = this.ctx;
    const top  = this._poleTop();
    const tip  = this._netTip();
    const dx   = tip.x - top.x;
    const dy   = tip.y - top.y;
    const len  = Math.sqrt(dx * dx + dy * dy);

    if (len < 2) return;

    // Rope
    ctx.save();
    ctx.strokeStyle = 'rgba(220,220,255,0.85)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    // Net bag at tip
    const netR = 18;
    const hasCatch = this.caughtObj !== null;
    ctx.strokeStyle = hasCatch ? '#ffd700' : 'rgba(180,200,255,0.9)';
    ctx.lineWidth   = hasCatch ? 2 : 1.5;
    if (hasCatch) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8; }

    // Draw net as mesh circle
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, netR, 0, TWO_PI);
    ctx.stroke();

    // Inner cross lines
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(tip.x + Math.cos(a) * netR, tip.y + Math.sin(a) * netR);
      ctx.lineTo(tip.x - Math.cos(a) * netR, tip.y - Math.sin(a) * netR);
      ctx.stroke();
    }

    // Trail (white arc)
    if (this.netState === 'extend' && len > 10) {
      const grad = ctx.createLinearGradient(top.x, top.y, tip.x, tip.y);
      grad.addColorStop(0,   'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1,   'rgba(255,255,255,0.35)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 6;
      ctx.shadowBlur  = 0;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawParticles() {
    for (const p of this.particles) p.draw(this.ctx);
  }

  // Expose for HUD initial render
  getStatus() {
    return {
      timeLeft:    this.timeLeft,
      startTime:   this.startTime,
      caughtStars: this.caughtStars,
      totalStars:  this.totalStars,
      levelName:   `${this.level.nameZh} · 第${this.levelIdx + 1}关`,
    };
  }
}
