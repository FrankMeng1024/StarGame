"""
Open DEVTOOLS console tab, click menu button, read console output.
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

# Use known hwnd
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

def cap(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.5)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {path}")
    return path

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Take current state screenshot to identify exact positions
cap("console-00-baseline")

print("Step 1: Click DEVTOOLS tab (try multiple positions)...")
# From screenshot, the bottom tab bar bottom labels are at y~721, x positions:
# BUILD=763, DEVTOOLS=860, PROBLEMS=960, OUTPUT=1048
# Try DEVTOOLS tab at several y positions
for tx, ty in [(860, 718), (860, 721), (860, 724)]:
    si(tx, ty, f"DEVTOOLS tab at ({tx},{ty})")
    time.sleep(0.5)

cap("console-01-devtools-tab-clicked")

print("Step 2: Focus simulator then click 挑战关卡...")
# Focus safe area first
si(351, 353, "focus-safe-area", delay_after=0.5)
# Click 挑战关卡
si(574, 202, "挑战关卡", delay_after=1.5)

print("Step 3: Click DEVTOOLS tab again to see logs...")
si(860, 721, "DEVTOOLS tab", delay_after=1.0)
cap("console-02-after-click")

print("Step 4: Take wider screenshot of console area...")
# Read just the bottom console area
r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
with mss.mss() as sct:
    m = {"left": r.left + 730, "top": r.top + 700, "width": 700, "height": 500}
    img = sct.grab(m)
    arr = np.array(img)
    pil = Image.fromarray(arr[:,:,:3][...,::-1])
    pil.save("docs/qa/sprint28-evidence/console-03-bottom-panel.png")
    print("  saved console-03-bottom-panel.png")

print("DONE")
