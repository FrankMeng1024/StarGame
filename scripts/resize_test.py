"""
Resize WeChat DevTools window to 1280x800 (SPIKE-002 calibration size)
then test the exact SPIKE-002 click coordinates.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
# NO DPI awareness - use logical coordinates like SPIKE-002
# (do not call SetProcessDpiAwareness)

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"Screen logical: {sw}x{sh}")

hwnd = 1312814

def si(px, py, label="", d=0.5):
    """Click using logical screen coordinates (no DPI awareness)."""
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
    if label: print(f"  click logical ({px},{py}) -> {label}")

def cap(name):
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    print(f"  window: {r.left},{r.top},{r.right},{r.bottom} size={r.right-r.left}x{r.bottom-r.top}")
    with mss.mss() as sct:
        m = {'left':r.left,'top':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs('docs/qa/sprint28-evidence',exist_ok=True)
        path = f'docs/qa/sprint28-evidence/{name}.png'
        pil.save(path)
        print(f'  saved {name}.png')

# Step 1: Restore and resize window to 1280x800
print("Step 1: Restore and resize window to 1280x800 (logical)...")
user32.ShowWindow(hwnd, 9)  # SW_RESTORE
time.sleep(0.3)

# MoveWindow to set position and size
# In logical coordinates (no DPI awareness): (0, 0, 1280, 800)
result = user32.MoveWindow(hwnd, 0, 0, 1280, 800, 1)
print(f"  MoveWindow result: {result}")
time.sleep(0.5)
user32.SetForegroundWindow(hwnd)
time.sleep(0.5)
cap("resize-01-1280x800")

# Step 2: Click SPIKE-002's reload button position (921, 70) in 1280x800 logical
print("Step 2: Reload game with SPIKE-002 coords...")
# Reload button in SPIKE was at logical (921, 70)
# In 1280x800 logical, the toolbar reload btn should be at approximately same spot
si(921, 70, "reload-spike-coords", d=20.0)  # wait 20s for intro
cap("resize-02-after-reload")

# Step 3: Click SPIKE-002's 挑战关卡 position
# SPIKE: canvas=(13,137,975,450), rx=0.775, ry=0.289
# Physical: (13 + 975*0.775, 137 + 450*0.289) = (768, 267) in logical 1280x800
# BUT with the 1280x800 window, canvas bounds may differ
# Let's use the ratio approach: first check if canvas is at similar location
si(768, 267, "挑战关卡-spike-coords", d=3.0)
cap("resize-03-after-challenge-click")

print("DONE")
