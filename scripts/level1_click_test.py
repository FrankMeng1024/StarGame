"""
Test clicking Level 1 card directly from level_select.
Uses multiple click positions to test which works.
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

def si(px, py, label=""):
    """SendInput at physical coords."""
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
        print(f"  si ({px},{py}) → {label}")

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
        print(f"  cap {name} brightness={arr.mean():.1f}")
    return path

# Bring to front
user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.5)

print("Currently at level_select. Testing Level 1 card click positions...")
print()

# Test various positions on Level 1 card
# Card appears at approx x=60-155, y=144-244 based on visual inspection
# Center: (106, 193)

# Try 5 different positions within the card
test_positions = [
    (106, 193, "center"),
    (80, 185, "left-center"),
    (130, 175, "upper-right"),
    (106, 160, "upper-center"),
    (106, 215, "lower-center"),
]

for tx, ty, label in test_positions:
    print(f"Testing click at ({tx},{ty}) - {label}")
    si(tx, ty, label)
    time.sleep(1.5)
    cap(f"level1-{label.replace('-','_')}")
    print()
    # Check if we navigated (by pixel difference)
    # If we navigated, break

print("DONE")
