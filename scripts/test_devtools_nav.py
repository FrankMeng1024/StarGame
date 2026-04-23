"""
test_devtools_nav.py — Test navigating via Chrome DevTools console.
Clicks DEVTOOLS tab, types wx.__navigate('levels') in the console.
"""
import ctypes, ctypes.wintypes, mss, subprocess, time, os, sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

user32 = ctypes.windll.user32

def find_devtools():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL
            ).decode('utf-8', 'replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w, h = r.right - r.left, r.bottom - r.top
                if w > 400 and h > 400:
                    found.append((hwnd, w, h, r.left, r.top))
        except:
            pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    if not found:
        return None
    found.sort(key=lambda x: -(x[1] * x[2]))
    return found[0]

def sendinput(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw)
    ny = int((phys_y - vy) * 65535 / vh)
    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_u',)
        _fields_ = [('type', ctypes.c_ulong), ('_u', _U)]
    F = 0x8000 | 0x4000
    for flags in [0x0001 | F, 0x0002 | F, 0x0004 | F]:
        inp = INPUT(type=0)
        inp.mi.dx = nx; inp.mi.dy = ny; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)

def capture_full(hwnd, wl, wt, ww, wh, filename):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    with mss.mss() as sct:
        region = {'left': wl, 'top': wt, 'width': ww, 'height': wh}
        img = sct.grab(region)
        arr = np.array(img)[:, :, :3][..., ::-1]
        pil = Image.fromarray(arr)
        os.makedirs("docs/qa/sprint32-evidence", exist_ok=True)
        path = f"docs/qa/sprint32-evidence/{filename}"
        pil.save(path)
        print(f"  📸 {filename} brightness={arr.mean():.1f}", flush=True)
    return path

result = find_devtools()
if not result:
    print("NOT FOUND", flush=True)
    sys.exit(1)

hwnd, ww, wh, wl, wt = result
print(f"hwnd={hwnd} pos=({wl},{wt}) size={ww}x{wh}", flush=True)

user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

# Screenshot current state
capture_full(hwnd, wl, wt, ww, wh, "devtools-state-before.png")
print("Before state captured.", flush=True)

# Step 1: Click the DEVTOOLS tab
# From screenshot: tab strip at y≈wh*0.827 (992px in 1200px window)
# DEVTOOLS is the 2nd tab: approximate x position
# Tab order: BUILD | DEVTOOLS | PROBLEMS | OUTPUT | DEBUG CONSOLE | TERMINAL
# BUILD tab ends around x=810, DEVTOOLS tab around x=830-900
devtools_tab_x = wl + int(ww * 0.445)  # ~853 in 1918
devtools_tab_y = wt + int(wh * 0.827)  # ~992 in 1200
print(f"\nClicking DEVTOOLS tab at ({devtools_tab_x},{devtools_tab_y})...", flush=True)
sendinput(devtools_tab_x, devtools_tab_y)
time.sleep(1.5)
capture_full(hwnd, wl, wt, ww, wh, "devtools-tab-clicked.png")

# Step 2: Click the console input area in Chrome DevTools
# Chrome DevTools console input is at the bottom of the DevTools panel
# Panel is in bottom-right: x=wl+730..wl+ww, y=wt+1000..wt+wh
# Console input ("> " prompt) is near bottom: y≈wt+wh-40
console_input_x = wl + int(ww * 0.65)
console_input_y = wt + int(wh * 0.96)
print(f"\nClicking console input at ({console_input_x},{console_input_y})...", flush=True)
sendinput(console_input_x, console_input_y)
time.sleep(0.5)
capture_full(hwnd, wl, wt, ww, wh, "devtools-console-click.png")

# Step 3: Paste wx.__navigate('levels') and press Enter
cmd = "wx.__navigate('levels')"
print(f"\nPasting command: {cmd}", flush=True)
subprocess.run(['powershell', '-Command', f"Set-Clipboard \"{cmd}\""], capture_output=True, timeout=5)
time.sleep(0.2)

VK_CONTROL = 0x11
VK_V = 0x56
keybd = ctypes.windll.user32.keybd_event
keybd(VK_CONTROL, 0, 0, 0)
keybd(VK_V, 0, 0, 0)
keybd(VK_V, 0, 2, 0)
keybd(VK_CONTROL, 0, 2, 0)
time.sleep(0.3)
capture_full(hwnd, wl, wt, ww, wh, "devtools-pasted.png")

# Press Enter
keybd(0x0D, 0, 0, 0)
keybd(0x0D, 0, 2, 0)
time.sleep(2.5)

capture_full(hwnd, wl, wt, ww, wh, "devtools-after-nav.png")
print("\nDone. Check devtools-after-nav.png to see if game navigated.", flush=True)
