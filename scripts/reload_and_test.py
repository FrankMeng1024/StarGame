"""
After changing menu.js touchstart→touchend, reload game and test navigation.
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
    if label: print(f"  🖱  ({px},{py}) → {label}")

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
time.sleep(1.0)

# Step 0: Reload the game to pick up the touchend change
# Toolbar reload button - need to find correct position
# Looking at screenshot, the ↺ reload is in the DevTools top toolbar
# Previously tried (665, 50) which seemed to click "something"
# Let's try different positions for the reload button
# The DevTools toolbar icons appear at the very top of the window
# From the screenshot: there are icons around x=1350-1560 in the toolbar at y≈18

print("Step 0: Reload game (click DevTools ↺ reload button)...")
# Try various toolbar positions
# The toolbar reload (recompile) button appears to be near x=668, y=51 in the second toolbar row
# This is the 2nd toolbar that shows "Ordinary Compilation ▼" and has a circular reload icon
# At x=668, y=51 the circle icon is visible in the second row
si(668, 51, "↺ reload (toolbar row 2)")
time.sleep(20)  # Wait for intro animation

cap("reload-00-after-reload", "after reload")

print()
print("Step 1: Navigate to level_select via 挑战关卡")
# 挑战关卡 button: game coords (675, 126) → physical (573, 202)
# Actually use (557, 196) which we already know from screenshots
si(557, 196, "挑战关卡")
time.sleep(2.5)
cap("reload-01-level-select", "after 挑战关卡")

print("DONE")
