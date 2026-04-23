import mss, mss.tools
with mss.mss() as sct:
    full = sct.grab({'top':0,'left':0,'width':1920,'height':1200})

    # Find right edge: scan from 1340 rightward at y=400
    print("=== Right edge scan (y=400) ===")
    for x in range(1340, 1920, 10):
        idx = (400 * full.width + x) * 4
        b, g, r, a = full.raw[idx], full.raw[idx+1], full.raw[idx+2], full.raw[idx+3]
        if r < 10 and g < 10 and b < 35:
            pass  # game color
        else:
            print(f"Right edge at x={x}: rgb({r},{g},{b})")
            break

    # Find top edge: scan from top at x=1400
    print("=== Top edge scan (x=1400) ===")
    for y in range(0, 200, 5):
        idx = (y * full.width + 1400) * 4
        b, g, r, a = full.raw[idx], full.raw[idx+1], full.raw[idx+2], full.raw[idx+3]
        print(f"y={y}: rgb({r},{g},{b})")

    # Find bottom edge: scan from bottom at x=1400
    print("=== Bottom edge scan (x=1400) ===")
    for y in range(1100, 800, -5):
        idx = (y * full.width + 1400) * 4
        b, g, r, a = full.raw[idx], full.raw[idx+1], full.raw[idx+2], full.raw[idx+3]
        if r < 20 and g < 20 and b < 50:
            print(f"Bottom game pixel at y={y}: rgb({r},{g},{b})")
            break

    # Confirm range: scan x at y=400 from 1300-1700
    print("=== Full x scan at y=400 ===")
    prev = None
    for x in range(1300, 1800, 5):
        idx = (400 * full.width + x) * 4
        b, g, r, a = full.raw[idx], full.raw[idx+1], full.raw[idx+2], full.raw[idx+3]
        color = f"rgb({r},{g},{b})"
        if color != prev:
            print(f"x={x}: {color}")
            prev = color
