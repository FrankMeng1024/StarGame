// screens/complete.js — Level complete & fail screens
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { CONSTELLATION_PHOTOS } from '../data/photos.js?v=29';
import { SCENE_PALETTES } from '../data/scenes.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;

export function showComplete(navigate, params) {
  const { idx, timeLeft, coins, caught, total, isNewRecord } = params;
  const level = CONSTELLATIONS[idx];

  _applySceneTint(idx);

  // Star rating from saved score
  const score = state.getScore(idx);
  const stars = score ? score.stars : 1;
  const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  // Header
  const titleEl = document.querySelector('.complete-title');
  const ratingEl = document.querySelector('.complete-star-rating');
  const subtitleEl = document.querySelector('.complete-subtitle');
  if (titleEl)   titleEl.textContent = '关卡完成！';
  if (ratingEl)  ratingEl.textContent = starStr;
  if (subtitleEl) {
    subtitleEl.innerHTML = isNewRecord ? '<span class="new-record-inline">🏆 新纪录！</span>' : '';
  }

  // Remove old-style badge if any
  const existing = document.querySelector('.new-record-badge');
  if (existing) existing.remove();

  // Stats row
  document.querySelector('.stat-caught').textContent = `${caught}/${total}`;
  document.querySelector('.stat-time').textContent   = `${Math.floor(timeLeft)}秒`;
  document.querySelector('.stat-coins').textContent  = `${coins}`;

  // Photo (restore visibility — may have been hidden by showFail)
  const photoWrap = document.querySelector('.complete-photo-wrap');
  const loreEl    = document.querySelector('.complete-lore');
  if (photoWrap) photoWrap.style.display = '';
  if (loreEl)    loreEl.style.display    = '';

  // Remove fail-mode class (may have been added by showFail)
  const innerEl = document.querySelector('.complete-inner');
  if (innerEl) innerEl.classList.remove('fail-mode');

  // Hide fail encouragement (may have been shown by showFail)
  const encourageEl = document.querySelector('.fail-encouragement');
  if (encourageEl) encourageEl.style.display = 'none';

  _showPhoto(level);

  // Lore — paginated display
  document.querySelector('.lore-title').textContent = level.nameZh;
  _initLorePager(level.lore);

  // Buttons
  const btnNext   = document.querySelector('.btn-next-level');
  const btnShop   = document.querySelector('.btn-shop');
  const btnLevels = document.querySelector('.btn-back-levels');

  if (btnNext) {
    btnNext.textContent = '下一关';
    btnNext.onclick = () => {
      const nextIdx = idx + 1;
      if (nextIdx < CONSTELLATIONS.length) {
        state.currentLevel = nextIdx;
        navigate('game');
      } else if (state.hasCompleted(idx)) {
        // Q4: All 30 done — go to achievement screen
        navigate('achievement');
      } else {
        // Last level but not yet completed (edge case) — disable
        btnNext.disabled = true;
        btnNext.textContent = '已是最后一关';
      }
    };
    // Q4: rename button if this is level 30 and all constellations completed
    if (idx === CONSTELLATIONS.length - 1 && state.hasCompleted(idx)) {
      btnNext.textContent = '查看全天星图 →';
    }
  }

  if (btnShop) {
    btnShop.style.display = '';
    btnShop.onclick = () => navigate('shop', { from: 'levels' });
  }
  if (btnLevels) btnLevels.onclick = () => navigate('levels');

  // Constellation mini animation
  _runConstellationAnim(level, idx);
}

export function showFail(navigate, params) {
  const { idx, caught = 0, total, elapsed = 90 } = params;
  const level = CONSTELLATIONS[idx];

  _applySceneTint(idx);

  const existing = document.querySelector('.new-record-badge');
  if (existing) existing.remove();

  const titleEl    = document.querySelector('.complete-title');
  const ratingEl   = document.querySelector('.complete-star-rating');
  const subtitleEl = document.querySelector('.complete-subtitle');
  if (titleEl)    titleEl.textContent  = '⏰ 时间到了！';
  if (ratingEl)   ratingEl.textContent = '';
  if (subtitleEl) subtitleEl.innerHTML = '';

  document.querySelector('.stat-caught').textContent = `${caught}/${total ?? level.stars.length}`;
  document.querySelector('.stat-time').textContent   = '0秒';
  document.querySelector('.stat-coins').textContent  = '0';

  // Hide photo and lore on fail — player hasn't earned the story yet
  const photoWrap = document.querySelector('.complete-photo-wrap');
  const loreEl    = document.querySelector('.complete-lore');
  if (photoWrap) photoWrap.style.display = 'none';
  if (loreEl)    loreEl.style.display    = 'none';

  // Compact layout for fail: no tall scrollable lore section
  const innerEl = document.querySelector('.complete-inner');
  if (innerEl) innerEl.classList.add('fail-mode');

  // Show fail encouragement area with dimmed constellation silhouette
  const encourageEl = document.querySelector('.fail-encouragement');
  if (encourageEl) {
    encourageEl.style.display = '';
    const textEl = encourageEl.querySelector('.fail-encouragement-text');
    if (textEl) textEl.textContent = `${level.nameZh}跑得太快了，再来一次！✨`;
    _drawFailConstellation(level);
  }

  const btnNext   = document.querySelector('.btn-next-level');
  const btnShop   = document.querySelector('.btn-shop');
  const btnLevels = document.querySelector('.btn-back-levels');

  if (btnNext) {
    btnNext.textContent = '🔄 重试';
    btnNext.onclick = () => navigate('game');
  }
  if (btnShop)   btnShop.style.display = 'none';
  if (btnLevels) btnLevels.onclick = () => navigate('levels');

  _runConstellationAnim(level, idx);
}

// ── Lore scrollable display ────────────────────────────────────
function _initLorePager(loreText) {
  const loreEl = document.querySelector('.lore-text');
  if (!loreEl) return;

  // Remove any old pager controls (from previous visits)
  const old = document.querySelector('.lore-pager');
  if (old) old.remove();

  // Show full text in scrollable container — no pagination needed
  loreEl.textContent = loreText;
}

function _showPhoto(level) {
  const photoEl       = document.getElementById('complete-photo');
  const placeholder   = document.getElementById('complete-photo-placeholder');
  const photos        = CONSTELLATION_PHOTOS[level.nameEn];
  const photoUrl      = photos?.[0]?.url;

  if (photoEl && placeholder) {
    if (photoUrl) {
      photoEl.src = photoUrl;
      photoEl.alt = photos[0].title || level.nameZh;
      photoEl.style.display = '';
      placeholder.style.display = 'none';
    } else {
      photoEl.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  }
}

// ── Fail constellation silhouette ─────────────────────────────
function _drawFailConstellation(level) {
  const canvas = document.getElementById('fail-constellation-canvas');
  if (!canvas) return;

  const W = 400, H = 220;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.maxWidth = 'min(400px, 90vw)';
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(5, 8, 30, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // Map normalized star positions to canvas
  const PAD  = 24;
  const AREA_W = W - PAD * 2;
  const AREA_H = H - PAD * 2;
  const stars = level.stars.map(s => ({
    x: PAD + s.x * AREA_W,
    y: PAD + s.y * AREA_H,
  }));

  // Draw enhanced constellation lines
  if (level.lines) {
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
    ctx.lineWidth = 1.5;
    for (const [a, b] of level.lines) {
      const sa = stars[a], sb = stars[b];
      if (!sa || !sb) continue;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
  }

  // Draw glowing star dots
  for (const s of stars) {
    // Glow halo via radial gradient
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 7);
    grd.addColorStop(0, 'rgba(180,200,255,0.4)');
    grd.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Core dot
    ctx.save();
    ctx.fillStyle = 'rgba(200, 215, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Constellation animation ────────────────────────────────────
function _runConstellationAnim(level, idx) {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;

  const SIZE = 80;
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

function _applySceneTint(levelIdx) {
  const screen = document.getElementById('screen-complete');
  if (!screen) return;
  const sceneIdx = Math.min(Math.floor(levelIdx / 5), SCENE_PALETTES.length - 1);
  const scene = SCENE_PALETTES[sceneIdx];
  // Subtle tint over the dark base — preserves readability
  screen.style.background = `linear-gradient(180deg, ${scene.sky0}ee 0%, ${scene.sky1}cc 60%, ${scene.sky2}aa 100%)`;
}
