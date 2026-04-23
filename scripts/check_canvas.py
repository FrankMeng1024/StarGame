import ctypes, ctypes.wintypes, time, sys, subprocess
import io
_log = io.open("check_canvas_log.txt", "w", encoding="utf-8")
def log(msg):
    _log.write(msg + "\n")
    _log.flush()
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
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
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV', shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            if w>400 and h>400: found.append((hwnd, w*h))
    except: pass
    return True
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found:
    log("No hwnd")
    sys.exit(1)
found.sort(key=lambda x: -x[1])
hwnd = found[0][0]
log(f"hwnd={hwnd}")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
log(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}")

import os
os.makedirs("docs/qa/sprint56-mini-evidence", exist_ok=True)

# Capture canvas region only (14,137,975,290)
with mss.mss() as sct:
    region = {"left": r.left+14, "top": r.top+137, "width": 975, "height": 290}
    img = sct.grab(region)
    arr = np.array(img)[:,:,:3][...,::-1]
    brightness = float(arr.mean())
    pil = Image.fromarray(arr)
    pil.save("docs/qa/sprint56-mini-evidence/current-canvas.png")
    log(f"Canvas brightness: {brightness:.1f}")
    log(f"Saved: docs/qa/sprint56-mini-evidence/current-canvas.png")
_log.close()
