"""
Click ← 返回 to navigate back to menu, then capture screenshot.
Also identifies the DevTools toolbar reload button position.
"""
import ctypes, ctypes.wintypes, subprocess, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32

def find_hwnd():
    candidates = []
    def cb(h, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(h, ctypes.byref(pid))
        try:
            out = subprocess.check_output(['tasklist','/FI',f'PID eq {pid.value}','/NH','/FO','CSV'],
                stderr=subprocess.DEVNULL, timeout=2).decode('utf-8','replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(h, ctypes.byref(r))
                if r.right-r.left > 400:
                    candidates.append((h, r.left, r.top, r.right, r.bottom))
        except: pass
        return True
    WFUNC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WFUNC(cb), 0)
    return candidates[0] if candidates else None

def si(px, py):
    """SendInput at physical screen coords."""
    sw = user32.GetSystemMetrics(0)
    sh = user32.GetSystemMetrics(1)
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

    send(0x0001|0x8000)  # MOVE|ABSOLUTE
    time.sleep(0.08)
    send(0x0002|0x8000)  # LEFTDOWN|ABSOLUTE
    time.sleep(0.05)
    send(0x0004|0x8000)  # LEFTUP|ABSOLUTE

def cap(hwnd, name):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint30-evidence", exist_ok=True)
        path = f"docs/qa/sprint30-evidence/{name}"
        pil.save(path)
        print(f"  Saved: {path} ({pil.width}x{pil.height}) brightness={arr.mean():.1f}")
    return path

info = find_hwnd()
if not info:
    print("ERROR: wechatdevtools not found")
    sys.exit(1)
hwnd, wl, wt, wr, wb = info
print(f"hwnd={hwnd} rect=({wl},{wt})-({wr},{wb})")

# Bring to foreground
user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Current state: level_select. Click ← 返回 at physical (95, 122)
print("Clicking ← 返回 at (95, 122)...")
si(95, 122)
time.sleep(2.0)
cap(hwnd, "after-back-click.png")
