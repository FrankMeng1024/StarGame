"""
nav_final.py — Navigate game with current hwnd=198782
Window at (38,38) 1440x817.

Step 1: Find canvas bounds in current DevTools layout
Step 2: Find reload button
Step 3: Navigate all screens
"""
import sys
sys.stdout = open("nav_final_log.txt", "w", encoding="utf-8")

import ctypes, ctypes.wintypes, time, os
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass
import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32
hwnd = 198782

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

user32.ShowWindow(hwnd, 9)  # SW_RESTORE
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
ww = r.right - r.left
wh = r.bottom - r.top
print(f"Window: ({r.left},{r.top}) {ww}x{wh}", flush=True)

# Capture full window to see layout
with mss.mss() as sct:
    reg = {"left": r.left, "top": r.top, "width": ww, "height": wh}
    img = sct.grab(reg)
    arr = np.array(img)[:,:,:3][...,::-1]
    Image.fromarray(arr).save("docs/qa/sprint56-mini-evidence/fullwin-new.png")
    print("Saved fullwin-new.png", flush=True)

# Also capture just top 80 rows
with mss.mss() as sct:
    reg2 = {"left": r.left, "top": r.top, "width": ww, "height": 80}
    img2 = sct.grab(reg2)
    arr2 = np.array(img2)[:,:,:3][...,::-1]
    Image.fromarray(arr2).save("docs/qa/sprint56-mini-evidence/toolbar-new.png")
    print("Saved toolbar-new.png", flush=True)

    # Scan for reload button in rows 26-52 (approx toolbar row 2)
    row2 = arr2[26:52, :, :]
    col_bright = row2.mean(axis=(0, 2))
    base = col_bright.mean()
    print(f"Toolbar row2 mean brightness: {base:.1f}", flush=True)
    peaks = sorted(range(0, min(750, len(col_bright))), key=lambda i: -col_bright[i])[:10]
    print("Top brightness peaks:", flush=True)
    for i in peaks:
        print(f"  x={i}: {col_bright[i]:.1f}", flush=True)

sys.stdout.close()
