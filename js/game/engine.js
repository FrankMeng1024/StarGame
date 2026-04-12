// game/engine.js — Core game loop, pendulum net, star/debris objects
import state from '../state.js';
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { playCatch, playDebrisCatch, startCountdownBeeps, stopCountdownBeeps, playRevealNote } from '../audio.js';
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
    this.netState   = 'swing'; // 'swing' | 'extend' | 'retract'
    this.netPos     = 0;       // 0..1 along pole
    this.netSpeed   = 0.014;   // slowed from 0.025 (CR-046)
    this.netMax     = 0.78;    // ~2/3 canvas height
    this.caughtObj  = null;
    this._netEnlargeActive = false; // set true when net_enlarge slot active

    // Character
    this.charX = this.W * 0.5;
    this.charY = this.H * 0.85;
    this.poleLen = this.H * 0.18;

    // ── Sprite assets — load SVG image files ──────────────────
    // Girl sprite sheet (4 frames: idle, blink, throw, catch)
    this._charImgReady = false;
    this._charFrameIdx = 0;
    this._charFrameCount = 4;
    this._charFrameW = 110;
    this._charFrameH = 110;
    this._charLastFrame = 0;
    this._charThrowFrame = 2;
    this._charCatchFrame = 3;
    this._charBlinkTimer = 0;
    this._charState = 'idle'; // 'idle' | 'throw' | 'catch'
    const charImg = new Image();
    charImg.onload = () => {
      this._charImg = charImg;
      this._charFrameW = charImg.naturalWidth / this._charFrameCount;
      this._charFrameH = charImg.naturalHeight;
      this._charImgReady = true;
    };
    charImg.src = 'assets/sprites/girl.svg';

    // Net sprite sheet (2 frames: empty, catch)
    this._netImgReady = false;
    this._netFrameW = 60;
    this._netFrameH = 60;
    const netImg = new Image();
    netImg.onload = () => {
      this._netImg = netImg;
      this._netFrameW = netImg.naturalWidth / 2;
      this._netFrameH = netImg.naturalHeight;
      this._netImgReady = true;
    };
    netImg.src = 'assets/sprites/net.svg';

    // Debris sprites (keyed by type)
    this._debrisImgs = {};
    const DEBRIS_SPRITE_TYPES = ['meteor', 'satellite', 'rocket', 'cloth'];
    this._debrisImgsReady = {};
    for (const t of DEBRIS_SPRITE_TYPES) {
      const img = new Image();
      img.onload = () => { this._debrisImgs[t] = img; this._debrisImgsReady[t] = true; };
      img.src = `assets/sprites/debris-${t}.svg`;
    }

    // Constellation reveal state
    this._revealPhase = false;
    this._revealEdgeIdx = 0;
    this._revealEdges = [];
    this._revealLitStars = new Set();
    this._revealLitLines = [];
    this._revealComplete = false;

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
      net_enlarge:   { icon: '🪢', duration: 15 }, // CR-048: replaced star_magnet
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

    return this.level.stars.map((s, i) => {
      // CR-047: all stars gold/white — no spectral color confusion
      // CR-051: 2/3 size reduction with min/max caps
      const MIN_STAR_R = 3;
      const MAX_STAR_R = 9; // cap at Ursa Major brightest (mag 1.8 → 11 * 1.2 * 2/3 ≈ 8.8)
      const baseR = Math.min(MAX_STAR_R, Math.max(MIN_STAR_R, magToRadius(s.mag) * 1.2 * (2 / 3)));
      return {
        id: i,
        x: padX + s.x * areaW,
        y: padY + s.y * areaH,
        r: baseR,
        color: '#fff8e0',  // warm white-gold for all stars
        name: s.name,
        mag: s.mag,
        caught: false,
        twinklePh: Math.random() * TWO_PI,
        origX: padX + s.x * areaW,
        origY: padY + s.y * areaH,
      };
    });
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
      // CR-048: debris size variation — large (slow retract) or small (normal retract)
      const isLarge = Math.random() > 0.5;
      const r = isLarge ? (22 + Math.random() * 10) : (12 + Math.random() * 6);
      result.push({
        id: i,
        x: this.W * (0.1 + Math.random() * 0.8),
        y: this.H * (0.1 + Math.random() * 0.55),
        r,
        isLarge, // used in retract speed calculation
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

    // space_bomb only works when holding debris — don't consume if no target
    if (slot.id === 'space_bomb' && !(this.caughtObj && this.caughtObj.type === 'debris')) return;

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
      case 'net_enlarge':
        // CR-048: replaced star_magnet — enlarges net mouth radius +50% for 15s
        this._netEnlargeActive = true;
        setTimeout(() => { if (this.running) this._netEnlargeActive = false; }, duration * 1000);
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
        // Destroy only currently held debris
        if (this.caughtObj && this.caughtObj.type === 'debris') {
          this._emitDebrisParticles(this.caughtObj.obj.x, this.caughtObj.obj.y);
          this.debris = this.debris.filter(d => d !== this.caughtObj.obj);
          this.caughtObj = null;
          // Resume normal retract speed by returning net to swing immediately
          this.netPos   = 0;
          this.netState = 'swing';
        }
        // If not holding debris: no effect (don't waste the bomb)
        break;
      case 'time_ext':
        this.timeLeft = Math.min(this.timeLeft + 20, this.startTime + 20);
        if (typeof this.onTimeExt === 'function') this.onTimeExt();
        break;
      // star_map, glove: checked in _update via active slot state
    }
  }

  _isSlotActive(id) {
    const now = performance.now();
    return this.activeSlots.some(s => s.id === id && s.active && (s.duration === 0 || now < s.endTime));
  }
  start() {
    this.running = true;
    this.lastTick = performance.now();
    // Delay click listener 300ms so the click that launched this level
    // (from the level-select screen) doesn't trigger an accidental net launch.
    setTimeout(() => {
      if (this.running) document.addEventListener('click', this._handleInput);
    }, 300);
    document.addEventListener('keydown', this._handleInput);
    document.addEventListener('keydown', this._handleKeySlot);

    // Scene transition ceremony — show once per session per scene group
    const sceneIdx = Math.min(Math.floor(this.levelIdx / 5), SCENE_PALETTES.length - 1);
    const seenKey = `seenScene_${sceneIdx}`;
    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
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
    this._revealPhase = false; // stop any in-progress constellation reveal + its setTimeout chain
    document.removeEventListener('click', this._handleInput);
    document.removeEventListener('keydown', this._handleInput);
    document.removeEventListener('keydown', this._handleKeySlot);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._revealRafId) cancelAnimationFrame(this._revealRafId);
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

      // (Location text removed — was causing scene names to flash briefly)

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
      const catchBonus = this._netEnlargeActive ? 1.5 : 1.0;
      for (const s of this.stars) {
        if (s.caught) continue;
        const dx = tip.x - s.x, dy = tip.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < (s.r + 26 * 0.7) * catchBonus) { hit = { type: 'star', obj: s }; break; }
      }
      if (!hit) {
        for (const d of this.debris) {
          if (d.caught) continue;
          const dx = tip.x - d.x, dy = tip.y - d.y;
          if (Math.sqrt(dx * dx + dy * dy) < (d.r + 26 * 0.7) * catchBonus) { hit = { type: 'debris', obj: d }; break; }
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
      // Slow retract when holding debris; large debris slower than small; waived with glove
      const holdingDebris = this.caughtObj && this.caughtObj.type === 'debris';
      let retractMult;
      if (holdingDebris && !this._isSlotActive('glove')) {
        retractMult = this.caughtObj.obj.isLarge ? 0.15 : 0.3; // large debris much slower
      } else {
        retractMult = 1.5;
      }
      this.netPos -= this.netSpeed * retractMult;
      // Drag caught debris only — stars stay at original position
      if (holdingDebris) {
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
      // Catch flash: bright particles + glow burst
      this._emitStarParticles(hit.obj.x, hit.obj.y);
      this._emitCatchFlash(hit.obj.x, hit.obj.y);
      this._updateHUD();
      if (this.caughtStars >= this.totalStars) {
        this.finished = true;
        this.stop();
        setTimeout(() => this._playConstellationReveal(), 300);
      }
    } else {
      hit.obj.caught = true;
      playDebrisCatch();
      this._emitDebrisParticles(hit.obj.x, hit.obj.y);
      // No time penalty — slow retract is the consequence (see retract logic)
    }
  }

  // ── Constellation reveal animation (after all stars caught) ──
  _playConstellationReveal() {
    this._revealPhase = true;
    this._revealLitStars = new Set();
    this._revealLitLines = [];

    // Build ordered edge list from constellation lines data
    const lines = this.level.lines || [];
    this._revealEdges = lines.map(([a, b]) => ({ a, b }));
    // If no line data, just re-light all stars in index order
    if (this._revealEdges.length === 0) {
      this.stars.forEach((s, i) => this._revealEdges.push({ a: i, b: i }));
    }
    this._revealEdgeIdx = 0;

    // Start render loop for reveal
    const revealLoop = (now) => {
      if (!this._revealPhase) return;
      this._drawRevealFrame();
      this._revealRafId = requestAnimationFrame(revealLoop);
    };
    this._revealRafId = requestAnimationFrame(revealLoop);

    // Schedule each edge lighting
    const INTERVAL = 420; // ms between each edge
    const totalEdges = this._revealEdges.length || this.stars.length;

    const lightNext = (idx) => {
      if (!this._revealPhase) return; // guard: user navigated away during reveal
      if (idx >= totalEdges) {
        // All lit — hold then complete
        setTimeout(() => {
          this._revealPhase = false;
          if (this._revealRafId) cancelAnimationFrame(this._revealRafId);
          this.onComplete(Math.floor(this.timeLeft));
        }, 900);
        return;
      }
      const edge = this._revealEdges[idx];
      this._revealLitStars.add(edge.a);
      this._revealLitStars.add(edge.b);
      if (edge.a !== edge.b) this._revealLitLines.push(edge);
      playRevealNote(idx, totalEdges);
      this._emitStarParticles(
        this.stars[edge.a]?.origX ?? this.stars[0].origX,
        this.stars[edge.a]?.origY ?? this.stars[0].origY
      );
      setTimeout(() => lightNext(idx + 1), INTERVAL);
    };
    lightNext(0);
  }

  _drawRevealFrame() {
    const ctx = this.ctx;
    // Draw background
    this._drawBackground();
    this._drawStarMap();
    this._drawParticles();
    // Draw all stars — lit ones bright gold, rest stay dim
    for (const s of this.stars) {
      if (this._revealLitStars.has(s.id)) {
        // Re-lit: bright gold glow
        const t = Date.now() * 0.003;
        const pulse = 0.85 + 0.15 * Math.sin(t + s.id);
        const visualR = s.r * 2.2 * pulse;
        const grd = ctx.createRadialGradient(s.origX, s.origY, 0, s.origX, s.origY, visualR * 3);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.2, '#ffd700');
        grd.addColorStop(0.6, 'rgba(255,180,0,0.4)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(s.origX, s.origY, visualR * 3, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
        // Core bright
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#fffde0';
        ctx.beginPath();
        ctx.arc(s.origX, s.origY, s.r * 1.5, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      } else {
        // Still dim
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#aaaacc';
        ctx.beginPath();
        ctx.arc(s.origX, s.origY, s.r * 0.5, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      }
    }
    // Draw revealed lines (bright golden)
    for (const edge of this._revealLitLines) {
      const sa = this.stars[edge.a], sb = this.stars[edge.b];
      if (!sa || !sb) continue;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sa.origX, sa.origY);
      ctx.lineTo(sb.origX, sb.origY);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }
    // Draw character
    this._drawCharacter();
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

  // Brief ring-burst flash at catch point — makes the catch feel snappy
  _emitCatchFlash(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TWO_PI;
      const spd = 2.5 + Math.random() * 2;
      this.particles.push(new Particle(
        x, y, '#ffffff',
        Math.cos(angle) * spd, Math.sin(angle) * spd,
        12 + Math.random() * 8, 3 + Math.random() * 2
      ));
    }
    // Golden ring expansion (large fast particles outward)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TWO_PI;
      this.particles.push(new Particle(
        x, y, '#ffd700',
        Math.cos(angle) * 6, Math.sin(angle) * 6,
        10, 4
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
        // CR-047: caught stars — dim, small, at original constellation position
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#aaaacc';
        ctx.shadowColor = '#8888aa';
        ctx.shadowBlur = s.r;
        ctx.beginPath();
        ctx.arc(s.origX, s.origY, s.r * 0.5, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
        continue;
      }

      // CR-047/CR-051: uncaught stars — gold/white, prominent twinkling
      // CR-051: MAX_STAR_R=9, visualR kept at 1.0× (true star size, glow only from shadowBlur)
      const twinkle = 0.75 + 0.25 * Math.sin(t + s.twinklePh);
      const visualR = s.r; // 1× — actual star disc; glow handled by shadowBlur only

      // Outer glow (soft halo, smaller than before)
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, visualR * 2.0);
      grd.addColorStop(0, '#ffd700');
      grd.addColorStop(0.4, 'rgba(255,220,100,0.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, visualR * 2.0, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      // Core (warm white-gold)
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.color; // '#fff8e0' warm white
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = visualR * 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, visualR, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      // Twinkle cross flare on bright stars
      if (twinkle > 0.9) {
        const flen = visualR * 1.8 * twinkle;
        ctx.save();
        ctx.globalAlpha = (twinkle - 0.9) * 3;
        ctx.strokeStyle = '#fffacc';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x - flen, s.y); ctx.lineTo(s.x + flen, s.y);
        ctx.moveTo(s.x, s.y - flen); ctx.lineTo(s.x, s.y + flen);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawDebris() {
    const ctx = this.ctx;
    for (const d of this.debris) {
      if (d.caught) continue;
      const img = this._debrisImgs[d.type];
      if (img && this._debrisImgsReady[d.type]) {
        const size = d.r * 2;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle || 0);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        // Procedural fallback
        switch (d.type) {
          case 'meteor':    drawMeteor(ctx, d.x, d.y, d.r, d.angle); break;
          case 'satellite': drawSatellite(ctx, d.x, d.y, d.r, d.angle); break;
          case 'rocket':    drawRocket(ctx, d.x, d.y, d.r, d.angle); break;
          default:          drawCloth(ctx, d.x, d.y, d.r, d.angle);
        }
      }
    }
  }

  _drawCharacter() {
    const ctx  = this.ctx;
    const cx   = this.charX;
    const cy   = this.charY;
    const t    = Date.now() * 0.002;

    // ── Ground shadow ──────────────────────────────────────────
    ctx.save();
    const shadowGrad = ctx.createRadialGradient(cx, cy + 4, 0, cx, cy + 4, 32);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 32, 7, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // ── Sprite image if loaded ─────────────────────────────────
    if (this._charImgReady && this._charImg) {
      const now = Date.now();
      // Determine state from net
      const netSt = this.netState;
      const holdingStar = this.caughtObj && this.caughtObj.type === 'star';
      if (netSt === 'extend') {
        this._charState = 'throw';
      } else if (netSt === 'retract' && holdingStar) {
        this._charState = 'catch';
      } else {
        this._charState = 'idle';
      }
      // Select frame based on state
      if (this._charState === 'throw') {
        this._charFrameIdx = 2; // throw frame
      } else if (this._charState === 'catch') {
        this._charFrameIdx = 3; // catch/joy frame
      } else {
        // Idle: cycle between frame 0 (open eyes) and frame 1 (blink) slowly
        const blinkInterval = now - this._charLastFrame;
        if (blinkInterval > 3500 && this._charFrameIdx === 0) {
          this._charFrameIdx = 1; // blink
          this._charLastFrame = now;
        } else if (blinkInterval > 150 && this._charFrameIdx === 1) {
          this._charFrameIdx = 0; // eyes open again
          this._charLastFrame = now;
        }
      }
      const DRAW_H = 110; // height in canvas px
      const DRAW_W = DRAW_H; // square frame
      const sx = this._charFrameIdx * this._charFrameW;
      ctx.save();
      ctx.drawImage(
        this._charImg,
        sx, 0, this._charFrameW, this._charFrameH,
        cx - DRAW_W / 2, cy - DRAW_H + 12, DRAW_W, DRAW_H
      );
      ctx.restore();
      return; // skip procedural drawing
    }

    // ── Procedural fallback (if image not yet loaded) ──────────
    // Anime-style proportions (total ~130px tall)
    // cy = feet level; head center at cy-95; hair crown at cy-120
    const HEAD_CY  = cy - 95;   // head center Y
    const HEAD_RX  = 18;        // head half-width
    const HEAD_RY  = 20;        // head half-height (slightly taller)
    const NECK_Y   = HEAD_CY + HEAD_RY - 2; // neck top
    const TORSO_T  = NECK_Y + 8;  // torso top (below neck)
    const TORSO_B  = cy - 38;     // torso bottom / waist
    const SKIRT_T  = TORSO_B;
    const SKIRT_B  = cy - 10;
    const LEG_T    = cy - 10;
    const LEG_B    = cy + 10;     // ankle

    // State
    const netSt   = this.netState;
    const isThrow = netSt === 'extend';
    const isCatch = netSt === 'retract' && this.caughtObj !== null;
    const poleAngle = this.swingAngle;

    // ── Twin tails (drawn BEHIND body) ────────────────────────
    ctx.save();
    const tailSway = Math.sin(t * 0.9) * 6;
    const hairDark  = '#1a0a00';
    const hairMid   = '#3d1f00';
    const hairLight = '#7a4010';
    // Left twin tail
    const ltGrad = ctx.createLinearGradient(cx - 22, HEAD_CY, cx - 30, cy - 20);
    ltGrad.addColorStop(0, hairMid);
    ltGrad.addColorStop(1, hairDark);
    ctx.fillStyle = ltGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 16, HEAD_CY - 8);
    ctx.bezierCurveTo(cx - 28, HEAD_CY + 10, cx - 36 - tailSway, cy - 50, cx - 32 - tailSway * 1.2, cy - 20);
    ctx.bezierCurveTo(cx - 30 - tailSway, cy - 15, cx - 24 - tailSway * 0.5, cy - 18, cx - 20, cy - 30);
    ctx.bezierCurveTo(cx - 22, cy - 48, cx - 18, cy - 62, cx - 14, HEAD_CY + 12);
    ctx.closePath();
    ctx.fill();
    // Right twin tail
    const rtGrad = ctx.createLinearGradient(cx + 22, HEAD_CY, cx + 30, cy - 20);
    rtGrad.addColorStop(0, hairMid);
    rtGrad.addColorStop(1, hairDark);
    ctx.fillStyle = rtGrad;
    ctx.beginPath();
    ctx.moveTo(cx + 16, HEAD_CY - 8);
    ctx.bezierCurveTo(cx + 28, HEAD_CY + 10, cx + 36 + tailSway, cy - 50, cx + 32 + tailSway * 1.2, cy - 20);
    ctx.bezierCurveTo(cx + 30 + tailSway, cy - 15, cx + 24 + tailSway * 0.5, cy - 18, cx + 20, cy - 30);
    ctx.bezierCurveTo(cx + 22, cy - 48, cx + 18, cy - 62, cx + 14, HEAD_CY + 12);
    ctx.closePath();
    ctx.fill();
    // Twin tail ribbon ties (gold)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 4;
    // Left ribbon
    ctx.beginPath();
    ctx.ellipse(cx - 22, cy - 50, 5, 3, -0.5, 0, TWO_PI);
    ctx.fill();
    // Right ribbon
    ctx.beginPath();
    ctx.ellipse(cx + 22, cy - 50, 5, 3, 0.5, 0, TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── Legs ───────────────────────────────────────────────────
    ctx.save();
    const legSway = Math.sin(t) * 2;
    const legGrad = ctx.createLinearGradient(cx, LEG_T, cx, LEG_B + 8);
    legGrad.addColorStop(0, '#f7d5b8');
    legGrad.addColorStop(1, '#e8b888');
    ctx.fillStyle = legGrad;
    // Left leg
    ctx.beginPath();
    ctx.roundRect(cx - 14 + legSway, LEG_T, 11, LEG_B - LEG_T + 5, 3);
    ctx.fill();
    // Right leg
    ctx.beginPath();
    ctx.roundRect(cx + 3 - legSway, LEG_T, 11, LEG_B - LEG_T + 5, 3);
    ctx.fill();
    // White knee-high socks
    ctx.fillStyle = '#f2f2ff';
    ctx.beginPath();
    ctx.roundRect(cx - 14 + legSway, cy - 2, 11, 12, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx + 3 - legSway, cy - 2, 11, 12, 2);
    ctx.fill();
    // Sock top stripe (light purple)
    ctx.fillStyle = 'rgba(160,120,220,0.5)';
    ctx.fillRect(cx - 14 + legSway, cy - 2, 11, 2);
    ctx.fillRect(cx + 3 - legSway, cy - 2, 11, 2);
    // Shoes (deep purple with shine)
    const shoeGrad = ctx.createLinearGradient(0, cy + 8, 0, cy + 18);
    shoeGrad.addColorStop(0, '#6a3a9a');
    shoeGrad.addColorStop(1, '#2a0a50');
    ctx.fillStyle = shoeGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 16 + legSway, cy + 8, 15, 9, [4, 4, 5, 5]);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx + 1 - legSway, cy + 8, 15, 9, [4, 4, 5, 5]);
    ctx.fill();
    // Shoe shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 10 + legSway, cy + 10, 4, 2, -0.3, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8 - legSway, cy + 10, 4, 2, 0.3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // ── Layered skirt ──────────────────────────────────────────
    ctx.save();
    const skirtSway = Math.sin(t * 0.8) * 3;
    // Under-skirt (lighter inner layer)
    const skirtInner = ctx.createLinearGradient(cx, SKIRT_T, cx, SKIRT_B + 8);
    skirtInner.addColorStop(0, '#c8a8f8');
    skirtInner.addColorStop(1, '#9070d0');
    ctx.fillStyle = skirtInner;
    ctx.beginPath();
    ctx.moveTo(cx - 12, SKIRT_T);
    ctx.lineTo(cx + 12, SKIRT_T);
    ctx.bezierCurveTo(cx + 18 + skirtSway, SKIRT_T + 10, cx + 22 + skirtSway, SKIRT_T + 18, cx + 17 + skirtSway, SKIRT_B + 8);
    ctx.lineTo(cx - 17 - skirtSway, SKIRT_B + 8);
    ctx.bezierCurveTo(cx - 22 - skirtSway, SKIRT_T + 18, cx - 18 - skirtSway, SKIRT_T + 10, cx - 12, SKIRT_T);
    ctx.closePath();
    ctx.fill();
    // Outer skirt (deep navy → purple, layered on top)
    const skirtOuter = ctx.createLinearGradient(cx, SKIRT_T, cx, SKIRT_B + 2);
    skirtOuter.addColorStop(0, '#1a0a4a');
    skirtOuter.addColorStop(0.5, '#3a1a7a');
    skirtOuter.addColorStop(1, '#7a40c0');
    ctx.fillStyle = skirtOuter;
    ctx.beginPath();
    ctx.moveTo(cx - 12, SKIRT_T);
    ctx.lineTo(cx + 12, SKIRT_T);
    ctx.bezierCurveTo(cx + 17 + skirtSway, SKIRT_T + 8, cx + 20 + skirtSway, SKIRT_T + 14, cx + 15 + skirtSway, SKIRT_B + 2);
    ctx.lineTo(cx - 15 - skirtSway, SKIRT_B + 2);
    ctx.bezierCurveTo(cx - 20 - skirtSway, SKIRT_T + 14, cx - 17 - skirtSway, SKIRT_T + 8, cx - 12, SKIRT_T);
    ctx.closePath();
    ctx.fill();
    // Skirt hem sparkle dots
    ctx.fillStyle = 'rgba(200,160,255,0.6)';
    for (let si = 0; si < 5; si++) {
      const sx = cx - 16 + si * 8 + skirtSway * 0.5;
      const sy = SKIRT_B + 2 + Math.sin(t + si) * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, TWO_PI);
      ctx.fill();
    }
    // Skirt fold lines
    ctx.strokeStyle = 'rgba(160,100,240,0.35)';
    ctx.lineWidth = 0.8;
    for (let fi = -1; fi <= 1; fi++) {
      ctx.beginPath();
      ctx.moveTo(cx + fi * 5, SKIRT_T);
      ctx.bezierCurveTo(cx + fi * 8 + skirtSway * 0.5, SKIRT_T + 8, cx + fi * 10 + skirtSway, SKIRT_T + 16, cx + fi * 8 + skirtSway, SKIRT_B);
      ctx.stroke();
    }
    ctx.restore();

    // ── Dress torso ────────────────────────────────────────────
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(cx, TORSO_T, cx, TORSO_B);
    torsoGrad.addColorStop(0, '#9a6ed8');
    torsoGrad.addColorStop(0.5, '#6a40b0');
    torsoGrad.addColorStop(1, '#3a1a7a');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 11, TORSO_T);
    ctx.bezierCurveTo(cx - 13, TORSO_T + 10, cx - 13, TORSO_B - 6, cx - 12, TORSO_B);
    ctx.lineTo(cx + 12, TORSO_B);
    ctx.bezierCurveTo(cx + 13, TORSO_B - 6, cx + 13, TORSO_T + 10, cx + 11, TORSO_T);
    ctx.closePath();
    ctx.fill();
    // White sailor collar
    ctx.fillStyle = 'rgba(240,240,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - 11, TORSO_T);
    ctx.lineTo(cx, TORSO_T + 10);
    ctx.lineTo(cx + 11, TORSO_T);
    ctx.lineTo(cx + 9, TORSO_T - 2);
    ctx.lineTo(cx, TORSO_T + 7);
    ctx.lineTo(cx - 9, TORSO_T - 2);
    ctx.closePath();
    ctx.fill();
    // Collar ribbon bow (gold)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'rgba(255,215,0,0.5)'; ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 5, TORSO_T + 4);
    ctx.lineTo(cx, TORSO_T + 8);
    ctx.lineTo(cx + 5, TORSO_T + 4);
    ctx.lineTo(cx + 3, TORSO_T + 2);
    ctx.lineTo(cx, TORSO_T + 6);
    ctx.lineTo(cx - 3, TORSO_T + 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Star decorations on torso
    ctx.fillStyle = 'rgba(255,220,100,0.55)';
    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', cx - 5, TORSO_T + 20);
    ctx.fillText('✦', cx + 5, TORSO_T + 28);
    ctx.restore();

    // ── Arms ───────────────────────────────────────────────────
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    const SHOULDER_Y = TORSO_T + 4;
    const SLEEVE_COLOR = '#7a50c0'; // dress sleeve colour

    if (isThrow) {
      // RIGHT arm fully raised holding staff — prominent throw pose
      const armLen  = 26;
      const rawA    = poleAngle - Math.PI * 0.5;
      const armEndX = cx + 12 + Math.cos(rawA) * armLen;
      const armEndY = SHOULDER_Y + Math.sin(rawA) * armLen;
      // Sleeve
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 12, SHOULDER_Y);
      ctx.lineTo(cx + 12 + Math.cos(rawA) * 12, SHOULDER_Y + Math.sin(rawA) * 12);
      ctx.stroke();
      // Skin forearm
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 12 + Math.cos(rawA) * 12, SHOULDER_Y + Math.sin(rawA) * 12);
      ctx.lineTo(armEndX, armEndY);
      ctx.stroke();
      // Left arm relaxed
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 12, SHOULDER_Y);
      ctx.lineTo(cx - 20, SHOULDER_Y + 14);
      ctx.stroke();
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 20, SHOULDER_Y + 14);
      ctx.lineTo(cx - 24, SHOULDER_Y + 24);
      ctx.stroke();
    } else if (isCatch) {
      // Both arms wide open — V-shape catch pose
      // Left arm
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 12, SHOULDER_Y);
      ctx.lineTo(cx - 22, SHOULDER_Y - 10);
      ctx.stroke();
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 22, SHOULDER_Y - 10);
      ctx.lineTo(cx - 30, SHOULDER_Y - 22);
      ctx.stroke();
      // Right arm
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 12, SHOULDER_Y);
      ctx.lineTo(cx + 22, SHOULDER_Y - 10);
      ctx.stroke();
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 22, SHOULDER_Y - 10);
      ctx.lineTo(cx + 30, SHOULDER_Y - 22);
      ctx.stroke();
    } else {
      // Idle — arms gently swaying at sides
      const idleLift = Math.sin(t * 0.7) * 4;
      // Right arm
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 12, SHOULDER_Y);
      ctx.lineTo(cx + 20, SHOULDER_Y + 10);
      ctx.stroke();
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 20, SHOULDER_Y + 10);
      ctx.lineTo(cx + 22, SHOULDER_Y + 22 - idleLift);
      ctx.stroke();
      // Left arm
      ctx.strokeStyle = SLEEVE_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 12, SHOULDER_Y);
      ctx.lineTo(cx - 20, SHOULDER_Y + 10);
      ctx.stroke();
      ctx.strokeStyle = '#f7d5b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 20, SHOULDER_Y + 10);
      ctx.lineTo(cx - 22, SHOULDER_Y + 22 + idleLift);
      ctx.stroke();
    }
    ctx.restore();

    // ── Neck ───────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = '#f5c5a0';
    ctx.beginPath();
    ctx.roundRect(cx - 5, NECK_Y, 10, 12, 3);
    ctx.fill();
    ctx.restore();

    // ── Head ───────────────────────────────────────────────────
    ctx.save();
    // Skull / face base — warm anime skin
    const headGrad = ctx.createRadialGradient(cx - 4, HEAD_CY - 5, 3, cx, HEAD_CY, HEAD_RX + 4);
    headGrad.addColorStop(0, '#fde8cc');
    headGrad.addColorStop(0.6, '#f8d0a8');
    headGrad.addColorStop(1, '#e8a870');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(cx, HEAD_CY, HEAD_RX, HEAD_RY, 0, 0, TWO_PI);
    ctx.fill();

    // Jawline / chin taper
    ctx.fillStyle = '#f0c090';
    ctx.beginPath();
    ctx.ellipse(cx, HEAD_CY + HEAD_RY - 4, 8, 6, 0, 0, Math.PI);
    ctx.fill();

    // Cheek blush (soft rose)
    ctx.fillStyle = 'rgba(255,130,130,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx - HEAD_RX + 4, HEAD_CY + 4, 6, 4, -0.3, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + HEAD_RX - 4, HEAD_CY + 4, 6, 4, 0.3, 0, TWO_PI);
    ctx.fill();

    // ── Eyes (large almond anime style) ───────────────────────
    const EYE_Y = HEAD_CY - 3;
    const eyeOffsets = [-7, 7];
    eyeOffsets.forEach((ex, i) => {
      const eyeX = cx + ex;
      // Eye white
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(eyeX, EYE_Y, 5, 6, 0, 0, TWO_PI);
      ctx.fill();
      // Iris gradient (violet-blue anime iris)
      const irisGrad = ctx.createRadialGradient(eyeX - 1, EYE_Y - 1, 0, eyeX, EYE_Y, 4.5);
      irisGrad.addColorStop(0, '#a080ff');
      irisGrad.addColorStop(0.5, '#6040c0');
      irisGrad.addColorStop(1, '#2a1060');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(eyeX, EYE_Y, 4, 5, 0, 0, TWO_PI);
      ctx.fill();
      // Pupil
      ctx.fillStyle = '#100820';
      ctx.beginPath();
      ctx.ellipse(eyeX, EYE_Y + 1, 2, 2.5, 0, 0, TWO_PI);
      ctx.fill();
      // Main catchlight (top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(eyeX - 1.5, EYE_Y - 2, 1.5, 0, TWO_PI);
      ctx.fill();
      // Small secondary catchlight
      ctx.beginPath();
      ctx.arc(eyeX + 2, EYE_Y + 1, 0.8, 0, TWO_PI);
      ctx.fill();
      // Upper eyelid line / lash
      ctx.strokeStyle = '#1a0830';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(eyeX, EYE_Y - 1, 5, Math.PI + 0.3, TWO_PI - 0.3);
      ctx.stroke();
      // Eyelash flicks
      ctx.lineWidth = 0.8;
      const lashDir = i === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(eyeX + lashDir * 4.5, EYE_Y - 3);
      ctx.lineTo(eyeX + lashDir * 7, EYE_Y - 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeX + lashDir * 3, EYE_Y - 4.5);
      ctx.lineTo(eyeX + lashDir * 4.5, EYE_Y - 6.5);
      ctx.stroke();
    });

    // Eyebrows (thin arched)
    ctx.strokeStyle = '#2a1000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    [-7, 7].forEach((ex, i) => {
      const bx = cx + ex;
      ctx.beginPath();
      ctx.moveTo(bx - 4 * (i === 0 ? 1 : -1), EYE_Y - 8);
      ctx.quadraticCurveTo(bx, EYE_Y - 10, bx + 4 * (i === 0 ? 1 : -1), EYE_Y - 7.5);
      ctx.stroke();
    });

    // Nose (tiny, anime minimal — just two small dots)
    ctx.fillStyle = 'rgba(180,100,60,0.5)';
    ctx.beginPath();
    ctx.arc(cx - 2, HEAD_CY + 7, 0.9, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2, HEAD_CY + 7, 0.9, 0, TWO_PI);
    ctx.fill();

    // Mouth (gentle smile arc)
    ctx.strokeStyle = '#c06848';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, HEAD_CY + 11, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();
    // Smile dimple dots
    ctx.fillStyle = 'rgba(200,100,80,0.4)';
    ctx.beginPath();
    ctx.arc(cx - 5, HEAD_CY + 12, 0.8, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5, HEAD_CY + 12, 0.8, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // ── Hair (top cap + fringe — drawn over head, under crown) ─
    ctx.save();
    const HAIR_TOP = HEAD_CY - HEAD_RY - 4;
    const hairCapGrad = ctx.createRadialGradient(cx - 5, HAIR_TOP + 4, 2, cx, HEAD_CY - 8, HEAD_RX + 8);
    hairCapGrad.addColorStop(0, '#7a4010');
    hairCapGrad.addColorStop(0.4, '#3d1f00');
    hairCapGrad.addColorStop(1, '#1a0a00');
    ctx.fillStyle = hairCapGrad;
    // Hair cap — covers top of head
    ctx.beginPath();
    ctx.ellipse(cx, HEAD_CY - 6, HEAD_RX + 2, HEAD_RY - 2, 0, Math.PI, TWO_PI);
    ctx.fill();
    // Hair side puffs
    ctx.fillStyle = '#3d1f00';
    ctx.beginPath();
    ctx.ellipse(cx - HEAD_RX + 2, HEAD_CY - 2, 7, 11, -0.2, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + HEAD_RX - 2, HEAD_CY - 2, 7, 11, 0.2, 0, TWO_PI);
    ctx.fill();
    // Fringe strands across forehead
    const strandSway = Math.sin(t * 0.5) * 2;
    ctx.strokeStyle = '#2a1000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const fringeStrands = [
      [cx - 12, HEAD_CY - 16, cx - 14 + strandSway, HEAD_CY + 4],
      [cx - 6,  HEAD_CY - 20, cx - 8 + strandSway * 0.6, HEAD_CY + 6],
      [cx,      HEAD_CY - 22, cx + strandSway * 0.3, HEAD_CY + 8],
      [cx + 6,  HEAD_CY - 20, cx + 8 - strandSway * 0.6, HEAD_CY + 6],
      [cx + 12, HEAD_CY - 16, cx + 14 - strandSway, HEAD_CY + 4],
    ];
    fringeStrands.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) * 0.5 + strandSway * 0.5, (y1 + y2) * 0.5 - 2, x2, y2);
      ctx.stroke();
    });
    // Hair shine streak
    ctx.strokeStyle = 'rgba(140,80,30,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, HEAD_CY - 22);
    ctx.bezierCurveTo(cx - 12, HEAD_CY - 16, cx - 14, HEAD_CY - 10, cx - 10, HEAD_CY - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, HEAD_CY - 24);
    ctx.bezierCurveTo(cx - 1, HEAD_CY - 18, cx - 2, HEAD_CY - 12, cx + 1, HEAD_CY - 5);
    ctx.stroke();

    // Star hair clip (top-right of head)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx + 14, HEAD_CY - 14);
    ctx.shadowBlur = 0;
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
    let tip    = this._netTip();
    let dx     = tip.x - top.x;
    let dy     = tip.y - top.y;
    let len    = Math.sqrt(dx * dx + dy * dy);

    // When swinging at rest (netPos=0), tip===top and len=0.
    // Render net at idle position using a small fixed offset so hoop is always visible.
    if (len < 2 && this.netState === 'swing') {
      const swingAngle = this.swingAngle - Math.PI / 2;
      const IDLE_LEN = 32; // px offset to show net hoop at pole tip
      tip = {
        x: top.x + Math.cos(swingAngle) * IDLE_LEN,
        y: top.y + Math.sin(swingAngle) * IDLE_LEN,
      };
      dx  = tip.x - top.x;
      dy  = tip.y - top.y;
      len = IDLE_LEN;
    } else if (len < 2) {
      return;
    }

    // Direction angle for rotation
    const angle = Math.atan2(dy, dx);
    const px = -dy / len, py = dx / len; // perpendicular

    ctx.save();

    // Rope: slightly curved from pole tip to net mouth
    const ropeCtrlX = (top.x + tip.x) / 2 + px * 6;
    const ropeCtrlY = (top.y + tip.y) / 2 + py * 6;
    ctx.strokeStyle = 'rgba(230,210,150,0.9)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(ropeCtrlX, ropeCtrlY, tip.x, tip.y);
    ctx.stroke();

    // Net bag — SVG sprite if loaded, otherwise procedural
    const hasCatch  = this.caughtObj !== null;
    const enlargeFactor = this._netEnlargeActive ? 1.5 : 1.0;
    const displaySize = 52 * enlargeFactor; // visual size in canvas px

    if (this._netImgReady && this._netImg) {
      // Frame 0 = empty net, Frame 1 = net with catch
      const frameX = hasCatch ? this._netFrameW : 0;
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(angle - Math.PI / 2); // SVG net opens downward, rotate to match direction
      ctx.drawImage(
        this._netImg,
        frameX, 0, this._netFrameW, this._netFrameH,
        -displaySize / 2, -displaySize * 0.2, displaySize, displaySize
      );
      ctx.restore();
    } else {
      // Procedural fallback
      const ux = dx / len, uy = dy / len;
      const perp_x = -uy, perp_y = ux;
      const bulge   = (hasCatch) ? 1.25 : 1.0;
      const mouthR  = 26 * bulge * enlargeFactor;
      const bagDepth = mouthR * 1.7;
      const mx = tip.x, my = tip.y;
      const botX = mx + ux * bagDepth, botY = my + uy * bagDepth;
      ctx.save();
      const bagGrad = ctx.createRadialGradient(mx, my, 0, mx + ux * bagDepth * 0.5, my + uy * bagDepth * 0.5, mouthR * 1.5);
      bagGrad.addColorStop(0, hasCatch ? 'rgba(255,240,160,0.25)' : 'rgba(255,245,200,0.15)');
      bagGrad.addColorStop(1, 'rgba(255,240,180,0.04)');
      ctx.beginPath();
      ctx.moveTo(mx + perp_x * mouthR, my + perp_y * mouthR);
      ctx.bezierCurveTo(
        mx + perp_x * mouthR + ux * bagDepth * 0.6, my + perp_y * mouthR + uy * bagDepth * 0.6,
        botX + perp_x * mouthR * 0.1, botY + perp_y * mouthR * 0.1, botX, botY
      );
      ctx.bezierCurveTo(
        botX - perp_x * mouthR * 0.1, botY - perp_y * mouthR * 0.1,
        mx - perp_x * mouthR + ux * bagDepth * 0.6, my - perp_y * mouthR + uy * bagDepth * 0.6,
        mx - perp_x * mouthR, my - perp_y * mouthR
      );
      ctx.closePath();
      ctx.fillStyle = bagGrad;
      ctx.fill();
      const meshColor = hasCatch ? 'rgba(255,220,80,0.65)' : 'rgba(255,245,190,0.55)';
      ctx.strokeStyle = meshColor;
      ctx.lineWidth   = 1.2;
      for (let i = 1; i <= 6; i++) {
        const t2 = i / 7;
        const spread = mouthR * (1 - t2 * 0.88) * bulge;
        const cx2 = mx + ux * bagDepth * t2, cy2 = my + uy * bagDepth * t2;
        ctx.beginPath();
        ctx.moveTo(cx2 + perp_x * spread, cy2 + perp_y * spread);
        ctx.quadraticCurveTo(cx2 + ux * spread * 0.3, cy2 + uy * spread * 0.3, cx2 - perp_x * spread, cy2 - perp_y * spread);
        ctx.stroke();
      }
      ctx.restore();
      const hoopColor = hasCatch ? '#ffd040' : '#e8c030';
      ctx.strokeStyle = hoopColor;
      ctx.lineWidth   = 3.5;
      if (hasCatch) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14; }
      else { ctx.shadowColor = 'rgba(240,200,60,0.5)'; ctx.shadowBlur = 6; }
      ctx.beginPath();
      ctx.arc(mx, my, mouthR, 0, TWO_PI);
      ctx.stroke();
    }

    // Extending trail
    if (this.netState === 'extend' && len > 10) {
      const grad = ctx.createLinearGradient(top.x, top.y, tip.x, tip.y);
      grad.addColorStop(0,   'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1,   'rgba(255,255,255,0.32)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 8;
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
