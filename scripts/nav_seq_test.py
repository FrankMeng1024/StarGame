"""
Full navigation test: menu → level_select → game → fail (wait) → menu
Uses corrected canvas bounds and button ratios measured from real screenshots.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
HWND = 1312814
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"screen={sw}x{sh}")

# Canvas physical coordinates (measured from real 1920x1200 screenshot)
# Phone frame: left=28, top=93, right=710, bottom=430
# Canvas: (left, top, width, height)
CANVAS = (28, 93, 682, 337)

def si(px, py, label=""):
    """SendInput at physical screen coords."""
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
    time.sleep(0.1)
    send(0x0002|0x8000)
    time.sleep(0.08)
    send(0x0004|0x8000)
    if label:
        print(f"  🖱  ({px},{py}) → {label}")

def cratio(rx, ry, label=""):
    """Click at canvas-relative ratio."""
    cx, cy, cw, ch = CANVAS
    px = cx + int(cw * rx)
    py = cy + int(ch * ry)
    si(px, py, label + f" ratio({rx:.3f},{ry:.3f})")

def cap(name, label=""):
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
        b = arr.mean()
        print(f"  📸 {name} brightness={b:.1f}" + (f" ({label})" if label else ""))
    return path

# Current state: MENU (after previous test navigated here)
user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.0)

cap("nav-00-start", "current state")

print()
print("[1/4] Level Select: click 挑战关卡")
# From menu, 挑战关卡 center at (557, 196)
# Canvas ratio: ((557-28)/682, (196-93)/337) = (0.776, 0.306)
cratio(0.776, 0.306, "挑战关卡")
time.sleep(2.5)
cap("nav-01-level-select", "after 挑战关卡 click")

print()
print("[2/4] Game: click Level 1 猎户座")
# Level 1 card center in level_select screen
# From the level_select screenshot: card center at approx (106, 193)
# Ratio: ((106-28)/682, (193-93)/337) = (0.114, 0.297)
cratio(0.114, 0.297, "Level 1 猎户座")
time.sleep(2.5)
cap("nav-02-after-level1", "after Level 1 click")

print()
print("[3/4] Skip intro overlay (跳过)")
# If item selection overlay appears, 跳过 is at approximately (291, 314)
# Canvas ratio: ((291-28)/682, (314-93)/337) = (0.386, 0.656)
cratio(0.386, 0.656, "跳过 overlay")
time.sleep(2.5)
cap("nav-03-game", "after 跳过 click")

print()
print("[4/4] Done - check screenshots")
print()
print("Canvas used:", CANVAS)
print("Button ratios:")
print(f"  挑战关卡: (0.776, 0.306) → physical ({28+int(682*0.776)}, {93+int(337*0.306)})")
print(f"  Level 1:  (0.114, 0.297) → physical ({28+int(682*0.114)}, {93+int(337*0.297)})")
print(f"  跳过:     (0.386, 0.656) → physical ({28+int(682*0.386)}, {93+int(337*0.656)})")
