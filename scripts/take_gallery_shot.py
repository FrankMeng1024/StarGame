"""
take_gallery_shot.py — Navigate to gallery and screenshot
Uses SetCursorPos + mouse_event pattern from mss_navigate.py
"""
import ctypes, ctypes.wintypes as wt, time, mss, numpy as np, subprocess, os, sys

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32

# Find hwnd
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
found = []
def cb(hwnd, _):
    if not user32.IsWindowVisible(hwnd): return True
    pid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        proc = subprocess.run(['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
            capture_output=True, text=True, timeout=2, encoding='utf-8', errors='ignore')
        if 'wechatdevtools' in proc.stdout.lower():
            tb = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, tb, 256)
            if tb.value: found.append((hwnd, tb.value))
    except: pass
    return True

user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found: print('[FAIL] DevTools not found'); sys.exit(1)
hwnd = found[0][0]
print(f'hwnd={hwnd}')

r = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wx, wy = r.left, r.top
ww, wh = r.right - r.left, r.bottom - r.top
print(f'window: ({wx},{wy}) {ww}x{wh}')

def _sendinput_phys(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    norm_x = int((phys_x - vx) * 65535 / vw)
    norm_y = int((phys_y - vy) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                   ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _I(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_i',)
        _fields_ = [('type',ctypes.c_ulong),('_i',_I)]

    MOVE = 0x0001|0x8000|0x4000
    DOWN = 0x0002|0x8000|0x4000
    UP   = 0x0004|0x8000|0x4000

    for flags in [MOVE, DOWN, UP]:
        inp = INPUT(type=0)
        inp.mi.dx = norm_x; inp.mi.dy = norm_y; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)

def cursor_click(px, py, label=''):
    """Use SetCursorPos + mouse_event (same as canvas_click in mss_navigate)"""
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP
    time.sleep(0.1)
    if label: print(f'  click {label} @ ({px},{py})')

def screenshot(out_path):
    r2 = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r2))
    with mss.mss() as sct:
        monitor = {'left':r2.left,'top':r2.top,'width':r2.right-r2.left,'height':r2.bottom-r2.top}
        img = sct.grab(monitor)
        arr = np.array(img)[:,:,:3]
        from PIL import Image
        Image.fromarray(arr).save(out_path)
        b = arr.mean()
        print(f'  screenshot {out_path} brightness={b:.1f}')
        return b

# Bring to foreground
user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(2.0)

os.makedirs('docs/qa/sprint46-evidence', exist_ok=True)

# Canvas physical bounds (from mss_navigate calibration):
# win(14,137) 975x290 → abs = (wx+14, wy+137)
canvas_ax = wx + 14
canvas_ay = wy + 137
canvas_w  = 975
canvas_h  = 290

# Step 1: Click reload (toolbar button at window-relative (484,42))
reload_px = wx + 484
reload_py = wy + 42
print(f'Step 1: Clicking reload at ({reload_px},{reload_py})')
cursor_click(reload_px, reload_py, 'reload')
time.sleep(20)  # Wait for intro animation

# Focus simulator
focus_x = canvas_ax + int(canvas_w * 0.300)
focus_y = canvas_ay + int(canvas_h * 0.400)
cursor_click(focus_x, focus_y, 'focus')
time.sleep(1.5)

b = screenshot('docs/qa/sprint46-evidence/step1-menu.png')
print(f'After reload: {b:.1f}')

# Step 2: Navigate to gallery via console
# First, click 星座图鉴 button on menu
# Menu button layout: 挑战关卡(0.668,0.610), 星座图鉴(0.668,0.748)
gallery_btn_x = canvas_ax + int(canvas_w * 0.668)
gallery_btn_y = canvas_ay + int(canvas_h * 0.748)
print(f'Step 2: Clicking gallery button at ({gallery_btn_x},{gallery_btn_y})')
cursor_click(gallery_btn_x, gallery_btn_y, 'gallery-btn')
time.sleep(2.0)

screenshot('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')
print('Done')
