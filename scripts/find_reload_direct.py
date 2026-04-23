"""
find_reload_direct.py — Use known hwnd=2230606 to find reload button
Writes output to find_reload_out.txt
"""
import sys, os
sys.stdout = open("find_reload_out.txt", "w", encoding="utf-8")

import ctypes, ctypes.wintypes, time
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32
hwnd = 2230606

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}", flush=True)

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Capture toolbar: y=20..70 (covers both header rows), x=0..750
with mss.mss() as sct:
    region = {"left": r.left, "top": r.top+20, "width": 750, "height": 50}
    img = sct.grab(region)
    arr = np.array(img)[:,:,:3][...,::-1]  # RGB
    pil = Image.fromarray(arr)
    pil.save("docs/qa/sprint56-mini-evidence/toolbar-strip.png")
    print(f"Saved toolbar-strip.png: {arr.shape[1]}x{arr.shape[0]}", flush=True)

    # Scan row2 (y=6..32 of crop = y=26..52 from window top) for button brightness
    row2 = arr[6:32, :, :]  # rows 26-52 of window
    col_bright = row2.mean(axis=(0, 2))

    base = col_bright[:200].mean()
    print(f"Baseline (x<200): {base:.1f}", flush=True)

    print("Brightness at key x positions:", flush=True)
    for x in [484, 550, 600, 620, 640, 660, 668, 680, 690, 700, 710]:
        if x < 750:
            print(f"  x={x}: {col_bright[x]:.1f}", flush=True)

    # Top 8 brightness peaks in x=450..750
    peaks = sorted(range(450, min(750, len(col_bright))), key=lambda i: -col_bright[i])[:8]
    print("Top brightness peaks (x=450..750):", flush=True)
    for i in peaks:
        print(f"  x={i}: {col_bright[i]:.1f}", flush=True)

sys.stdout.close()
