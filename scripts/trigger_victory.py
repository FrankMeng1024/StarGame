"""
Click top-left of game canvas to trigger instant victory, then capture result.
"""
import sys, os, time, subprocess
import ctypes, ctypes.wintypes
import mss, numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32
SCALE = 1.0
OUT_DIR = r'C:\ClaudeCodeProjects\StarGame\docs\virtual-user\sprint29-mini-flow'

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

def find_canvas_bounds(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": win_w, "height": win_h}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3][..., ::-1]
    DARK_THRESH = 35
    GRAY_THRESH = 55
    scan_x = min(150, win_w // 9)
    col = arr[:, scan_x, :].mean(axis=1)
    cy_top = None
    for y in range(90, win_h):
        if col[y] < DARK_THRESH:
            cy_top = y; break
    if cy_top is None: return (13, 137, 975, 450)
    cy_bottom = cy_top + 100
    for y in range(cy_top + 100, win_h):
        if col[y] > GRAY_THRESH:
            cy_bottom = y - 1; break
    ch = cy_bottom - cy_top
    if ch < 100: return (13, 137, 975, 450)
    cx_left = 13
    cx_right = int(win_w * 0.772)
    cw = cx_right - cx_left
    if cw < 200: return (13, 137, 975, 450)
    return (cx_left, cy_top, cw, cy_bottom - cy_top)

def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.0)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        b = float(arr.mean())
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f'  {filename} b={b:.1f} size={pil.size}')
    return b, path

def canvas_click(hwnd, canvas, rx, ry, label=''):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    phys_x = r.left + canvas[0] + int(canvas[2] * rx)
    phys_y = r.top + canvas[1] + int(canvas[3] * ry)
    lx = int(phys_x / SCALE)
    ly = int(phys_y / SCALE)
    user32.SetCursorPos(lx, ly)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    if label:
        print(f'  Click {label} @ ratio({rx:.3f},{ry:.3f}) log({lx},{ly})')

hwnd = find_devtools_hwnd()
r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f'hwnd={hwnd} window=({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(0.5)

canvas = find_canvas_bounds(hwnd)
if canvas[2] >= 1100: canvas = (13, 137, 975, 450)
print(f'Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')

# Capture current state first
capture(hwnd, 'flow-55-before-victory.png')

# Click top-left corner of game canvas (rx≈0.001, ry≈0.001 → game coords tx<20, ty<20)
# The game canvas top-left = window_left + cx, window_top + cy
# Game coords tx = (click_x - canvas_origin_x) in canvas pixels -> need tx < 20
# The canvas maps from screen pixels to game coords via DPR/scaling in WeChat
# Game internal: 690x390, canvas display: (cw, ch)
# A click at canvas pixel (10, 10) -> game coord tx = 10 * 690/cw
# For cw=975: tx = 10 * 690/975 = 7.1 < 20 ✓
# Use rx=0.005, ry=0.010 (5 pixels from left, 10 from top in canvas display)
canvas_click(hwnd, canvas, 0.005, 0.010, 'TOP-LEFT cheat trigger')
time.sleep(0.3)
capture(hwnd, 'flow-56-after-cheat-click.png')

# Wait for celebrate/linedraw animation + result overlay to appear
time.sleep(4.0)
capture(hwnd, 'flow-57-victory-screen.png')

# Also take one more after another second
time.sleep(2.0)
capture(hwnd, 'flow-58-victory-screen2.png')

print('Done - check flow-57 and flow-58 for victory screen')
