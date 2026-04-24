"""
compress_constellation_photos.py
Compresses all constellation JPEG images to fit within WeChat Mini Game 4MB package limit.
Target: resize to max 400px width, JPEG quality 65 → ~15-25KB per image.

Usage: python scripts/compress_constellation_photos.py
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from PIL import Image

ASSETS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'miniprogram', 'assets', 'images', 'constellations'))
TARGET_MAX_W = 400
TARGET_MAX_H = 400
JPEG_QUALITY = 65

def compress_image(path):
    try:
        with Image.open(path) as img:
            orig_size = os.path.getsize(path)
            # Convert to RGB if needed (RGBA etc)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            # Resize if larger than target
            w, h = img.size
            if w > TARGET_MAX_W or h > TARGET_MAX_H:
                ratio = min(TARGET_MAX_W / w, TARGET_MAX_H / h)
                new_w = int(w * ratio)
                new_h = int(h * ratio)
                img = img.resize((new_w, new_h), Image.LANCZOS)
            # Save with compression
            img.save(path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
            new_size = os.path.getsize(path)
            return orig_size, new_size
    except Exception as e:
        print(f'  ERROR {os.path.basename(path)}: {e}')
        return 0, 0

def main():
    files = sorted([f for f in os.listdir(ASSETS_DIR) if f.endswith('.jpg') or f.endswith('.jpeg')])
    print(f'Compressing {len(files)} images in {ASSETS_DIR}')

    total_before = 0
    total_after = 0

    for fname in files:
        fpath = os.path.join(ASSETS_DIR, fname)
        before, after = compress_image(fpath)
        total_before += before
        total_after += after
        ratio = after / before * 100 if before > 0 else 0
        print(f'  {fname}: {before//1024}KB → {after//1024}KB ({ratio:.0f}%)')

    print(f'\nTotal: {total_before//1024//1024:.1f}MB → {total_after//1024//1024:.1f}MB ({total_after/total_before*100:.0f}%)')
    print(f'Saved: {(total_before - total_after)//1024//1024:.1f}MB')

if __name__ == '__main__':
    main()
