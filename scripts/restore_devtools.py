"""
restore_devtools.py — Restore wechatdevtools from minimized state
"""
import sys
sys.stdout = open("restore_log.txt", "w", encoding="utf-8")
import ctypes, ctypes.wintypes, time
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass
import mss, numpy as np
from PIL import Image
import os

user32 = ctypes.windll.user32

# The real DevTools hwnd — restore from minimized
hwnd = 2230606
print(f"Restoring hwnd={hwnd}...", flush=True)

user32.ShowWindow(hwnd, 9)   # SW_RESTORE
time.sleep(0.5)
user32.ShowWindow(hwnd, 5)   # SW_SHOW
time.sleep(0.5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
ww = r.right - r.left
wh = r.bottom - r.top
print(f"Window after restore: ({r.left},{r.top}) {ww}x{wh}", flush=True)

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Capture full window
with mss.mss() as sct:
    reg = {"left": r.left, "top": r.top, "width": ww, "height": wh}
    img = sct.grab(reg)
    arr = np.array(img)[:,:,:3][...,::-1]
    Image.fromarray(arr).save("docs/qa/sprint56-mini-evidence/after-restore.png")
    brightness = float(arr.mean())
    print(f"Saved after-restore.png, brightness={brightness:.1f}", flush=True)

sys.stdout.close()
