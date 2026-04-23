"""
slice_window.py — Capture 5 horizontal slices of DevTools to identify UI element positions
"""
import sys
sys.stdout = open("slice_log.txt", "w", encoding="utf-8")

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
ww = r.right - r.left
print(f"Window: ({r.left},{r.top}) {ww}x{r.bottom-r.top}", flush=True)

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Capture top 120 rows in 3 slices of 40 rows each, scaled 4x
with mss.mss() as sct:
    for i, y_start in enumerate(range(0, 120, 40)):
        reg = {"left": r.left, "top": r.top + y_start, "width": ww, "height": 40}
        img = sct.grab(reg)
        arr = np.array(img)[:,:,:3][...,::-1]
        # Scale 4x vertically so we can read the UI
        pil = Image.fromarray(arr).resize((min(ww, 1920), 160), Image.NEAREST)
        pil.save(f"docs/qa/sprint56-mini-evidence/slice{i}-y{y_start}-{y_start+40}.png")
        print(f"Saved slice{i}-y{y_start}-{y_start+40}.png: {arr.shape[1]}x{arr.shape[0]}", flush=True)

    # Also capture y=670-720 (bottom panel)
    reg = {"left": r.left, "top": r.top + 670, "width": ww, "height": 50}
    img = sct.grab(reg)
    arr = np.array(img)[:,:,:3][...,::-1]
    pil = Image.fromarray(arr).resize((min(ww, 1920), 200), Image.NEAREST)
    pil.save("docs/qa/sprint56-mini-evidence/slice-bottom-y670-720.png")
    print("Saved slice-bottom-y670-720.png", flush=True)

sys.stdout.close()
