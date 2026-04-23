"""
calibrate_click.py — Click levels screen and read console to calibrate coordinates.
Usage: python scripts/calibrate_click.py [--click-abs X Y] [--to-levels] [--to-game]

Steps:
  1. Navigate to levels screen (if --to-levels)
  2. Click at absolute coords X Y (if --click-abs)
  3. Read DevTools console via HTTP API to get logged tx/ty game coords
"""
import sys, os, time, subprocess, json, ctypes, ctypes.wintypes, argparse
import urllib.request

ctypes.windll.shcore.SetProcessDpiAwareness(2)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss, numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing: {e} — pip install mss pillow numpy"); sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--to-levels', action='store_true', help='Click 挑战关卡 to go to levels screen')
parser.add_argument('--click-abs', nargs=2, type=int, metavar=('X','Y'), help='Click at absolute physical coords')
parser.add_argument('--shot', type=str, default=None, help='Save screenshot to this path')
parser.add_argument('--wait', type=float, default=1.5, help='Wait after click')
args = parser.parse_args()

user32 = ctypes.windll.user32

def find_devtools_hwnd():
    candidates = []
    def callback(hwnd, _):
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
                    candidates.append((hwnd, w * h))
        except: pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]

def _sendinput_phys(phys_x, phys_y):
    vx_origin = user32.GetSystemMetrics(76)
    vy_origin = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    norm_x = int((phys_x - vx_origin) * 65535 / vw)
    norm_y = int((phys_y - vy_origin) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _INPUT(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_input',)
        _fields_ = [('type', ctypes.c_ulong), ('_input', _INPUT)]

    MOVE = 0x0001; DOWN = 0x0002; UP = 0x0004; ABS = 0x8000; VD = 0x4000

    for flags in [MOVE|ABS|VD, DOWN|ABS|VD, UP|ABS|VD]:
        inp = INPUT(type=0)
        inp.mi.dx = norm_x; inp.mi.dy = norm_y; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)

def take_screenshot(hwnd, path):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": r.right - r.left, "height": r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        pil.save(path)
    print(f"  Screenshot: {path}")

hwnd = find_devtools_hwnd()
if not hwnd:
    print("ERROR: wechatdevtools not found"); sys.exit(1)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
win_left, win_top = r.left, r.top
win_w, win_h = r.right - r.left, r.bottom - r.top
print(f"DevTools window: ({win_left},{win_top}) {win_w}x{win_h}")

# Bring to foreground
user32.ShowWindow(hwnd, 9)  # SW_RESTORE
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Known reference: 挑战关卡 button at abs(2400, 219) navigates from menu to levels
# (from previous session: si(0.500, 0.413) worked)
# Canvas region: CL=1920, CT=33, CW=960, CH=450
# abs(2400, 219) = win-relative (480, 219)

if args.to_levels:
    print("Clicking 挑战关卡 (abs 2400, 219) to navigate to levels...")
    _sendinput_phys(2400, 219)
    time.sleep(2.5)

if args.click_abs:
    x, y = args.click_abs
    print(f"Clicking at abs({x}, {y})...")
    _sendinput_phys(x, y)
    time.sleep(args.wait)

if args.shot:
    os.makedirs(os.path.dirname(os.path.abspath(args.shot)), exist_ok=True)
    take_screenshot(hwnd, args.shot)

print("Done.")
