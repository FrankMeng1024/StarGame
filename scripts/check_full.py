"""
check_full.py — Capture full DevTools window to find reload button position
"""
import ctypes, ctypes.wintypes, time, sys, subprocess, os, io
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
_log = io.open("check_full_log.txt", "w", encoding="utf-8")
def log(msg):
    _log.write(msg + "\n"); _log.flush()
    print(msg, flush=True)

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32

found = []
def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
            shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            if w>400 and h>400: found.append((hwnd, w*h))
    except: pass
    return True
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WNDENUMPROC(cb), 0)
found.sort(key=lambda x: -x[1])
hwnd = found[0][0]

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
log(f"hwnd={hwnd}")
log(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}")

os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Capture full window
with mss.mss() as sct:
    monitor = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
    img = sct.grab(monitor)
    arr = np.array(img)[:,:,:3][...,::-1]
    pil = Image.fromarray(arr)
    pil.save("docs/qa/sprint56-mini-evidence/full-window.png")
    log(f"Saved full-window.png, size={arr.shape[1]}x{arr.shape[0]}")

# Also capture top 80 rows (toolbar area) zoomed 2x
with mss.mss() as sct:
    monitor2 = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": 80}
    img2 = sct.grab(monitor2)
    arr2 = np.array(img2)[:,:,:3][...,::-1]
    pil2 = Image.fromarray(arr2).resize((arr2.shape[1]*2, arr2.shape[0]*2), Image.NEAREST)
    pil2.save("docs/qa/sprint56-mini-evidence/toolbar-zoom.png")
    log("Saved toolbar-zoom.png")

_log.close()
