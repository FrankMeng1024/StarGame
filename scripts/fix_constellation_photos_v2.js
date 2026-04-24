/**
 * fix_constellation_photos_v2.js
 * Properly replaces HTTP photo URLs with per-constellation local paths.
 * Processes each constellation's photos block individually to avoid cross-constellation pollution.
 *
 * Usage: node scripts/fix_constellation_photos_v2.js
 */
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'images', 'constellations');
const CONSTELLATIONS_JS = path.join(__dirname, '..', 'miniprogram', 'js', 'data', 'constellations.js');

function main() {
  let content = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');

  // Parse each constellation: id, nameEn, and photos positions
  const idMatches = [...content.matchAll(/id:\s*(\d+),\s*nameZh:\s*['"]([^'"]*)['"]\s*,\s*nameEn:\s*['"]([^'"]*)['"]/g)];

  const conData = [];
  idMatches.forEach(m => {
    const id = parseInt(m[1]);
    const nameEn = m[3].replace(/[^a-zA-Z0-9_]/g, '_');
    const pos = m.index;
    // Find the photos block start and end
    const photosStart = content.indexOf('photos:', pos);
    if (photosStart === -1) return;
    const bracketOpen = content.indexOf('[', photosStart);
    if (bracketOpen === -1) return;
    const bracketClose = content.indexOf(']', bracketOpen);
    if (bracketClose === -1) return;
    const photosBlock = content.slice(bracketOpen + 1, bracketClose);
    conData.push({ id, nameEn, photosStart: bracketOpen + 1, photosEnd: bracketClose, photosBlock });
  });

  console.log(`Found ${conData.length} constellations`);

  // Process in reverse order to preserve string positions
  const sortedByPos = [...conData].sort((a, b) => b.photosStart - a.photosStart);

  let fixCount = 0;
  for (const con of sortedByPos) {
    // Parse photos in order
    const photoEntries = [...con.photosBlock.matchAll(/['"]([^'"]+)['"]/g)];
    let httpIdx = 0; // Track position within http URLs for this constellation
    let newBlock = con.photosBlock;

    for (const entry of photoEntries) {
      const photo = entry[1];
      if (photo.startsWith('http')) {
        httpIdx++;
        const ext = photo.includes('.jpg') || photo.includes('.jpeg') ? '.jpg' : '.png';
        const localName = `${con.id}-${con.nameEn}-${httpIdx + 1}${ext}`;
        const localPath = `assets/images/constellations/${localName}`;
        const fullPath = path.join(ASSETS_DIR, localName);

        if (!fs.existsSync(fullPath)) {
          console.log(`  ⚠ Missing: ${localName}`);
          continue;
        }

        // Replace ONLY the first occurrence of this URL in the current block
        const idx = newBlock.indexOf(`'${photo}'`);
        const idx2 = newBlock.indexOf(`"${photo}"`);
        const replaceIdx = idx !== -1 ? idx : idx2;
        const quoteChar = idx !== -1 ? "'" : '"';

        if (replaceIdx !== -1) {
          newBlock = newBlock.slice(0, replaceIdx) +
                     `'${localPath}'` +
                     newBlock.slice(replaceIdx + photo.length + 2);
          fixCount++;
        }
      }
    }

    // Replace photos block in content
    content = content.slice(0, con.photosStart) + newBlock + content.slice(con.photosEnd);
  }

  console.log(`Fixed ${fixCount} photo references`);
  fs.writeFileSync(CONSTELLATIONS_JS, content, 'utf8');
  console.log('✓ constellations.js updated');

  // Verify
  const updatedContent = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');
  const allLocalPaths = (updatedContent.match(/assets\/images\/constellations\/[^\s"']+/g) || []);
  const allHttpUrls = (updatedContent.match(/https?:\/\/[^\s"',\n]+/g) || []);
  console.log(`\nVerification:`);
  console.log(`  Total local paths: ${allLocalPaths.length}`);
  console.log(`  HTTP URLs remaining: ${allHttpUrls.length}`);

  // Check each constellation
  let crossRefs = 0;
  const idMatchesV = [...updatedContent.matchAll(/id:\s*(\d+),\s*nameZh:\s*['"]([^'"]*)['"]\s*,\s*nameEn:\s*['"]([^'"]*)['"]/g)];
  idMatchesV.forEach(m => {
    const id = parseInt(m[1]);
    const nameEn = m[3];
    const pos = m.index;
    const photosMatch = updatedContent.slice(pos).match(/photos:\s*\[([\s\S]*?)\]/);
    if (photosMatch) {
      const locals = (photosMatch[1].match(/assets\/[^\s"',\n]+/g) || []);
      const http = (photosMatch[1].match(/https?:\/\/[^\s"',\n]+/g) || []);
      // Check cross-refs
      locals.forEach(l => {
        const fname = l.split('/').pop();
        if (!fname.startsWith(`${id}-`)) {
          console.log(`  ⚠ Cross-ref in ${id} ${nameEn}: ${fname}`);
          crossRefs++;
        }
      });
      if (locals.length < 4) console.log(`  ⚠ ${id} ${nameEn}: only ${locals.length} local photos`);
      if (http.length > 0) console.log(`  ⚠ ${id} ${nameEn}: ${http.length} HTTP URLs remain`);
    }
  });
  if (crossRefs === 0) console.log('  ✓ No cross-constellation references');

  // Show sample
  const sample = [...updatedContent.matchAll(/nameEn:\s*['"]Orion['"][\s\S]*?photos:\s*\[([\s\S]*?)\]/)];
  if (sample[0]) console.log('\nOrion photos:', sample[0][1].trim().substring(0, 300));
}

main();
