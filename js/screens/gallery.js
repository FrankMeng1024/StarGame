// screens/gallery.js — Constellation gallery grid + detail view
import { CONSTELLATIONS, magToRadius, typeToColor } from '../data/constellations.js';
import { SCENE_PALETTES } from '../data/scenes.js';
import { CONSTELLATION_PHOTOS } from '../data/photos.js';
import state from '../state.js';

const TWO_PI = Math.PI * 2;

let _navigate = null;

export function initGallery(navigate) {
  _navigate = navigate;
  _buildGrid();

  // Back buttons
  const btnBackMenu = document.querySelector('.btn-back-menu-from-gallery');
  if (btnBackMenu) btnBackMenu.addEventListener('click', () => navigate('menu'));

  const btnBackGallery = document.querySelector('.btn-back-gallery');
  if (btnBackGallery) btnBackGallery.addEventListener('click', () => {
    _buildGrid();
    navigate('gallery');
  });

  const btnBackGalleryBottom = document.querySelector('.btn-back-gallery-bottom');
  if (btnBackGalleryBottom) btnBackGalleryBottom.addEventListener('click', () => {
    _buildGrid();
    navigate('gallery');
  });
}

export function refreshGallery(navigate) {
  _navigate = navigate;
  _buildGrid();
}

function _buildGrid() {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  grid.innerHTML = '';

  CONSTELLATIONS.forEach((con, idx) => {
    const unlocked  = state.isUnlocked(idx);
    const completed = state.hasCompleted(idx);
    const card = document.createElement('div');
    card.className = `gallery-card ${completed ? 'unlocked' : unlocked ? 'unlocked-incomplete' : 'locked'}`;
    card.setAttribute('role', 'listitem');

    if (completed) {
      card.innerHTML = `
        <div class="gc-icon">${con.icon}</div>
        <div class="gc-name-zh">${con.nameZh}</div>
        <div class="gc-name-en">${con.nameEn}</div>
      `;
      card.addEventListener('click', () => _navigate && _navigate('gallery-detail', { idx }));
    } else if (unlocked) {
      // Unlocked but not completed — grey placeholder same as locked (no name exposed)
      card.innerHTML = `
        <div class="gc-locked-placeholder">？</div>
      `;
    } else {
      // Locked — grey placeholder only, no name or icon
      card.innerHTML = `
        <div class="gc-locked-placeholder">？</div>
      `;
    }

    grid.appendChild(card);
  });
}

export function showGalleryDetail(navigate, params) {
  const { idx } = params;
  const con = CONSTELLATIONS[idx];
  if (!con) return;

  document.querySelector('.detail-name-zh').textContent = con.nameZh;
  document.querySelector('.detail-name-en').textContent = con.nameEn;
  document.querySelector('.detail-lore-text').textContent = con.lore;

  const regionEl = document.getElementById('detail-region');
  const bestViewEl = document.getElementById('detail-best-view');
  const mainStarsEl = document.getElementById('detail-main-stars');
  if (regionEl) regionEl.textContent = con.region || '—';
  if (bestViewEl) bestViewEl.textContent = con.bestViewMonth || '—';
  if (mainStarsEl) mainStarsEl.textContent = con.mainStars || '—';

  _renderPortrait(idx, con);
  _renderStarChart(idx, con);
  _renderPhotoCarousel(con);
}

function _renderPortrait(idx, con) {
  const canvas = document.getElementById('constellation-portrait');
  if (!canvas) return;

  const SIZE = 300;
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Scene-matched background
  const sceneIdx = Math.min(Math.floor(idx / 5), SCENE_PALETTES.length - 1);
  const scene = SCENE_PALETTES[sceneIdx];
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0,   scene.sky0);
  grad.addColorStop(0.6, scene.sky1);
  grad.addColorStop(1,   scene.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Background micro-stars
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 67.3 + idx * 11) % SIZE;
    const y = (i * 41.7 + idx * 7)  % SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 0.5, 0, TWO_PI);
    ctx.fill();
  }

  if (!con.stars || con.stars.length === 0) return;

  // Map normalized positions to canvas with padding
  const PAD  = 32;
  const AREA = SIZE - PAD * 2;
  const stars = con.stars.map(s => ({
    x: PAD + s.x * AREA,
    y: PAD + s.y * AREA,
    r: Math.min(magToRadius(s.mag), 7),
    color: typeToColor(s.type),
  }));

  // Draw constellation lines
  const lines = con.lines || [];
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(255,215,0,0.3)';
  ctx.shadowBlur = 3;
  for (const [a, b] of lines) {
    if (!stars[a] || !stars[b]) continue;
    ctx.beginPath();
    ctx.moveTo(stars[a].x, stars[a].y);
    ctx.lineTo(stars[b].x, stars[b].y);
    ctx.stroke();
  }
  ctx.restore();

  // Draw stars
  for (const s of stars) {
    // Glow
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
    grd.addColorStop(0, s.color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
    // Core
    ctx.save();
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = s.r * 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
}

function _renderStarChart(idx, con) {
  const container = document.getElementById('detail-starchart-svg');
  if (!container) return;

  const SIZE = 480;
  const PAD  = 48;
  const AREA = SIZE - PAD * 2;

  const stars = (con.stars || []).map(s => ({
    x: PAD + s.x * AREA,
    y: PAD + s.y * AREA,
    mag: s.mag,
    name: s.name,
    type: s.type,
  }));

  function magR(mag) { return Math.max(1.2, Math.min(7, (4.5 - mag) * 1.4 + 1.5)); }

  const typeColor = { O:'#a8cfff', B:'#c4dcff', A:'#f0f4ff', F:'#fffbe0', G:'#fff4a0', K:'#ffcc66', M:'#ff7744' };
  function starColor(t) { return typeColor[t] || '#ffffff'; }

  function pseudoRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  }
  const rand = pseudoRand(idx * 7919 + 31337);

  // Background field stars
  let bgStars = '';
  for (let i = 0; i < 120; i++) {
    const bx = (rand() * SIZE).toFixed(1);
    const by = (rand() * SIZE).toFixed(1);
    const br = (rand() * 0.8 + 0.3).toFixed(2);
    const ba = (rand() * 0.45 + 0.1).toFixed(2);
    bgStars += `<circle cx="${bx}" cy="${by}" r="${br}" fill="white" opacity="${ba}"/>`;
  }

  const mwX1 = (SIZE * 0.1).toFixed(0), mwY1 = (SIZE * 0.05).toFixed(0);
  const mwX2 = (SIZE * 0.85).toFixed(0), mwY2 = (SIZE * 0.92).toFixed(0);

  // Constellation lines
  let lineElems = '';
  for (const [a, b] of (con.lines || [])) {
    if (!stars[a] || !stars[b]) continue;
    lineElems += `<line x1="${stars[a].x.toFixed(1)}" y1="${stars[a].y.toFixed(1)}" x2="${stars[b].x.toFixed(1)}" y2="${stars[b].y.toFixed(1)}" stroke="rgba(180,210,255,0.5)" stroke-width="1.2" stroke-dasharray="4,3"/>`;
  }

  // Gradients for star glows (go into defs)
  let glowDefs = '';
  let starElems = '';
  stars.forEach((s, i) => {
    const r = magR(s.mag);
    const col = starColor(s.type);
    const glowId = `sg${idx}_${i}`;
    glowDefs += `<radialGradient id="${glowId}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${col}" stop-opacity="0.7"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
    starElems += `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(r*3.5).toFixed(1)}" fill="url(#${glowId})"/>`;
    starElems += `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}"/>`;
    if (s.mag < 2.5 || i < 3) {
      starElems += `<text x="${(s.x + r + 5).toFixed(1)}" y="${(s.y - 2).toFixed(1)}" fill="rgba(200,220,255,0.85)" font-size="9" font-family="sans-serif">${s.name}</text>`;
    }
  });

  const cx = SIZE / 2, cy = SIZE / 2, cr = SIZE / 2 - 4;

  // Tick marks
  let ticks = '';
  for (let a = 0; a < 360; a += 45) {
    const rad = a * Math.PI / 180;
    const x1 = (cx + (cr - 2) * Math.cos(rad)).toFixed(1);
    const y1 = (cy + (cr - 2) * Math.sin(rad)).toFixed(1);
    const x2 = (cx + (cr - 8) * Math.cos(rad)).toFixed(1);
    const y2 = (cy + (cr - 8) * Math.sin(rad)).toFixed(1);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(120,160,255,0.4)" stroke-width="1"/>`;
  }

  const svgStr = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`,
    `<defs>`,
    `<radialGradient id="skybg${idx}" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#0a0f2e"/><stop offset="100%" stop-color="#000308"/></radialGradient>`,
    `<linearGradient id="mw${idx}" x1="${mwX1}" y1="${mwY1}" x2="${mwX2}" y2="${mwY2}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="rgba(200,220,255,0)"/><stop offset="45%" stop-color="rgba(200,220,255,0.08)"/><stop offset="100%" stop-color="rgba(200,220,255,0)"/></linearGradient>`,
    `<clipPath id="chartclip${idx}"><circle cx="${cx}" cy="${cy}" r="${cr}"/></clipPath>`,
    glowDefs,
    `</defs>`,
    `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="url(#skybg${idx})"/>`,
    `<g clip-path="url(#chartclip${idx})">`,
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="url(#mw${idx})"/>`,
    bgStars,
    lineElems,
    starElems,
    `</g>`,
    `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="none" stroke="rgba(120,160,255,0.3)" stroke-width="1.5"/>`,
    ticks,
    `<text x="${cx}" y="${SIZE - 14}" text-anchor="middle" fill="rgba(180,210,255,0.6)" font-size="11" font-family="sans-serif" letter-spacing="2">${con.nameEn.toUpperCase()}</text>`,
    `</svg>`,
  ].join('');

  container.innerHTML = svgStr;

  // ── Star chart zoom: click to open full-screen modal ──────────
  container.style.cursor = 'zoom-in';

  // Hint text below chart
  let hint = container.nextElementSibling;
  if (!hint || !hint.classList.contains('starchart-hint')) {
    hint = document.createElement('p');
    hint.className = 'starchart-hint';
    hint.textContent = '点击放大查看';
    container.insertAdjacentElement('afterend', hint);
  }

  // Replace click handler each render (avoid stacking)
  if (container._scClickHandler) container.removeEventListener('click', container._scClickHandler);
  container._scClickHandler = () => _openStarChartModal(svgStr);
  container.addEventListener('click', container._scClickHandler);
}

// ── Star chart full-screen modal ──────────────────────────────
function _openStarChartModal(svgStr) {
  let modal = document.getElementById('starchart-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'starchart-modal';
    modal.className = 'starchart-modal-overlay';
    modal.innerHTML = `
      <div class="starchart-modal-inner">
        <button class="starchart-modal-close" id="starchart-modal-close" aria-label="关闭">✕</button>
        <div class="starchart-modal-svg" id="starchart-modal-svg"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) _closeStarChartModal(); });
    modal.querySelector('#starchart-modal-close').addEventListener('click', _closeStarChartModal);
  }

  const svgEl = modal.querySelector('#starchart-modal-svg');
  const scaledSvg = svgStr.replace(/width="\d+"/, 'width="90vmin"').replace(/height="\d+"/, 'height="90vmin"');
  svgEl.innerHTML = scaledSvg;

  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('starchart-modal-visible'));

  document._scModalKeyHandler = (e) => { if (e.key === 'Escape') _closeStarChartModal(); };
  document.addEventListener('keydown', document._scModalKeyHandler);
}

function _closeStarChartModal() {
  const modal = document.getElementById('starchart-modal');
  if (!modal) return;
  modal.classList.remove('starchart-modal-visible');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
  if (document._scModalKeyHandler) {
    document.removeEventListener('keydown', document._scModalKeyHandler);
    document._scModalKeyHandler = null;
  }
}

function _renderPhotoCarousel(con) {
  let carouselSection = document.getElementById('detail-photo-carousel');
  if (!carouselSection) {
    // Insert after the starchart section
    const starchartEl = document.querySelector('.detail-starchart');
    if (!starchartEl) return;
    carouselSection = document.createElement('div');
    carouselSection.id = 'detail-photo-carousel';
    carouselSection.className = 'detail-photo-carousel';
    starchartEl.insertAdjacentElement('afterend', carouselSection);
  }

  const photos = CONSTELLATION_PHOTOS[con.nameEn] || [];
  if (photos.length === 0) {
    carouselSection.style.display = '';
    carouselSection.innerHTML = `
      <div class="photo-carousel-label">📷 天文摄影 · Astrophotography</div>
      <div class="photo-carousel-track">
        <div class="photo-carousel-card photo-carousel-empty">
          <div class="photo-carousel-img-wrap no-image">✦</div>
          <div class="photo-carousel-title">暂无图片</div>
        </div>
      </div>
    `;
    return;
  }

  carouselSection.style.display = '';
  carouselSection.innerHTML = `
    <div class="photo-carousel-label">📷 天文摄影 · Astrophotography</div>
    <div class="photo-carousel-track">
      ${photos.map((p, i) => `
        <div class="photo-carousel-card" data-photo-idx="${i}" style="cursor:zoom-in;" title="点击放大">
          <div class="photo-carousel-img-wrap">
            <img
              src="${p.url}"
              alt="${p.title}"
              class="photo-carousel-img"
              loading="lazy"
              onerror="this.parentElement.classList.add('no-image'); this.style.display='none'; this.parentElement.innerHTML+='✦';"
            />
          </div>
          <div class="photo-carousel-credit">${p.credit}</div>
          <div class="photo-carousel-title">${p.title}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Click-to-enlarge lightbox
  carouselSection.querySelectorAll('.photo-carousel-card[data-photo-idx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.photoIdx);
      _openPhotoLightbox(photos, idx);
    });
  });
}

function _openPhotoLightbox(photos, startIdx) {
  let current = startIdx;

  const _close = () => {
    const lb = document.getElementById('photo-lightbox');
    if (!lb) return;
    lb.classList.remove('photo-lightbox-visible');
    setTimeout(() => { lb.style.display = 'none'; }, 200);
  };

  let lb = document.getElementById('photo-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'photo-lightbox';
    lb.className = 'photo-lightbox-overlay';
    lb.innerHTML = `
      <div class="photo-lightbox-inner">
        <button class="photo-lightbox-close" aria-label="关闭">✕</button>
        <button class="photo-lightbox-prev" aria-label="上一张">‹</button>
        <div class="photo-lightbox-img-wrap">
          <img class="photo-lightbox-img" src="" alt="" />
        </div>
        <button class="photo-lightbox-next" aria-label="下一张">›</button>
        <div class="photo-lightbox-caption">
          <div class="photo-lightbox-title"></div>
          <div class="photo-lightbox-credit"></div>
        </div>
      </div>
    `;
    document.body.appendChild(lb);

    lb.querySelector('.photo-lightbox-close').addEventListener('click', _close);
    lb.addEventListener('click', e => { if (e.target === lb) _close(); });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.style.display !== 'none') _close();
    });
  }

  // Re-bind prev/next via onclick (overwrites any prior binding — no stacking)
  lb.querySelector('.photo-lightbox-prev').onclick = () => {
    current = (current - 1 + photos.length) % photos.length;
    _updateLightbox(lb, photos[current]);
  };
  lb.querySelector('.photo-lightbox-next').onclick = () => {
    current = (current + 1) % photos.length;
    _updateLightbox(lb, photos[current]);
  };

  // Hide nav if only 1 photo
  lb.querySelector('.photo-lightbox-prev').style.display = photos.length > 1 ? '' : 'none';
  lb.querySelector('.photo-lightbox-next').style.display = photos.length > 1 ? '' : 'none';

  _updateLightbox(lb, photos[current]);
  lb.style.display = 'flex';
  requestAnimationFrame(() => lb.classList.add('photo-lightbox-visible'));
}

function _updateLightbox(lb, photo) {
  const img = lb.querySelector('.photo-lightbox-img');
  img.src = photo.url;
  img.alt = photo.title;
  lb.querySelector('.photo-lightbox-title').textContent = photo.title;
  lb.querySelector('.photo-lightbox-credit').textContent = photo.credit;
}
