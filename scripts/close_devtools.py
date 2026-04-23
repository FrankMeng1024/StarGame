"""
Close the DevTools panel entirely, then try clicking the game canvas.
WeChat DevTools may suppress touch events when DevTools is visible.
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
    time.sleep(0.4)
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

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

cap_full("close-dt-00-before")

# Step 1: Close the DevTools panel using the X button
# From screenshots, the DevTools panel has a ∧ (collapse) and X (close) button
# The X button appears at approximately (1363, 722) in window coords
# Let's try the ∧ collapse button first (at ~1337, 722)
print("Step 1: Try to close/collapse DevTools panel...")
# The tab bar shows [BUILD 15] [DEVTOOLS ❶,³] [PROBLEMS] [OUTPUT] [DEBUG CONSOLE] [TERMINAL] [∧] [×]
# The ∧ and × are at the far right of the tab bar
# From screenshot: tab bar is at y≈722, width=1920, so the X button is at approximately x≈1363, y≈722
si(1363, 722, "close-devtools-X", d=0.5)
cap_full("close-dt-01-after-close")

# Step 2: Now try clicking the game canvas
print("Step 2: Click game canvas (挑战关卡 position)...")
si(574, 202, "levels-button", d=1.5)
cap_full("close-dt-02-after-click")

print("DONE")
