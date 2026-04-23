"""
Debug menu touchend: reload game, click menu button, check DevTools console for logs.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, subprocess
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"screen={sw}x{sh}")

# Find DevTools hwnd
candidates = []
def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
            shell=True, stderr=subprocess.DEVNULL).decode('utf-8', 'replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            if w>400 and h>400:
                candidates.append((hwnd, w*h))
    except: pass
    return True
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WNDENUMPROC(cb), 0)
candidates.sort(key=lambda x: -x[1])
hwnd = candidates[0][0]
print(f"hwnd={hwnd}")

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f"window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}")

def si(px, py, label=""):
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
    if label: print(f"  click ({px},{py}) -> {label}")

def cap(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    r2 = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r2))
    with mss.mss() as sct:
        m = {"left": r2.left, "top": r2.top, "width": r2.right-r2.left, "height": r2.bottom-r2.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        b = arr.mean()
        print(f"  saved {name}.png brightness={b:.1f}")
    return arr

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

print("Step 1: Reload to get BUILD 6 with debug logs...")
si(665, 50, "reload")
time.sleep(22)  # Wait for intro

print("Step 2: Focus simulator safe area...")
si(351, 353, "focus-safe-area")
time.sleep(0.5)

cap("debug-01-menu")

print("Step 3: Click DEVTOOLS tab to clear/check console first...")
# DEVTOOLS tab is at approximately (860, 722) in the bottom tab bar
si(862, 722, "DEVTOOLS tab")
time.sleep(1.0)
cap("debug-02-devtools-before-click")

print("Step 4: Click back on simulator canvas (focus)...")
si(351, 353, "focus-safe-area again")
time.sleep(0.5)

print("Step 5: Click 挑战关卡 button...")
# Canvas (28, 93, 682, 337), game (675, 126) → physical (574, 202)
si(574, 202, "挑战关卡")
time.sleep(1.5)

print("Step 6: Click DEVTOOLS tab to see console log...")
si(862, 722, "DEVTOOLS tab after click")
time.sleep(1.0)
cap("debug-03-devtools-after-click")

print("Step 7: Current game state...")
si(351, 353, "refocus simulator")
time.sleep(0.5)
cap("debug-04-game-state")

print("DONE")
