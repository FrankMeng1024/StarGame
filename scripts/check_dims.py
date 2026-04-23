"""
Add SCREEN_W log to menu.js temporarily to understand canvas dimensions.
Then reload and click to see what the game reports.
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

def si(px, py, label="", d=0.2):
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

def cap_region(name, lx, ly, lw, lh):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.4)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left+lx, "top": r.top+ly, "width": lw, "height": lh}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# 1. Reload game (BUILD 11)
print("Reload...")
si(665, 50, "reload", d=22)  # Wait 22s for intro

# 2. Open DEVTOOLS console
print("Open DEVTOOLS console...")
si(1190, 995, "DEVTOOLS tab", d=1.0)
cap_region("dims-01-console-before", 730, 980, 1190, 220)

# 3. Focus + click anywhere to get the screen_w/h log to appear
print("Focus simulator...")
si(351, 353, "focus", d=0.5)

# Click a random spot to trigger touchend and see the screen dimensions log
# The first touchend will print G.SCREEN_W, G.SCREEN_H
si(574, 202, "touchend-log-trigger", d=1.5)

# 4. Check DEVTOOLS console
si(1190, 995, "DEVTOOLS tab", d=1.0)
cap_region("dims-02-console-after-click", 730, 980, 1190, 220)

# 5. Take full screenshot to see game state
r2 = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r2))
with mss.mss() as sct:
    m = {"left": r2.left, "top": r2.top, "width": r2.right-r2.left, "height": r2.bottom-r2.top}
    img = sct.grab(m)
    pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
    pil.save("docs/qa/sprint28-evidence/dims-03-game-state.png")
    print("  saved dims-03-game-state.png")

print("DONE")
