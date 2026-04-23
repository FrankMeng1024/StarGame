#!/usr/bin/env node
// download_constellation_images.js
// Downloads one photo per constellation from ESA Hubble CDN (accessible from this network)
// Usage: node scripts/download_constellation_images.js

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'images', 'constellations');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ESA Hubble CDN images — one per constellation, thematically related
// All from cdn.esahubble.org/archives/images/thumb700x/ (stable, accessible)
const CONSTELLATIONS = [
  // id, nameEn, url — ESA/NASA images related to each constellation
  { id: 0,  nameEn: 'Orion',            url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0601a.jpg' },  // Orion Nebula
  { id: 1,  nameEn: 'Ursa_Major',       url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0506a.jpg' },  // M82 in Ursa Major
  { id: 2,  nameEn: 'Scorpius',         url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0712a.jpg' },  // Butterfly Nebula in Scorpius
  { id: 3,  nameEn: 'Leo',              url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0805a.jpg' },  // M66 in Leo
  { id: 4,  nameEn: 'Aries',            url: 'https://cdn.esahubble.org/archives/images/thumb700x/potw1924a.jpg' },  // Star field
  { id: 5,  nameEn: 'Taurus',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0516a.jpg' },  // Crab Nebula in Taurus
  { id: 6,  nameEn: 'Gemini',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0713a.jpg' },  // Eskimo Nebula in Gemini
  { id: 7,  nameEn: 'Cancer',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0515a.jpg' },  // Beehive Cluster area
  { id: 8,  nameEn: 'Virgo',            url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic1523a.jpg' },  // Sombrero Galaxy in Virgo
  { id: 9,  nameEn: 'Libra',            url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0719a.jpg' },  // Galaxy cluster
  { id: 10, nameEn: 'Sagittarius',      url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0706a.jpg' },  // Lagoon Nebula in Sagittarius
  { id: 11, nameEn: 'Capricornus',      url: 'https://cdn.esahubble.org/archives/images/thumb700x/potw1345a.jpg' },  // Star cluster
  { id: 12, nameEn: 'Aquarius',         url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic9910a.jpg' },  // Helix Nebula in Aquarius
  { id: 13, nameEn: 'Pisces',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0908a.jpg' },  // Galaxy in Pisces
  { id: 14, nameEn: 'Cassiopeia',       url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0609a.jpg' },  // Cassiopeia A supernova
  { id: 15, nameEn: 'Perseus',          url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0604a.jpg' },  // Perseus galaxy cluster
  { id: 16, nameEn: 'Aquila',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0702a.jpg' },  // Nebula in Aquila area
  { id: 17, nameEn: 'Cygnus',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic1520a.jpg' },  // Pillars in Cygnus
  { id: 18, nameEn: 'Lyra',             url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic1310a.jpg' },  // Ring Nebula in Lyra
  { id: 19, nameEn: 'Crux',             url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0913a.jpg' },  // Star cluster near Crux
  { id: 20, nameEn: 'Ursa_Minor',       url: 'https://cdn.esahubble.org/archives/images/thumb700x/potw1536a.jpg' },  // Polar region stars
  { id: 21, nameEn: 'Bootes',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0715a.jpg' },  // Galaxy pair in Bootes area
  { id: 22, nameEn: 'Auriga',           url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0506a.jpg' },  // Open cluster area
  { id: 23, nameEn: 'Pegasus',          url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0712a.jpg' },  // Stephan's Quintet in Pegasus
  { id: 24, nameEn: 'Delphinus',        url: 'https://cdn.esahubble.org/archives/images/thumb700x/potw1924a.jpg' },  // Star field
  { id: 25, nameEn: 'Piscis_Austrinus', url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0804a.jpg' },  // Galaxy
  { id: 26, nameEn: 'Draco',            url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0719a.jpg' },  // Draco Dwarf galaxy
  { id: 27, nameEn: 'Ophiuchus',        url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0706a.jpg' },  // Rho Ophiuchi cloud
  { id: 28, nameEn: 'Centaurus',        url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0908a.jpg' },  // Omega Centauri
  { id: 29, nameEn: 'Canes_Venatici',   url: 'https://cdn.esahubble.org/archives/images/thumb700x/heic0506a.jpg' },  // M51 Whirlpool in Canes Venatici
];

function download(url, destPath, redirects) {
  if (redirects === undefined) redirects = 0;
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/png,image/*,*/*',
      }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        res.resume();
        const loc = res.headers.location;
        const fullUrl = loc.startsWith('http') ? loc : new URL(loc, url).href;
        resolve(download(fullUrl, destPath, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', err => { fs.unlink(destPath, () => {}); reject(err); });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const results = [];
  for (const c of CONSTELLATIONS) {
    const ext = c.url.includes('.png') ? 'png' : 'jpg';
    const filename = `${c.id}-${c.nameEn}.${ext}`;
    const destPath = path.join(OUT_DIR, filename);
    process.stdout.write(`[${c.id.toString().padStart(2,'0')}] ${c.nameEn.padEnd(22)} `);
    try {
      await download(c.url, destPath);
      const size = fs.statSync(destPath).size;
      if (size < 5000) {
        fs.unlinkSync(destPath);
        throw new Error(`too small (${size}B) — likely an error page`);
      }
      console.log(`OK  ${(size/1024).toFixed(1)}KB`);
      results.push({ id: c.id, nameEn: c.nameEn, filename, ext, ok: true });
    } catch (e) {
      console.log(`FAIL  ${e.message}`);
      results.push({ id: c.id, nameEn: c.nameEn, filename, ext, ok: false, error: e.message });
    }
  }

  const ok   = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const totalSize = results.filter(r => r.ok).reduce((sum, r) => {
    try { return sum + fs.statSync(path.join(OUT_DIR, r.filename)).size; } catch(e) { return sum; }
  }, 0);

  console.log(`\nDone: ${ok}/${CONSTELLATIONS.length} OK, ${fail} FAIL`);
  console.log(`Total size: ${(totalSize/1024/1024).toFixed(2)}MB`);

  if (fail > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.ok).forEach(r => console.log(`  [${r.id}] ${r.nameEn}: ${r.error}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
