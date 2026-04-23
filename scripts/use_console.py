"""
use_console.py — Click DevTools console tab and use wx.__navigate() backdoor
"""
import sys
sys.stdout = open("console_log.txt", "w", encoding="utf-8")

import ctypes, ctypes.wintypes, time, os
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass
import mss, numpy as np
from PIL import Image
import ctypes.wintypes as wt

user32 = ctypes.windll.user32
hwnd = 2230606

user32.ShowWindow(hwnd, 9); user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

r = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}", flush=True)

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Scan the bottom panel for the DEVTOOLS tab
# From full screenshot: the bottom tab bar with BUILD/DEVTOOLS/PROBLEMS/OUTPUT is at y~688-700
# DEVTOOLS tab with "12,3" indicator appears to be around x=1089, y=692
# Let's scan y=685..705 for that region
with mss.mss() as sct:
    # Capture bottom panel tab area
    reg = {"left": r.left + 930, "top": r.top + 680, "width": 500, "height": 30}
    img = sct.grab(reg)
    arr = np.array(img)[:,:,:3][...,::-1]
    Image.fromarray(arr).save("docs/qa/sprint56-mini-evidence/bottom-tabs.png")
    print(f"bottom-tabs.png: {arr.shape[1]}x{arr.shape[0]}", flush=True)

    # Also scan the "Ordinary Compilation" row more carefully
    # The compile row appears to be at y=38-57 based on the screenshot
    reg2 = {"left": r.left, "top": r.top + 38, "width": 750, "height": 22}
    img2 = sct.grab(reg2)
    arr2 = np.array(img2)[:,:,:3][...,::-1]
    Image.fromarray(arr2).save("docs/qa/sprint56-mini-evidence/compile-row.png")
    # Find bright/clickable elements (icons)
    bright = arr2[:,:,0] > 120  # R channel > 120
    per_col = bright.sum(axis=0)
    # Find peaks
    peaks = sorted(range(len(per_col)), key=lambda i: -per_col[i])[:10]
    print("Compile row bright peaks:", flush=True)
    for i in peaks:
        if per_col[i] > 0:
            print(f"  x={i}: {per_col[i]}", flush=True)
    print(f"compile-row.png saved: {arr2.shape[1]}x{arr2.shape[0]}", flush=True)

sys.stdout.close()
