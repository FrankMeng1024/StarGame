import mss, mss.tools
# Capture full screen and analyze pixel colors to find the game simulator
with mss.mss() as sct:
    full = sct.grab({'top':0,'left':0,'width':1920,'height':1200})
    # Sample pixel colors at y=400 (middle height) across x
    # Looking for the dark blue game background (should be around #0a0e1a or similar)
    pixels = []
    for x in range(800, 1400, 10):
        idx = (400 * full.width + x) * 4  # BGRA
        b, g, r, a = full.raw[idx], full.raw[idx+1], full.raw[idx+2], full.raw[idx+3]
        pixels.append(f"x={x}: rgb({r},{g},{b})")
    print('\n'.join(pixels))
