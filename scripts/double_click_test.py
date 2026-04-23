"""
Test double-click on menu button to handle focus issue.
First click: activates simulator canvas (focus)
Second click: fires touchstart on the canvas element
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

def si(px, py, label=""):
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
    if label: print(f"  click ({px},{py}) → {label}")

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
        print(f"  📸 {name} b={b:.1f}" + (f" ({label})" if label else ""))
    return arr.mean()

user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.5)

print("On MENU. Testing double-click on 挑战关卡...")
print()

# 挑战关卡 center in physical pixels:
# Game coords (675, 126) → physical (28+675*682/844, 93+126*337/390) = (573, 202)
# But we know (557, 196) didn't work either. Let's try various positions with double-click.
# First: a "focus click" at a safe star field area, then the button click.

# Known safe area for focus (not a button): game (400, 300) → physical (28+400*682/844, 93+300*337/390) = (351, 352)
print("Test A: Focus click (safe area) + 挑战关卡 click with 0.3s gap")
si(351, 352, "focus-safe-area")
time.sleep(0.3)
si(573, 202, "挑战关卡 A")
time.sleep(2.5)
b_a = cap("double-click-A", "after test A")

if abs(b_a - 100.5) > 2:
    print("NAVIGATED!")
else:
    print("No navigation. Trying test B...")
    print()

    print("Test B: Focus click on RIGHT panel (not simulator), then menu button")
    # Click on the right DevTools panel to focus it first, then back to simulator button
    si(1000, 300, "right-panel-focus")
    time.sleep(0.3)
    # Now click the menu button — first click focuses simulator, second click should fire touchstart
    si(573, 202, "挑战关卡 B1 (focus)")
    time.sleep(0.2)
    si(573, 202, "挑战关卡 B2 (action)")
    time.sleep(2.5)
    b_b = cap("double-click-B", "after test B")

    if abs(b_b - 100.5) > 2:
        print("NAVIGATED with double-click!")
    else:
        print("Still no navigation.")

        print()
        print("Test C: Just click 星座图鉴 (second button) to check if different button works")
        # 星座图鉴 button: game coords (675, 164) → physical (28+675*682/844, 93+164*337/390) = (573, 235)
        si(573, 235, "星座图鉴")
        time.sleep(2.5)
        cap("test-C-gallery", "after 星座图鉴")

print()
print("DONE")
