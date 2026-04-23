"""
scan_toolbar.py — Scan the toolbar area to find the ↺ reload button precisely
Output goes to scan_toolbar_out.txt
"""
import sys
sys.stdout = open("scan_toolbar_out.txt", "w", encoding="utf-8")

import ctypes, ctypes.wintypes, time, os
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32
hwnd = 2230606

user32.ShowWindow(hwnd, 9); user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}", flush=True)

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Scan toolbar row 2: y=26..56, x=400..750 (left portion only, near reload button)
with mss.mss() as sct:
    # Capture the exact toolbar region for row 2
    reg = {"left": r.left + 400, "top": r.top + 26, "width": 350, "height": 30}
    img = sct.grab(reg)
    arr = np.array(img)[:,:,:3][...,::-1]  # RGB shape (30, 350, 3)

    # Save zoomed version
    zoomed = Image.fromarray(arr).resize((700, 60), Image.NEAREST)
    zoomed.save("docs/qa/sprint56-mini-evidence/toolbar-row2.png")
    print(f"Saved toolbar-row2.png: {arr.shape[1]}x{arr.shape[0]}", flush=True)

    # Find pixels that are "icon gray" (not pure black, not text white)
    # Icon pixels typically: R=160-220, G=160-220, B=160-220 (gray icon on dark bg)
    # Or white: R,G,B > 200
    gray_mask = ((arr[:,:,0] > 100) & (arr[:,:,0] < 240) &
                 (np.abs(arr[:,:,0].astype(int) - arr[:,:,1].astype(int)) < 30) &
                 (np.abs(arr[:,:,1].astype(int) - arr[:,:,2].astype(int)) < 30))

    # Per-column count of "icon gray" pixels
    icon_col_count = gray_mask.sum(axis=0)
    print("Icon-gray pixel count per column (x offset from 400):", flush=True)
    for i in range(0, 350, 5):
        if icon_col_count[i] > 0:
            print(f"  x={400+i}: {icon_col_count[i]}", flush=True)

    # Find peak columns
    peaks = sorted(range(350), key=lambda i: -icon_col_count[i])[:10]
    print("Top icon-gray columns (abs x = offset + 400):", flush=True)
    for i in peaks:
        if icon_col_count[i] > 0:
            print(f"  x={400+i} (offset {i}): count={icon_col_count[i]}", flush=True)

    # Also print the raw RGB at specific positions
    print("\nRGB at specific x positions (y=0..29, x relative to 400):", flush=True)
    for x in [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 80, 85, 90, 95, 100]:
        row_slice = arr[:, x, :]
        mean_rgb = row_slice.mean(axis=0)
        print(f"  x={400+x}: R={mean_rgb[0]:.0f} G={mean_rgb[1]:.0f} B={mean_rgb[2]:.0f}", flush=True)

sys.stdout.close()
