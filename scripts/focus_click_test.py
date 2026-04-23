"""
Two-click test: focus simulator first, then click target.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, argparse
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
HWND = 1312814
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"screen={sw}x{sh}, hwnd={HWND}")

def si(px, py, label=""):
    nx = int(px * 65535 / sw)
    ny = int(py * 65535 / sh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_=('u',); _fields_=[('type',ctypes.c_ulong),('u',U)]
    def send(flags):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000)
    time.sleep(0.08)
    send(0x0002|0x8000)
    time.sleep(0.05)
    send(0x0004|0x8000)
    if label:
        print(f"  Clicked {label} @ ({px},{py})")

def cap(name):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(HWND, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint30-evidence", exist_ok=True)
        path = f"docs/qa/sprint30-evidence/{name}.png"
        pil.save(path)
        print(f"  Screenshot: {path} ({pil.width}x{pil.height}) brightness={arr.mean():.1f}")
    return path

# Bring DevTools to front
user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.0)

print("State: currently on level_select")
print()

# Step 1: Click neutral area in simulator canvas (empty star field at bottom of visible area)
# Canvas: left=28, top=93, width=682, height=337 → bottom=430
# Safe neutral y: ~420 (bottom star field, below all level cards)
print("Step 1: Focus simulator by clicking neutral area (370, 420)...")
si(370, 420, "neutral-focus")
time.sleep(0.5)

# Step 2: Click ← 返回 button at (95, 120)
print("Step 2: Click ← 返回 at (95, 120)...")
si(95, 120, "← 返回")
time.sleep(2.5)
cap("back-with-prefocus")

print()
print("DONE")
