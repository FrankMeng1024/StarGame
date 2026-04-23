"""Quick diagnostic: find DevTools hwnd and window rect."""
import ctypes, ctypes.wintypes, subprocess, sys, mss, numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
    print("DPI: PROCESS_PER_MONITOR_DPI_AWARE")
except Exception as e:
    print(f"DPI failed: {e}")

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"Screen: {sw}x{sh}")

candidates = []
def cb(h, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(h, ctypes.byref(pid))
    try:
        out = subprocess.check_output(
            ['tasklist', '/FI', f'PID eq {pid.value}', '/NH', '/FO', 'CSV'],
            stderr=subprocess.DEVNULL, timeout=2
        ).decode('utf-8', 'replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(h, ctypes.byref(r))
            if r.right - r.left > 400:
                candidates.append((h, r.left, r.top, r.right, r.bottom))
    except Exception:
        pass
    return True

WFUNC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WFUNC(cb), 0)

for h, l, t, ri, b in candidates:
    print(f"hwnd={h} rect=({l},{t})-({ri},{b}) size={ri-l}x{b-t}")

if candidates:
    h, l, t, ri, b = candidates[0]
    # Take a screenshot and save
    with mss.mss() as sct:
        monitor = {"left": l, "top": t, "width": ri-l, "height": b-t}
        img = sct.grab(monitor)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = "docs/qa/sprint30-evidence/hwnd-diag.png"
        import os; os.makedirs("docs/qa/sprint30-evidence", exist_ok=True)
        pil.save(path)
        print(f"Screenshot saved: {path} ({pil.width}x{pil.height})")
