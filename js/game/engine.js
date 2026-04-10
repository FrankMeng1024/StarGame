// game/engine.js — Core game loop, pendulum net, star/debris objects
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;
const LEVEL_TIME = 90; // seconds

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
    this.timeLeft  = LEVEL_TIME;
    this.lastTick  = null;
    this.caughtStars = 0;
    this.totalStars  = this.level.stars.length;
    this.finished    = false;

    // Pendulum
    this.swingAngle   = 0;       // current angle in radians (0 = up)
    this.swingSpeed   = (Math.PI * 2) / (1.5 * 60); // full swing in 1.5s at 60fps
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

    // Bind
    this._handleInput = this._handleInput.bind(this);
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
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (this.netState === 'swing' && !this.finished) {
      this.netState   = 'extend';
      this.netPos     = 0;
      this.caughtObj  = null;
    }
  }

  // ── Game loop ─────────────────────────────────────────────
  start() {
    this.running = true;
    this.lastTick = performance.now();
    document.addEventListener('click', this._handleInput);
    document.addEventListener('keydown', this._handleInput);
    this._loop(performance.now());
  }

  stop() {
    this.running = false;
    document.removeEventListener('click', this._handleInput);
    document.removeEventListener('keydown', this._handleInput);
    if (this.rafId) cancelAnimationFrame(this.rafId);
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
      setTimeout(() => this.onFail(), 300);
      return;
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
      // Drag caught object
      if (this.caughtObj) {
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
      this.caughtStars++;
      this._emitStarParticles(hit.obj.x, hit.obj.y);
      this._updateHUD();
      if (this.caughtStars >= this.totalStars) {
        this.finished = true;
        this.stop();
        setTimeout(() => this.onComplete(Math.floor(this.timeLeft)), 400);
      }
    } else {
      hit.obj.caught = true;
      this._emitDebrisParticles(hit.obj.x, hit.obj.y);
    }
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
    this._drawStars();
    this._drawDebris();
    this._drawNet();
    this._drawCharacter();
    this._drawParticles();
    this._updateHUD();
  }

  _drawBackground() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0,   '#050816');
    grad.addColorStop(0.6, '#0d1230');
    grad.addColorStop(1,   '#1a0d2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Background particle stars
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const seed = this.levelIdx * 100;
    for (let i = 0; i < 120; i++) {
      const x = ((seed * 7 + i * 137.508) % this.W);
      const y = ((seed * 3 + i * 97.31) % (this.H * 0.9));
      const r = (i % 5 === 0) ? 1.2 : 0.6;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.001 + i));
      ctx.globalAlpha = twinkle * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawStars() {
    const ctx = this.ctx;
    const t = Date.now() * 0.002;
    for (const s of this.stars) {
      if (s.caught) continue;
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
      caughtStars: this.caughtStars,
      totalStars:  this.totalStars,
      levelName:   `${this.level.nameZh} · 第${this.levelIdx + 1}关`,
    };
  }
}
