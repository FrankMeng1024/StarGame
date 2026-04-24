/**
 * download_constellation_photos.js
 * Downloads ESA/Hubble photos for all constellations and saves as local assets.
 * Updates constellations.js photos arrays to use local paths.
 *
 * Usage: node scripts/download_constellation_photos.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ASSETS_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'images', 'constellations');
const CONSTELLATIONS_JS = path.join(__dirname, '..', 'miniprogram', 'js', 'data', 'constellations.js');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest);
      if (stat.size > 5000) {
        console.log(`  ✓ already exists: ${path.basename(dest)} (${stat.size} bytes)`);
        return resolve(dest);
      }
    }
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = proto.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stat = fs.statSync(dest);
        console.log(`  ✓ downloaded: ${path.basename(dest)} (${stat.size} bytes)`);
        resolve(dest);
      });
    });
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

async function main() {
  const content = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');

  // Parse constellation data
  const idMatches = [...content.matchAll(/id:\s*(\d+),\s*nameZh:\s*['"]([^'"]*)['"]\s*,\s*nameEn:\s*['"]([^'"]*)['"]/g)];
  const conData = [];

  idMatches.forEach(m => {
    const id = parseInt(m[1]);
    const nameZh = m[2];
    const nameEn = m[3].replace(/[^a-zA-Z0-9_]/g, '_');
    const pos = m.index;
    const photosMatch = content.slice(pos).match(/photos:\s*\[([\s\S]*?)\]/);
    if (photosMatch) {
      const urls = (photosMatch[1].match(/https?:\/\/[^\s"',\n]+/g) || []);
      const localPaths = (photosMatch[1].match(/assets\/[^\s"',\n]+/g) || []);
      conData.push({ id, nameZh, nameEn, urls, localPaths });
    }
  });

  console.log(`Found ${conData.length} constellations`);

  // Download all HTTP URLs and map to local paths
  const urlToLocal = {};
  let downloaded = 0, skipped = 0, failed = 0;

  for (const con of conData) {
    for (let i = 0; i < con.urls.length; i++) {
      const url = con.urls[i];
      // Derive local filename from constellation id + index
      const ext = url.includes('.jpg') || url.includes('.jpeg') ? '.jpg' : '.png';
      const localName = `${con.id}-${con.nameEn}-${i + 2}${ext}`;  // i+2 because index 1 is the main photo
      const localPath = path.join(ASSETS_DIR, localName);
      const assetPath = `assets/images/constellations/${localName}`;

      urlToLocal[url] = assetPath;

      try {
        await downloadFile(url, localPath);
        downloaded++;
      } catch (e) {
        console.log(`  ✗ FAILED: ${localName} — ${e.message}`);
        urlToLocal[url] = null;  // Mark as failed
        failed++;
      }
    }
  }

  console.log(`\nDownload complete: ${downloaded} ok, ${failed} failed\n`);

  // Now update constellations.js: replace http URLs with local paths
  let newContent = content;
  let replacements = 0;

  for (const [url, localPath] of Object.entries(urlToLocal)) {
    if (localPath === null) continue;  // Skip failed downloads
    // Replace the URL in the file (it's in quotes)
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`'${escaped}'|"${escaped}"`, 'g');
    const before = newContent;
    newContent = newContent.replace(re, `'${localPath}'`);
    if (newContent !== before) replacements++;
  }

  console.log(`Replacing ${replacements} URLs in constellations.js`);
  fs.writeFileSync(CONSTELLATIONS_JS, newContent, 'utf8');
  console.log('✓ constellations.js updated');

  // Verify: count local paths now
  const updatedContent = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');
  const allLocalPaths = (updatedContent.match(/assets\/images\/constellations\/[^\s"']+/g) || []);
  const allHttpUrls = (updatedContent.match(/https?:\/\/[^\s"',\n]+/g) || []);
  console.log(`\nVerification:`);
  console.log(`  Local paths in file: ${allLocalPaths.length}`);
  console.log(`  Remaining HTTP URLs: ${allHttpUrls.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
