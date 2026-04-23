"""
click_gallery2.py — Click gallery button at corrected position and screenshot
"""
import ctypes, ctypes.wintypes as wt, time, mss, numpy as np, subprocess, os, sys
from PIL import Image

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
found = []
def cb(hwnd, _):
    if not user32.IsWindowVisible(hwnd): return True
    pid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        proc = subprocess.run(['tasklist','/FI',f'PID eq {pid.value}','/FO','CSV','/NH'],
            capture_output=True,text=True,timeout=2,encoding='utf-8',errors='ignore')
        if 'wechatdevtools' in proc.stdout.lower():
            tb = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, tb, 256)
            if tb.value: found.append((hwnd, tb.value))
    except: pass
    return True
user32.EnumWindows(WNDENUMPROC(cb), 0)
hwnd = found[0][0]

r = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wx, wy = r.left, r.top

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

def cursor_click(px, py, label=''):
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.3)
    if label: print(f'  click {label} @ ({px},{py})')

def screenshot(path):
    r2 = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r2))
    with mss.mss() as sct:
        monitor = {'left':r2.left,'top':r2.top,'width':r2.right-r2.left,'height':r2.bottom-r2.top}
        img = sct.grab(monitor)
        arr = np.array(img)[:,:,:3]
        os.makedirs(os.path.dirname(path), exist_ok=True)
        Image.fromarray(arr).save(path)
        b = arr.mean()
        print(f'  saved {os.path.basename(path)} b={b:.1f}')
        return b

os.makedirs('docs/qa/sprint46-evidence', exist_ok=True)

# Canvas physical at abs(14+wx, 137+wy) = (14,137) since wx=wy=0
# 星座图鉴 button is at approx center x=501, y=322 (physical absolute)
# but the script ran as background so focus might differ — use SetCursorPos directly

# Take current screenshot to verify we're on menu
b0 = screenshot('docs/qa/sprint46-evidence/pre-click-menu.png')
print(f'Pre-click brightness={b0:.1f}')

# Click 星座图鉴 (center of button)
# From screenshot analysis: button center at physical (501, 322) (or ratio 0.50, 0.634 of canvas)
canvas_ax = wx + 14
canvas_ay = wy + 137
canvas_w  = 975
canvas_h  = 290

# Try three Y positions to hit the button
for ratio_y in [0.634, 0.62, 0.65]:
    gx = canvas_ax + int(canvas_w * 0.50)
    gy = canvas_ay + int(canvas_h * ratio_y)
    print(f'Trying ratio_y={ratio_y} -> ({gx},{gy})')
    cursor_click(gx, gy, f'gallery y={ratio_y}')
    time.sleep(0.5)

time.sleep(2.0)
b = screenshot('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')
print(f'Final brightness={b:.1f}')
print('Done')
