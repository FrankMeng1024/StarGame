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

  // Glow trail behind the meteor
  const trailGrad = ctx.createLinearGradient(-r * 2.2, 0, r * 0.5, 0);
  trailGrad.addColorStop(0,   'rgba(255,120,30,0)');
  trailGrad.addColorStop(0.5, 'rgba(255,150,50,0.22)');
  trailGrad.addColorStop(1,   'rgba(255,180,80,0.42)');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.ellipse(-r * 0.9, 0, r * 1.3, r * 0.55, 0, 0, TWO_PI);
  ctx.fill();

  // Outer glow halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.7);
  halo.addColorStop(0,   'rgba(255,140,40,0.35)');
  halo.addColorStop(1,   'rgba(255,80,10,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.7, 0, TWO_PI);
  ctx.fill();

  // Irregular rocky body
  ctx.beginPath();
  const pts = [
    [0.95, 0.1], [0.7, -0.55], [0.2, -0.9], [-0.3, -0.8],
    [-0.85, -0.45], [-1.0, 0.05], [-0.75, 0.6], [-0.2, 0.92],
    [0.45, 0.85], [0.88, 0.45],
  ];
  pts.forEach(([px, py], i) => {
    const jitter = 0.06 * (i % 3 === 0 ? -1 : 1);
    const nx = (px + jitter) * r, ny = (py + jitter * 0.7) * r;
    if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
  });
  ctx.closePath();
  const bodyGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r);
  bodyGrad.addColorStop(0,   '#c0886a');
  bodyGrad.addColorStop(0.5, '#8a5840');
  bodyGrad.addColorStop(1,   '#5a3020');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Dark crater pits
  ctx.fillStyle = 'rgba(20,8,4,0.55)';
  [[0.2, -0.2, 0.18], [-0.35, 0.25, 0.13], [0.5, 0.35, 0.10]].forEach(([cx2, cy2, cr2]) => {
    ctx.beginPath();
    ctx.arc(cx2 * r, cy2 * r, cr2 * r, 0, TWO_PI);
    ctx.fill();
  });

  // Surface highlight
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffe0c0';
  ctx.beginPath();
  ctx.ellipse(-0.1 * r, -0.38 * r, r * 0.32, r * 0.18, -0.6, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawSatellite(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Glow aura
  const aura = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2);
  aura.addColorStop(0,   'rgba(120,180,255,0.2)');
  aura.addColorStop(1,   'rgba(60,100,200,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2, 0, TWO_PI);
  ctx.fill();

  // Main body — metallic box
  const bodyGrad = ctx.createLinearGradient(-r * 0.5, -r * 0.38, r * 0.5, r * 0.38);
  bodyGrad.addColorStop(0,   '#d8e8f4');
  bodyGrad.addColorStop(0.4, '#9ab8d0');
  bodyGrad.addColorStop(1,   '#607890');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(180,220,255,0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-r * 0.5, -r * 0.38, r, r * 0.76, r * 0.08);
  ctx.fill();
  ctx.stroke();

  // Panel lines on body
  ctx.save();
  ctx.strokeStyle = 'rgba(60,100,140,0.45)';
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.16, -r * 0.38);
    ctx.lineTo(i * r * 0.16,  r * 0.38);
    ctx.stroke();
  }
  ctx.restore();

  // Solar panels — left & right
  const panelGrad = ctx.createLinearGradient(-r * 1.5, 0, r * 1.5, 0);
  panelGrad.addColorStop(0,   '#1a4090');
  panelGrad.addColorStop(0.5, '#2a60c8');
  panelGrad.addColorStop(1,   '#1a3880');
  ctx.fillStyle = panelGrad;
  ctx.strokeStyle = 'rgba(100,160,255,0.5)';
  ctx.lineWidth = 0.7;

  // Left panel (3 cells)
  ctx.fillRect(-r * 1.55, -r * 0.18, r * 0.95, r * 0.36);
  ctx.strokeRect(-r * 1.55, -r * 0.18, r * 0.95, r * 0.36);
  // Panel cell dividers
  ctx.save();
  ctx.strokeStyle = 'rgba(180,220,255,0.35)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.55 + i * r * 0.315, -r * 0.18);
    ctx.lineTo(-r * 1.55 + i * r * 0.315,  r * 0.18);
    ctx.stroke();
  }
  ctx.restore();

  // Right panel (3 cells)
  ctx.fillStyle = panelGrad;
  ctx.fillRect(r * 0.6, -r * 0.18, r * 0.95, r * 0.36);
  ctx.strokeRect(r * 0.6, -r * 0.18, r * 0.95, r * 0.36);
  ctx.save();
  ctx.strokeStyle = 'rgba(180,220,255,0.35)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(r * 0.6 + i * r * 0.315, -r * 0.18);
    ctx.lineTo(r * 0.6 + i * r * 0.315,  r * 0.18);
    ctx.stroke();
  }
  ctx.restore();

  // Antenna — thin rod + dish
  ctx.save();
  ctx.strokeStyle = 'rgba(200,230,255,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.38);
  ctx.lineTo(0, -r * 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 0.72, r * 0.12, Math.PI, TWO_PI);
  ctx.stroke();
  ctx.restore();

  // Window/sensor dot
  ctx.fillStyle = '#80e0ff';
  ctx.shadowColor = '#40c0ff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.11, 0, TWO_PI);
  ctx.fill();

  ctx.restore();
}

function drawRocket(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Exhaust particle trail behind nozzle
  const exhaustGrad = ctx.createLinearGradient(0, r * 0.7, 0, r * 1.8);
  exhaustGrad.addColorStop(0,   'rgba(255,200,80,0.6)');
  exhaustGrad.addColorStop(0.4, 'rgba(255,100,20,0.35)');
  exhaustGrad.addColorStop(1,   'rgba(255,60,0,0)');
  ctx.fillStyle = exhaustGrad;
  ctx.beginPath();
  ctx.ellipse(0, r * 1.25, r * 0.28, r * 0.55, 0, 0, TWO_PI);
  ctx.fill();

  // Glow from engine
  const engineGlow = ctx.createRadialGradient(0, r * 0.7, 0, 0, r * 0.7, r * 0.9);
  engineGlow.addColorStop(0,   'rgba(255,180,60,0.45)');
  engineGlow.addColorStop(1,   'rgba(255,80,0,0)');
  ctx.fillStyle = engineGlow;
  ctx.beginPath();
  ctx.arc(0, r * 0.7, r * 0.9, 0, TWO_PI);
  ctx.fill();

  // Main body cylinder
  const bodyGrad = ctx.createLinearGradient(-r * 0.36, 0, r * 0.36, 0);
  bodyGrad.addColorStop(0,   '#504030');
  bodyGrad.addColorStop(0.3, '#9a7860');
  bodyGrad.addColorStop(0.7, '#7a5a48');
  bodyGrad.addColorStop(1,   '#3a2818');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(180,140,100,0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-r * 0.32, -r * 0.72, r * 0.64, r * 1.44, r * 0.06);
  ctx.fill();
  ctx.stroke();

  // Nose cone
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.72);
  ctx.quadraticCurveTo(-r * 0.32, -r * 1.1, 0, -r * 1.15);
  ctx.quadraticCurveTo(r * 0.32, -r * 1.1, r * 0.32, -r * 0.72);
  ctx.fillStyle = '#c0a080';
  ctx.fill();
  ctx.stroke();

  // Scorch marks — diagonal burn streaks
  ctx.save();
  ctx.globalAlpha = 0.45;
  [[-0.18, -0.4, 0.08, 0.55], [0.05, -0.2, 0.12, 0.6], [-0.05, -0.55, 0.07, 0.42]].forEach(
    ([bx, by, bw, bh]) => {
      ctx.fillStyle = '#1a0a04';
      ctx.beginPath();
      ctx.ellipse(bx * r, by * r, bw * r, bh * r, -0.3, 0, TWO_PI);
      ctx.fill();
    }
  );
  ctx.restore();

  // Nozzle bell
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * 0.72);
  ctx.lineTo(-r * 0.35, r * 0.96);
  ctx.lineTo(r * 0.35, r * 0.96);
  ctx.lineTo(r * 0.28, r * 0.72);
  ctx.closePath();
  ctx.fillStyle = '#604040';
  ctx.strokeStyle = 'rgba(200,140,100,0.5)';
  ctx.fill();
  ctx.stroke();

  // Stabilizer fins
  ctx.fillStyle = '#3a2818';
  ctx.strokeStyle = 'rgba(180,120,80,0.4)';
  ctx.lineWidth = 0.6;
  // Left fin
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.2);
  ctx.lineTo(-r * 0.68, r * 0.85);
  ctx.lineTo(-r * 0.32, r * 0.72);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Right fin
  ctx.beginPath();
  ctx.moveTo(r * 0.32, r * 0.2);
  ctx.lineTo(r * 0.68, r * 0.85);
  ctx.lineTo(r * 0.32, r * 0.72);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.restore();
}

function drawCloth(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Shimmer glow
  const shimmer = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
  shimmer.addColorStop(0,   'rgba(200,220,255,0.18)');
  shimmer.addColorStop(1,   'rgba(100,120,200,0)');
  ctx.fillStyle = shimmer;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, 0, TWO_PI);
  ctx.fill();

  // Drift flutter — slight time-based wobble baked into the vertex offsets
  const t = Date.now() * 0.002;
  const wobble = (i) => Math.sin(t + i * 1.7) * r * 0.08;

  // Torn mylar sheet shape with jagged edges
  const verts = [
    [-r,     -r * 0.35 + wobble(0)],
    [-r * 0.6, -r * 0.75 + wobble(1)],
    [-r * 0.1, -r * 0.55 + wobble(2)],
    [ r * 0.2,  -r * 0.9 + wobble(3)],
    [ r * 0.65, -r * 0.5 + wobble(4)],
    [ r,         r * 0.0 + wobble(5)],
    [ r * 0.7,   r * 0.6 + wobble(6)],
    [ r * 0.1,   r * 0.8 + wobble(7)],
    [-r * 0.4,   r * 0.55 + wobble(8)],
    [-r * 0.8,   r * 0.9 + wobble(9)],
    [-r * 0.9,   r * 0.3 + wobble(10)],
  ];

  // Fill with mylar foil gradient (silver-blue)
  const foilGrad = ctx.createLinearGradient(-r, -r, r, r);
  foilGrad.addColorStop(0,   'rgba(200,215,240,0.85)');
  foilGrad.addColorStop(0.3, 'rgba(160,180,220,0.7)');
  foilGrad.addColorStop(0.6, 'rgba(200,220,255,0.82)');
  foilGrad.addColorStop(1,   'rgba(120,140,190,0.65)');

  ctx.beginPath();
  verts.forEach(([vx, vy], i) => {
    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
  });
  ctx.closePath();
  ctx.fillStyle = foilGrad;
  ctx.fill();

  // Torn edge stroke
  ctx.beginPath();
  verts.forEach(([vx, vy], i) => {
    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
  });
  ctx.closePath();
  ctx.strokeStyle = 'rgba(180,200,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Reflective shimmer patches
  ctx.save();
  ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 1.5);
  ctx.fillStyle = 'rgba(240,250,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.2, r * 0.22, r * 0.12, 0.6, 0, TWO_PI);
  ctx.fill();
  ctx.globalAlpha = 0.2 + 0.15 * Math.sin(t * 1.2 + 1);
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.25, r * 0.16, r * 0.1, -0.4, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

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
    this._paused   = false;

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
    const spinSpeeds = {
      meteor:    () => (Math.random() > 0.5 ? 1 : -1) * (0.012 + Math.random() * 0.006),
      satellite: () => (Math.random() > 0.5 ? 1 : -1) * (0.016 + Math.random() * 0.008),
      rocket:    () => (Math.random() > 0.5 ? 1 : -1) * (0.008 + Math.random() * 0.004),
      cloth:     () => (Math.random() > 0.5 ? 1 : -1) * (0.022 + Math.random() * 0.006),
    };
    for (let i = 0; i < count; i++) {
      const type = DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)];
      result.push({
        id: i,
        x: this.W * (0.1 + Math.random() * 0.8),
        y: this.H * (0.1 + Math.random() * 0.55),
        r: 14 + Math.random() * 10,
        type,
        angle: Math.random() * TWO_PI,
        spinSpeed: spinSpeeds[type](),
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
    if (this._introPlaying || this.finished || this._paused) return;
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

  resume() {
    if (!this.running) return;
    this._paused = false;
    this.lastTick = performance.now();
    this._loop(performance.now());
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
    if (this._paused) return; // freeze loop while paused
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

    const timerText = document.getElementById('hud-timer-text') || document.querySelector('.hud-timer');
    const ringFill  = document.getElementById('timer-ring-fill');
    if (timerText) {
      const s = Math.ceil(this.timeLeft);
      timerText.textContent = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

      const ratio  = this.timeLeft / this.startTime;
      const R      = 24;
      const CIRCUM = 2 * Math.PI * R;

      if (ringFill) {
        const dash = Math.max(0, ratio * CIRCUM);
        ringFill.style.strokeDasharray  = `${CIRCUM}`;
        ringFill.style.strokeDashoffset = `${CIRCUM - dash}`;

        if (ratio <= 0.15) {
          ringFill.style.stroke = '#ef4444';
        } else if (ratio <= 0.30) {
          ringFill.style.stroke = '#f59e0b';
        } else {
          ringFill.style.stroke = '';
        }
      }

      const ringEl = timerText.closest('.hud-timer-ring') || timerText;
      ringEl.classList.toggle('warning',  ratio <= 0.30 && ratio > 0.15);
      ringEl.classList.toggle('critical', ratio <= 0.15);
    }
  }

  // ── Rendering ─────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this._drawBackground();
    this._drawConstellationGuide();
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

  // Always-on faint guide lines (CR-023): faint when uncaught, brighter when both ends caught
  _drawConstellationGuide() {
    const ctx = this.ctx;
    const lines = this.level.lines || [];
    const scene = SCENE_PALETTES[Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1)];
    const baseColor  = scene.aurora ? 'rgba(200,235,255,' : 'rgba(255,215,0,';
    ctx.save();
    ctx.lineWidth = 0.8;
    for (const [a, b] of lines) {
      const sA = this.stars[a], sB = this.stars[b];
      if (!sA || !sB) continue;
      const bothCaught = sA.caught && sB.caught;
      ctx.strokeStyle = baseColor + (bothCaught ? '0.28)' : '0.12)');
      ctx.beginPath();
      ctx.moveTo(sA.origX ?? sA.x, sA.origY ?? sA.y);
      ctx.lineTo(sB.origX ?? sB.x, sB.origY ?? sB.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStarMap() {
    // Star map item: upgrade guide lines to full brightness + star name labels
    const ctx = this.ctx;
    const lines = this.level.lines || [];
    const scene = SCENE_PALETTES[Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1)];
    const lineColor = scene.aurora ? 'rgba(200,235,255,0.55)' : 'rgba(255,215,0,0.45)';
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.2;
    for (const [a, b] of lines) {
      const sA = this.stars[a], sB = this.stars[b];
      if (!sA || !sB) continue;
      ctx.beginPath();
      ctx.moveTo(sA.origX ?? sA.x, sA.origY ?? sA.y);
      ctx.lineTo(sB.origX ?? sB.x, sB.origY ?? sB.y);
      ctx.stroke();
    }
    // Draw star name labels
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (const s of this.stars) {
      if (!s.name) continue;
      ctx.globalAlpha = s.caught ? 0.5 : 0.85;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText(s.name, s.origX ?? s.x, (s.origY ?? s.y) - (s.r + 5));
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
    const ctx  = this.ctx;
    const cx   = this.charX;
    const cy   = this.charY;
    const t    = Date.now() * 0.002;

    // State: 'swing'=idle, 'extend'=throw, 'retract'=catch
    const state = this.netState;
    const isThrow   = state === 'extend';
    const isCatch   = state === 'retract' && this.caughtObj !== null;

    // --- Arm pose angles (radians, relative to shoulder) ---
    // Throw: arm reaches upward-toward-pole direction
    // Idle:  arm at ~45° outward relaxed
    const poleAngle = this.swingAngle; // radians from center
    const armBase   = cy - 34;        // shoulder Y

    // ── Ground shadow ──────────────────────────────────────────
    ctx.save();
    const shadowGrad = ctx.createRadialGradient(cx, cy + 3, 0, cx, cy + 3, 26);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 26, 6, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // ── Legs ───────────────────────────────────────────────────
    ctx.save();
    // Slight idle sway
    const legSway = Math.sin(t) * 1.5;
    // Left leg
    const legGrad = ctx.createLinearGradient(cx - 8, cy + 12, cx - 8, cy + 32);
    legGrad.addColorStop(0, '#f5d0b0');
    legGrad.addColorStop(1, '#e8b890');
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 12 + legSway, cy + 14, 9, 16, 3);
    ctx.fill();
    // Right leg
    ctx.beginPath();
    ctx.roundRect(cx + 3 - legSway, cy + 14, 9, 16, 3);
    ctx.fill();
    // Socks (white stripe)
    ctx.fillStyle = '#f0f0ff';
    ctx.fillRect(cx - 12 + legSway, cy + 24, 9, 3);
    ctx.fillRect(cx + 3 - legSway,  cy + 24, 9, 3);
    // Shoes
    const shoeGrad = ctx.createLinearGradient(0, cy + 27, 0, cy + 32);
    shoeGrad.addColorStop(0, '#5a3a80');
    shoeGrad.addColorStop(1, '#2e1a50');
    ctx.fillStyle = shoeGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 13 + legSway, cy + 27, 12, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx + 2 - legSway, cy + 27, 12, 6, 2);
    ctx.fill();
    ctx.restore();

    // ── Skirt ──────────────────────────────────────────────────
    ctx.save();
    const skirtSway = Math.sin(t * 0.8) * 2;
    const skirtGrad = ctx.createLinearGradient(cx, cy - 4, cx, cy + 16);
    skirtGrad.addColorStop(0, '#9d7de0');
    skirtGrad.addColorStop(0.5, '#7c5cbf');
    skirtGrad.addColorStop(1, '#5a3a90');
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 4);
    ctx.lineTo(cx + 14, cy - 4);
    ctx.bezierCurveTo(cx + 18 + skirtSway, cy + 6, cx + 22 + skirtSway, cy + 12, cx + 19 + skirtSway, cy + 15);
    ctx.lineTo(cx - 19 - skirtSway, cy + 15);
    ctx.bezierCurveTo(cx - 22 - skirtSway, cy + 12, cx - 18 - skirtSway, cy + 6, cx - 14, cy - 4);
    ctx.closePath();
    ctx.fill();
    // Skirt fold highlights
    ctx.strokeStyle = 'rgba(180,140,255,0.4)';
    ctx.lineWidth = 0.8;
    for (let fi = -1; fi <= 1; fi++) {
      ctx.beginPath();
      ctx.moveTo(cx + fi * 6, cy - 4);
      ctx.bezierCurveTo(cx + fi * 8 + skirtSway, cy + 4, cx + fi * 10 + skirtSway, cy + 10, cx + fi * 8 + skirtSway, cy + 15);
      ctx.stroke();
    }
    ctx.restore();

    // ── Dress torso ────────────────────────────────────────────
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(cx - 11, cy - 34, cx + 11, cy - 4);
    torsoGrad.addColorStop(0, '#a07ed0');
    torsoGrad.addColorStop(0.4, '#7c5cbf');
    torsoGrad.addColorStop(1, '#5a3a90');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 32);
    ctx.bezierCurveTo(cx - 12, cy - 18, cx - 12, cy - 10, cx - 14, cy - 4);
    ctx.lineTo(cx + 14, cy - 4);
    ctx.bezierCurveTo(cx + 12, cy - 10, cx + 12, cy - 18, cx + 10, cy - 32);
    ctx.closePath();
    ctx.fill();
    // Collar/neckline bow
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 32);
    ctx.lineTo(cx,     cy - 29);
    ctx.lineTo(cx + 4, cy - 32);
    ctx.closePath();
    ctx.fill();
    // Star decorations on dress
    ctx.fillStyle = 'rgba(255,215,0,0.6)';
    ctx.font = '7px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', cx - 5, cy - 20);
    ctx.fillText('✦', cx + 5, cy - 14);
    ctx.restore();

    // ── Arms ───────────────────────────────────────────────────
    ctx.save();
    const skinGrad = ctx.createLinearGradient(cx, cy - 34, cx, cy - 14);
    skinGrad.addColorStop(0, '#f8d4b4');
    skinGrad.addColorStop(1, '#e8b880');

    if (isThrow) {
      // Throw: right arm raised toward pole direction
      const armLen = 18;
      const rawA   = poleAngle - Math.PI * 0.5; // toward pole tip
      const armEndX = cx + 10 + Math.cos(rawA) * armLen;
      const armEndY = (cy - 30) + Math.sin(rawA) * armLen;
      ctx.strokeStyle = '#f8d4b4';
      ctx.lineWidth   = 6;
      ctx.lineCap     = 'round';
      ctx.shadowColor = 'rgba(255,200,150,0.3)';
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 30);
      ctx.lineTo(armEndX, armEndY);
      ctx.stroke();
      // Other arm relaxed
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 30);
      ctx.lineTo(cx - 18, cy - 18);
      ctx.stroke();
    } else if (isCatch) {
      // Catch: both arms reaching outward-upward (receiving)
      ctx.strokeStyle = '#f8d4b4';
      ctx.lineWidth   = 6;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 30);
      ctx.lineTo(cx + 20, cy - 40);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 30);
      ctx.lineTo(cx - 20, cy - 40);
      ctx.stroke();
    } else {
      // Idle: arms loosely at sides with slight upward sway
      const idleLift = Math.sin(t * 0.7) * 3;
      ctx.strokeStyle = '#f8d4b4';
      ctx.lineWidth   = 6;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 30);
      ctx.lineTo(cx + 16 + Math.cos(poleAngle) * 6, cy - 18 - idleLift);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 30);
      ctx.lineTo(cx - 14, cy - 20 + idleLift);
      ctx.stroke();
    }
    ctx.restore();

    // ── Neck ───────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = '#f5c5a0';
    ctx.beginPath();
    ctx.roundRect(cx - 4, cy - 42, 8, 10, 3);
    ctx.fill();
    ctx.restore();

    // ── Head ───────────────────────────────────────────────────
    ctx.save();
    const headGrad = ctx.createRadialGradient(cx - 3, cy - 50, 2, cx, cy - 48, 14);
    headGrad.addColorStop(0, '#fce0c0');
    headGrad.addColorStop(0.7, '#f5c5a0');
    headGrad.addColorStop(1, '#e0a070');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 49, 12, 13, 0, 0, TWO_PI);
    ctx.fill();
    // Cheek blush
    ctx.fillStyle = 'rgba(255,150,150,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 46, 4, 2.5, -0.2, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 46, 4, 2.5, 0.2, 0, TWO_PI);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.ellipse(cx - 5, cy - 49, 2.5, 3, 0, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - 49, 2.5, 3, 0, 0, TWO_PI);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 50, 0.9, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 50, 0.9, 0, TWO_PI);
    ctx.fill();
    // Mouth
    ctx.strokeStyle = '#c0704a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy - 44, 3, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();

    // ── Hair ───────────────────────────────────────────────────
    ctx.save();
    const hairColor = '#3a2010';
    const hairHighlight = '#6a4a28';
    // Hair base cap
    const hairGrad = ctx.createRadialGradient(cx - 4, cy - 58, 2, cx, cy - 54, 18);
    hairGrad.addColorStop(0, hairHighlight);
    hairGrad.addColorStop(0.5, hairColor);
    hairGrad.addColorStop(1, '#1e1008');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 56, 14, 10, 0, 0, TWO_PI);
    ctx.fill();
    // Hair volume sides
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 52, 5, 9, -0.3, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy - 52, 5, 9, 0.3, 0, TWO_PI);
    ctx.fill();
    // Front hair fringe strands
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const strandSway = Math.sin(t * 0.5) * 1.5;
    const strands = [
      [cx - 9, cy - 56, cx - 12 + strandSway, cy - 42],
      [cx - 5, cy - 60, cx - 7 + strandSway * 0.5, cy - 43],
      [cx,     cy - 62, cx + strandSway * 0.3, cy - 44],
      [cx + 5, cy - 60, cx + 7 - strandSway * 0.5, cy - 43],
      [cx + 9, cy - 56, cx + 11 - strandSway, cy - 42],
    ];
    strands.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + strandSway, (y1 + y2) / 2 - 3, x2, y2);
      ctx.stroke();
    });
    // Long back hair with flowing end
    const hairFlowSway = Math.sin(t * 0.6) * 4;
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 56);
    ctx.bezierCurveTo(cx - 16, cy - 40, cx - 18 + hairFlowSway, cy - 22, cx - 14 + hairFlowSway, cy - 10);
    ctx.bezierCurveTo(cx - 12 + hairFlowSway, cy - 6, cx - 8, cy - 8, cx - 6, cy - 12);
    ctx.bezierCurveTo(cx - 10, cy - 20, cx - 13, cy - 36, cx - 10, cy - 52);
    ctx.closePath();
    ctx.fill();
    // Hair highlight streaks
    ctx.strokeStyle = 'rgba(120, 80, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 62);
    ctx.bezierCurveTo(cx - 8, cy - 56, cx - 10, cy - 52, cx - 8, cy - 48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 63);
    ctx.bezierCurveTo(cx, cy - 57, cx - 2, cy - 52, cx + 1, cy - 47);
    ctx.stroke();
    // Hair ornament — small star pin
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 6;
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx + 8, cy - 57);
    ctx.restore();

    // ── Pole ───────────────────────────────────────────────────
    const poleTop = this._poleTop();
    ctx.save();
    const poleGrad = ctx.createLinearGradient(cx, cy - 20, poleTop.x, poleTop.y);
    poleGrad.addColorStop(0, '#d4a854');
    poleGrad.addColorStop(0.5, '#f0c870');
    poleGrad.addColorStop(1, '#c89040');
    ctx.strokeStyle = poleGrad;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(200,160,60,0.4)';
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
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

    // Direction vector (pole tip → net tip)
    const ux = dx / len, uy = dy / len;
    // Perpendicular vector
    const px = -uy, py = ux;

    ctx.save();

    // Rope: slightly curved from pole tip to net mouth
    const ropeCtrlX = (top.x + tip.x) / 2 + px * 4;
    const ropeCtrlY = (top.y + tip.y) / 2 + py * 4;
    ctx.strokeStyle = 'rgba(220,200,140,0.85)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(ropeCtrlX, ropeCtrlY, tip.x, tip.y);
    ctx.stroke();

    // Net bag parameters
    const hasCatch  = this.caughtObj !== null;
    const isReturn  = this.netState === 'retract';
    // Inflate bag when catching a star
    const bulge     = (hasCatch && isReturn) ? 1.2 : 1.0;
    const mouthR    = 18 * bulge;  // radius of mouth ring
    const bagDepth  = mouthR * 1.6; // depth of bag from mouth to tip

    // Bag forward direction: from mouth toward bag bottom
    const bx = ux, by = uy; // forward = extend direction

    // Mouth center = tip position (mouth opens toward "extend" direction)
    const mx = tip.x, my = tip.y;
    // Bag bottom point
    const botX = mx + bx * bagDepth;
    const botY = my + by * bagDepth;

    // Draw bag mesh fill
    ctx.save();
    const bagGrad = ctx.createRadialGradient(mx, my, 0, mx + bx * bagDepth * 0.5, my + by * bagDepth * 0.5, mouthR * 1.4);
    bagGrad.addColorStop(0, 'rgba(255,240,180,0.18)');
    bagGrad.addColorStop(1, 'rgba(255,240,180,0.06)');

    // Teardrop shape: wider at mouth, tapering to point at bottom
    ctx.beginPath();
    ctx.moveTo(mx + px * mouthR, my + py * mouthR);
    ctx.bezierCurveTo(
      mx + px * mouthR + bx * bagDepth * 0.6, my + py * mouthR + by * bagDepth * 0.6,
      botX + px * mouthR * 0.1, botY + py * mouthR * 0.1,
      botX, botY
    );
    ctx.bezierCurveTo(
      botX - px * mouthR * 0.1, botY - py * mouthR * 0.1,
      mx - px * mouthR + bx * bagDepth * 0.6, my - py * mouthR + by * bagDepth * 0.6,
      mx - px * mouthR, my - py * mouthR
    );
    ctx.closePath();
    ctx.fillStyle = bagGrad;
    ctx.fill();

    // Mesh lines: horizontal arcs across the bag (4 levels)
    const meshColor = hasCatch ? 'rgba(255,215,100,0.55)' : 'rgba(255,240,180,0.40)';
    ctx.strokeStyle = meshColor;
    ctx.lineWidth   = 0.7;
    for (let i = 1; i <= 4; i++) {
      const t2 = i / 5;
      const spread = mouthR * (1 - t2 * 0.85) * bulge;
      const cx2 = mx + bx * bagDepth * t2;
      const cy2 = my + by * bagDepth * t2;
      ctx.beginPath();
      ctx.moveTo(cx2 + px * spread, cy2 + py * spread);
      ctx.quadraticCurveTo(
        cx2 + bx * spread * 0.3, cy2 + by * spread * 0.3,
        cx2 - px * spread, cy2 - py * spread
      );
      ctx.stroke();
    }
    // Vertical center line along bag depth
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(botX, botY);
    ctx.stroke();
    ctx.restore();

    // Mouth ring (hoop) — golden, thicker
    const hoopColor = hasCatch ? '#ffd040' : '#f0c040';
    ctx.strokeStyle = hoopColor;
    ctx.lineWidth   = 2;
    if (hasCatch) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; }
    ctx.beginPath();
    ctx.arc(mx, my, mouthR, 0, TWO_PI);
    ctx.stroke();

    // Extending trail
    if (this.netState === 'extend' && len > 10) {
      const grad = ctx.createLinearGradient(top.x, top.y, tip.x, tip.y);
      grad.addColorStop(0,   'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.10)');
      grad.addColorStop(1,   'rgba(255,255,255,0.28)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 7;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(tip.x, tip.y);
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
