// screens/complete.js — Level complete & fail screens
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;

export function showComplete(navigate, params) {
  const { idx, timeLeft, coins, caught, total } = params;
  const level = CONSTELLATIONS[idx];

  // Star rating from saved score
  const score = state.getScore(idx);
  const stars = score ? score.stars : 1;
  const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  // Update DOM
  document.querySelector('.complete-title').textContent = `✨ 关卡完成！ ${starStr}`;
  document.querySelector('.stat-caught').textContent = `${caught}/${total}`;
  document.querySelector('.stat-time').textContent = `${Math.floor(timeLeft)}秒`;
  document.querySelector('.stat-coins').textContent = `${coins}枚`;
  document.querySelector('.lore-title').textContent = `${level.nameZh} — ${level.nameEn}`;
  document.querySelector('.lore-text').textContent = level.lore;

  // Reset stat labels for complete context
  const labels = document.querySelectorAll('.stat-label');
  if (labels[1]) labels[1].textContent = '剩余时间';

  // Wire buttons
  const btnNext   = document.querySelector('.btn-next-level');
  const btnShop   = document.querySelector('.btn-shop');
  const btnLevels = document.querySelector('.btn-back-levels');

  btnNext.textContent = '下一关 →';
  btnNext.onclick = () => {
    const nextIdx = idx + 1;
    if (nextIdx < CONSTELLATIONS.length) {
      state.currentLevel = nextIdx;
      navigate('game');
    } else {
      navigate('levels');
    }
  };

  if (btnShop) {
    btnShop.style.display = '';
    btnShop.onclick = () => navigate('shop');
  }
  btnLevels.onclick = () => navigate('levels');

  // Constellation line animation
  _runConstellationAnim(level, idx);
}

export function showFail(navigate, params) {
  const { idx, caught = 0, total, elapsed = 90 } = params;
  const level = CONSTELLATIONS[idx];

  document.querySelector('.complete-title').textContent = '⏰ 时间到了！';
  document.querySelector('.stat-caught').textContent = `${caught}/${total ?? level.stars.length}`;
  document.querySelector('.stat-time').textContent = `${elapsed}秒`;
  document.querySelector('.stat-coins').textContent = '0枚';
  document.querySelector('.lore-title').textContent = `${level.nameZh} — 再试一次？`;
  document.querySelector('.lore-text').textContent = level.lore;

  // Update stat labels for fail context
  const labels = document.querySelectorAll('.stat-label');
  if (labels[1]) labels[1].textContent = '已用时间';

  const btnNext   = document.querySelector('.btn-next-level');
  const btnShop   = document.querySelector('.btn-shop');
  const btnLevels = document.querySelector('.btn-back-levels');

  btnNext.textContent = '🔄 重试';
  btnNext.onclick = () => navigate('game');
  if (btnShop) btnShop.style.display = 'none';
  btnLevels.onclick = () => navigate('levels');

  _runConstellationAnim(level, idx);
}

// ── Constellation animation ────────────────────────────────────
function _runConstellationAnim(level, idx) {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;

  const SIZE = 240;
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Map normalized star positions to canvas
  const PAD  = 28;
  const AREA = SIZE - PAD * 2;
  const stars = level.stars.map(s => ({
    x: PAD + s.x * AREA,
    y: PAD + s.y * AREA,
    r: Math.min(magToRadius(s.mag), 7),
    color: typeToColor(s.type),
  }));

  // Draw background
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Tiny bg stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 67.3) % SIZE;
    const y = (i * 41.7 + idx * 13) % SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 0.5, 0, TWO_PI);
    ctx.fill();
  }

  // Draw all star dots immediately
  stars.forEach(s => {
    ctx.save();
    ctx.fillStyle   = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur  = s.r * 2;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  });

  // Animate lines + star pop-in
  const lines    = level.lines || [];
  const lineDur  = 300;  // ms per line
  const lineGap  = 100;  // ms between lines
  let   lineIdx  = 0;
  let   lineStart = null;

  // Track which stars have been revealed
  const revealedStars = new Set();

  function frame(now) {
    if (!lineStart) lineStart = now;
    const elapsed = now - lineStart;

    // Clear
    ctx.fillStyle = '#050816';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Bg stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 67.3) % SIZE;
      const y = (i * 41.7 + idx * 13) % SIZE;
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, TWO_PI);
      ctx.fill();
    }

    // Draw completed lines
    for (let i = 0; i < lineIdx; i++) {
      const [a, b] = lines[i];
      _drawLine(ctx, stars[a], stars[b], 1);
    }

    // Draw current animating line
    if (lineIdx < lines.length) {
      const progress = Math.min(elapsed / lineDur, 1);
      const [a, b] = lines[lineIdx];
      _drawLine(ctx, stars[a], stars[b], progress);

      if (elapsed >= lineDur) {
        revealedStars.add(lines[lineIdx][0]);
        revealedStars.add(lines[lineIdx][1]);
        lineIdx++;
        lineStart = now + lineGap;
      }
    }

    // Draw stars — dim for unrevealed, bright for revealed
    stars.forEach((s, i) => {
      const revealed = revealedStars.has(i) || lineIdx >= lines.length;
      ctx.save();
      ctx.fillStyle   = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = revealed ? s.r * 3 : s.r;
      ctx.globalAlpha = revealed ? 1 : 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    });

    if (lineIdx < lines.length || elapsed < lineDur) {
      requestAnimationFrame(frame);
    } else {
      // Final glow pulse
      _finalGlow(ctx, stars, SIZE);
    }
  }

  requestAnimationFrame(frame);
}

function _drawLine(ctx, a, b, progress) {
  const endX = a.x + (b.x - a.x) * progress;
  const endY = a.y + (b.y - a.y) * progress;
  const grad = ctx.createLinearGradient(a.x, a.y, endX, endY);
  grad.addColorStop(0,   'rgba(255,215,0,0.8)');
  grad.addColorStop(1,   'rgba(255,215,0,0.4)');
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}

function _finalGlow(ctx, stars, SIZE) {
  let alpha = 0;
  let dir   = 1;
  let count = 0;
  function pulse() {
    ctx.fillStyle = '#050816';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Bg stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 67.3) % SIZE;
      const y = (i * 41.7) % SIZE;
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, TWO_PI);
      ctx.fill();
    }
    stars.forEach((s, i) => {
      // draw lines faintly
    });
    stars.forEach(s => {
      ctx.save();
      ctx.fillStyle   = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = s.r * (3 + alpha * 4);
      ctx.globalAlpha = 0.7 + alpha * 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    });
    alpha += dir * 0.04;
    if (alpha >= 1)      { dir = -1; count++; }
    if (alpha <= 0)      { dir =  1; }
    if (count < 3) requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);
}
