"""
Open DEVTOOLS console tab at correct y position, then click menu button and read logs.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, subprocess
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)

hwnd = 1312814

def si(px, py, label="", delay_after=0.2):
    nx = int(px * 65535 / sw)
    ny = int(py * 65535 / sh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_=('u',); _fields_=[('type',ctypes.c_ulong),('u',U)]
    def send(f):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=f
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000); time.sleep(0.08)
    send(0x0002|0x8000); time.sleep(0.05)
    send(0x0004|0x8000)
    time.sleep(delay_after)
    if label: print(f"  click ({px},{py}) -> {label}")

def cap(name, region=None):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.5)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        if region:
            lx, ly, lw, lh = region
            m = {"left": r.left+lx, "top": r.top+ly, "width": lw, "height": lh}
        else:
            m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")
    return path

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

print("Step 1: Click DEVTOOLS tab at correct position (y~1010)...")
# Tab bar is at absolute y≈1010, DEVTOOLS tab at x≈870
si(870, 1010, "DEVTOOLS tab", delay_after=1.0)

cap("con2-01-devtools-opened")
# Also crop the console panel area
cap("con2-01-console-area", region=(730, 990, 1190, 210))

print("Step 2: Focus simulator and click 挑战关卡...")
si(351, 353, "focus", delay_after=0.5)
si(574, 202, "挑战关卡", delay_after=1.5)

print("Step 3: Click DEVTOOLS tab again to see any new logs...")
si(870, 1010, "DEVTOOLS tab again", delay_after=1.0)
cap("con2-02-after-click")
cap("con2-02-console-area", region=(730, 990, 1190, 210))

print("DONE")
