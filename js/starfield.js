// starfield.js — animated particle background (shared across UI screens)
const TWO_PI = Math.PI * 2;

class Star {
  constructor(w, h) {
    this.reset(w, h);
  }
  reset(w, h) {
    this.x    = Math.random() * w;
    this.y    = Math.random() * h;
    this.r    = Math.random() < 0.1 ? 1.4 : Math.random() < 0.3 ? 1.0 : 0.6;
    this.ph   = Math.random() * TWO_PI;
    this.spd  = 0.3 + Math.random() * 0.8; // twinkle speed
    this.base = 0.2 + Math.random() * 0.5;
  }
  draw(ctx, t) {
    const a = this.base + (1 - this.base) * Math.abs(Math.sin(t * this.spd + this.ph));
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#e8e8f8';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TWO_PI);
    ctx.fill();
  }
}

export function initStarfield(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  let W, H, stars, rafId;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: 80 }, () => new Star(W, H));
  }

  function loop(now) {
    ctx.clearRect(0, 0, W, H);
    const t = now * 0.001;
    for (const s of stars) s.draw(ctx, t);
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}
