"""
Click DEVTOOLS tab at correct absolute coords, then check console.
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

def si(px, py, label="", delay_after=0.3):
    nx = int(px * 65535 / sw)
    ny = int(py * 65535 / sh)
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
    send(0x0001|0x8000); time.sleep(0.08)
    send(0x0002|0x8000); time.sleep(0.05)
    send(0x0004|0x8000)
    time.sleep(delay_after)
    if label: print(f"  click ({px},{py}) -> {label}")

def cap_region(name, lx, ly, lw, lh):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.4)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left+lx, "top": r.top+ly, "width": lw, "height": lh}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

print("Step 1: Click DEVTOOLS tab at correct absolute position...")
# DEVTOOLS tab is at absolute (1103-1170, 993-1014), center ~(1136, 1003)
si(1136, 1003, "DEVTOOLS tab", delay_after=1.0)
cap_region("con3-01-devtools-opened", 730, 980, 1190, 220)

print("Step 2: Focus simulator and click 挑战关卡...")
si(351, 353, "focus", delay_after=0.5)
si(574, 202, "挑战关卡", delay_after=2.0)

print("Step 3: Check DEVTOOLS console for touchend log...")
si(1136, 1003, "DEVTOOLS tab again", delay_after=1.0)
cap_region("con3-02-console-after-click", 730, 980, 1190, 220)

print("DONE")
