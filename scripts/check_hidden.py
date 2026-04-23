"""
Check what's hidden in the DevTools console by changing filter settings.
Also look at the console more carefully.
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

def si(px, py, label="", d=0.3):
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

def cap_console_wide(name):
    """Capture the full DevTools console area wider."""
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        # Full DevTools panel height - from tab bar to bottom
        m = {"left": r.left+730, "top": r.top+710, "width": 660, "height": 160}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Step 1: Click "Default levels" dropdown to show ALL log levels (including verbose/info)
# The "Default levels" dropdown is in the console toolbar
# From screenshots it's at approximately (1190, 783) absolute
print("Step 1: Click 'Default levels' dropdown to show all messages...")
si(1190, 783, "default-levels-dropdown", d=0.5)
cap_console_wide("hidden-01-dropdown-opened")

# Look for the "Verbose" option to enable it
# The dropdown probably shows at approximately y=760-800 area
# Let's take a screenshot to see what appeared
print("Step 2: Check dropdown options...")
cap_console_wide("hidden-02-dropdown-view")

# Step 3: Also check 'Default levels' text - try clicking elsewhere to close
si(800, 760, "close-dropdown", d=0.3)

# Now click on game and check console
print("Step 3: Click on game canvas...")
si(574, 202, "game-click", d=1.5)
cap_console_wide("hidden-03-after-game-click")

print("DONE")
