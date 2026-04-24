/**
 * fix_constellation_photos.js
 * Fixes constellations.js by replacing http URLs with the correct per-constellation local paths.
 * Each constellation's photo URL is replaced with the path downloaded for THAT constellation.
 *
 * Usage: node scripts/fix_constellation_photos.js
 */
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'images', 'constellations');
const CONSTELLATIONS_JS = path.join(__dirname, '..', 'miniprogram', 'js', 'data', 'constellations.js');

function main() {
  let content = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');

  // Parse constellation data: find each constellation's id, nameEn, and its photo list
  const idMatches = [...content.matchAll(/id:\s*(\d+),\s*nameZh:\s*['"]([^'"]*)['"]\s*,\s*nameEn:\s*['"]([^'"]*)['"]/g)];

  const conData = [];
  idMatches.forEach(m => {
    const id = parseInt(m[1]);
    const nameZh = m[2];
    const nameEn = m[3].replace(/[^a-zA-Z0-9_]/g, '_');
    const pos = m.index;
    const photosMatch = content.slice(pos).match(/photos:\s*\[([\s\S]*?)\]/);
    if (photosMatch) {
      // Get all photos (both local and http) in order
      const allPhotos = [...photosMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
      const photosBlock = photosMatch[0];
      const photosStart = pos + content.slice(pos).indexOf(photosMatch[0]);
      conData.push({ id, nameZh, nameEn, allPhotos, photosBlock, photosStart });
    }
  });

  console.log(`Found ${conData.length} constellations`);

  // For each constellation, rebuild its photos block with correct local paths
  // Process in reverse order so string positions don't shift
  const sortedByPos = [...conData].sort((a, b) => b.photosStart - a.photosStart);

  let fixCount = 0;
  for (const con of sortedByPos) {
    let photoIdx = 1;  // photos[0] = local (already correct), photos[1..3] = replacements
    let newPhotosBlock = con.photosBlock;

    for (const photo of con.allPhotos) {
      if (photo.startsWith('http')) {
        // This is an http URL — replace with the per-constellation local path
        const ext = photo.includes('.jpg') || photo.includes('.jpeg') ? '.jpg' : '.png';
        const localName = `${con.id}-${con.nameEn}-${photoIdx + 1}${ext}`;
        const localPath = `assets/images/constellations/${localName}`;

        // Check if local file exists
        const fullPath = path.join(ASSETS_DIR, localName);
        if (!fs.existsSync(fullPath)) {
          console.log(`  ⚠ Missing file: ${localName} — keeping URL`);
          photoIdx++;
          continue;
        }

        // Replace this specific URL in the photos block
        const escaped = photo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`['"]${escaped}['"]`);
        newPhotosBlock = newPhotosBlock.replace(re, `'${localPath}'`);
        photoIdx++;
        fixCount++;
      } else if (photo.startsWith('assets/')) {
        // Already a local path — check if it points to correct file or is a cross-constellation mistake
        const filename = photo.split('/').pop();
        const expectedPrefix = `${con.id}-`;
        if (!filename.startsWith(expectedPrefix)) {
          // This is a wrong cross-constellation reference — find the right file
          // It should be the photoIdx-th local image for this constellation
          const ext = filename.includes('.jpg') ? '.jpg' : '.png';
          const localName = `${con.id}-${con.nameEn}-${photoIdx + 1}${ext}`;
          const localPath = `assets/images/constellations/${localName}`;
          const fullPath = path.join(ASSETS_DIR, localName);

          if (fs.existsSync(fullPath)) {
            const escaped = photo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`['"]${escaped}['"]`);
            newPhotosBlock = newPhotosBlock.replace(re, `'${localPath}'`);
            fixCount++;
          }
        }
        photoIdx++;
      }
    }

    // Replace the old photos block with the new one in content
    if (newPhotosBlock !== con.photosBlock) {
      content = content.slice(0, con.photosStart) + newPhotosBlock + content.slice(con.photosStart + con.photosBlock.length);
    }
  }

  console.log(`Fixed ${fixCount} photo references`);
  fs.writeFileSync(CONSTELLATIONS_JS, content, 'utf8');
  console.log('✓ constellations.js updated');

  // Verify
  const updatedContent = fs.readFileSync(CONSTELLATIONS_JS, 'utf8');
  const allLocalPaths = (updatedContent.match(/assets\/images\/constellations\/[^\s"']+/g) || []);
  const allHttpUrls = (updatedContent.match(/https?:\/\/[^\s"',\n]+/g) || []);
  console.log(`\nVerification:`);
  console.log(`  Local paths: ${allLocalPaths.length}`);
  console.log(`  HTTP URLs remaining: ${allHttpUrls.length}`);

  // Check cross-constellation references
  let crossRefs = 0;
  const idMatchesV = [...updatedContent.matchAll(/id:\s*(\d+),\s*nameZh:\s*['"]([^'"]*)['"]\s*,\s*nameEn:\s*['"]([^'"]*)['"]/g)];
  idMatchesV.forEach(m => {
    const id = parseInt(m[1]);
    const pos = m.index;
    const photosMatch = updatedContent.slice(pos).match(/photos:\s*\[([\s\S]*?)\]/);
    if (photosMatch) {
      const locals = (photosMatch[1].match(/assets\/[^\s"',\n]+/g) || []);
      locals.forEach(l => {
        const fname = l.split('/').pop();
        if (!fname.startsWith(`${id}-`)) {
          console.log(`  ⚠ Cross-ref in constellation ${id}: ${fname}`);
          crossRefs++;
        }
      });
    }
  });
  if (crossRefs === 0) console.log('  ✓ No cross-constellation references');
  else console.log(`  ⚠ ${crossRefs} cross-constellation references remain`);
}

main();
