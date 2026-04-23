"""
Systematic click test: find which physical screen coords map to 挑战关卡 in game.
Tests a grid of positions on the right side of the menu screen.
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

def si(px, py):
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
    send(0x0001|0x8000); time.sleep(0.1)
    send(0x0002|0x8000); time.sleep(0.08)
    send(0x0004|0x8000)

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
        return arr.mean(), path

user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.5)

print("Currently on MENU. Testing clicks on right side (挑战关卡 area)...")
print("Looking for the click that navigates to level_select.")
print()

# The menu right panel spans from x≈370 to x≈710 (physical)
# Buttons vertically stacked in approx y=170-260 range (physical)
# Let's test a grid: x in [450, 500, 550, 600, 650], y in [175, 195, 215, 235]
# For each, click → wait → check if navigated (save screenshot)

# Reference: if we navigate AWAY from menu, the screenshot will look different
# brightness changes significantly between menu (dark blue) and level_select

test_points = [
    # (x, y, label)
    (450, 185, "x450y185"),
    (500, 185, "x500y185"),
    (550, 185, "x550y185"),  # This was tried - didn't work
    (600, 185, "x600y185"),
    (450, 200, "x450y200"),
    (500, 200, "x500y200"),
    (550, 200, "x550y200"),
    (600, 200, "x600y200"),
    (450, 215, "x450y215"),
    (500, 215, "x500y215"),
    (550, 215, "x550y215"),
    (600, 215, "x600y215"),
]

initial_b, _ = cap("grid-start")
print(f"Initial brightness: {initial_b:.1f}")
print()

for tx, ty, label in test_points:
    print(f"Clicking ({tx},{ty})...", end=" ", flush=True)
    si(tx, ty)
    time.sleep(1.5)
    b, _ = cap(f"grid-{label}")
    if abs(b - initial_b) > 2:
        print(f"NAVIGATED! brightness={b:.1f}")
        # Navigate back to menu for next test
        # Click top area (← 返回 or similar) to go back
        time.sleep(0.5)
        # 返回 button at approx (95, 120) in level_select... but menu doesn't have it
        # Use 返回 at same position (should be different screen now)
        si(95, 120)
        time.sleep(2.0)
        b2, _ = cap(f"grid-{label}-after-back")
        print(f"  After back: brightness={b2:.1f}")
    else:
        print(f"no change (brightness={b:.1f})")

print()
print("DONE")
