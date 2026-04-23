"""
Take a full screenshot of the game state to see what's currently showing.
Then test if the focus click at (351,353) actually fires touchend by
watching the DEVTOOLS console BEFORE opening it (so focus stays on game).
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
hwnd = 1312814

def si(px, py, label="", d=0.5):
    nx = int(px * 65535 / sw); ny = int(py * 65535 / sh)
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
    send(0x0001|0x8000); time.sleep(0.08); send(0x0002|0x8000); time.sleep(0.05); send(0x0004|0x8000)
    time.sleep(d)
    if label: print(f"  click ({px},{py}) -> {label}")

def cap_full(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

def cap_console(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left+730, "top": r.top+980, "width": 460, "height": 220}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Step 1: Take full screenshot FIRST to see current state
print("Full screenshot of current state...")
cap_full("state-00-current")

# Step 2: Click game area WITHOUT opening DEVTOOLS (to preserve focus)
# Click (351, 353) -- this should fire touchend in game
print("Click (351,353) - should fire touchend...")
si(351, 353, "game-click-1", d=1.0)
cap_full("state-01-after-click-351-353")

# Step 3: Now click at levels button location
print("Click (574, 202) - levels button...")
si(574, 202, "levels-click", d=1.0)
cap_full("state-02-after-click-574-202")

# Step 4: THEN open DEVTOOLS to see console
print("Open DEVTOOLS console...")
si(1190, 995, "DEVTOOLS", d=1.0)
cap_console("state-03-console-after-clicks")

print("DONE")
