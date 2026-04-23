"""
Test which physical coordinates generate touchend events in WeChat DevTools.
Clicks at multiple positions and captures console output each time.
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

def cap_console(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.4)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left+730, "top": r.top+980, "width": 1190-730, "height": 220}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Make sure DEVTOOLS console is open
print("Opening DEVTOOLS console...")
si(1190, 995, "DEVTOOLS tab", d=1.0)

# Test clicks in a grid across the game canvas
# Canvas physical: left=28, top=93, width=682, height=337
# Test various x positions (left=28 to right=710) and y positions (top=93 to bottom=430)
# Focus the simulator first
print("Focusing simulator...")
si(351, 353, "focus", d=0.5)

test_positions = [
    # (x, y, description)
    (200, 200, "canvas-center-low"),   # left-center, lower y
    (400, 200, "canvas-mid-lower"),   # mid-x, lower y
    (574, 202, "levels-button"),       # the levels button position
    (574, 150, "levels-above"),        # above levels button
    (351, 200, "safe-area-top"),       # safe area but upper y
    (351, 250, "safe-area-mid"),       # safe area mid
]

for px, py, desc in test_positions:
    print(f"\nTesting ({px}, {py}) = {desc}...")
    si(px, py, desc, d=1.5)
    cap_console(f"touch-test-{desc.replace(' ','-')}")

print("\nDONE")
