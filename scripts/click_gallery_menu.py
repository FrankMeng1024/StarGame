"""
click_gallery_menu.py — Click gallery button from menu, take screenshot
"""
import ctypes, ctypes.wintypes as wt, time, mss, numpy as np, subprocess, os, sys
from PIL import Image

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
        proc = subprocess.run(['tasklist','/FI',f'PID eq {pid.value}','/FO','CSV','/NH'],
            capture_output=True,text=True,timeout=2,encoding='utf-8',errors='ignore')
        if 'wechatdevtools' in proc.stdout.lower():
            tb = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, tb, 256)
            if tb.value: found.append((hwnd, tb.value))
    except: pass
    return True
user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found: sys.exit('no devtools')
hwnd = found[0][0]

r = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wx, wy = r.left, r.top

# Canvas physical: win(14,137) 975x290
canvas_ax = wx + 14
canvas_ay = wy + 137
canvas_w  = 975
canvas_h  = 290

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

def cursor_click(px, py, label=''):
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.2)
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
        print(f'  {os.path.basename(path)} b={b:.1f}')
        return b

os.makedirs('docs/qa/sprint46-evidence', exist_ok=True)

# Game is on main menu — click 星座图鉴 button (ratio 0.668, 0.748)
gallery_x = canvas_ax + int(canvas_w * 0.668)
gallery_y = canvas_ay + int(canvas_h * 0.748)
print(f'Clicking gallery at ({gallery_x},{gallery_y})')
cursor_click(gallery_x, gallery_y, 'gallery-btn')
time.sleep(2.5)

# Take screenshot
b = screenshot('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')

if b < 15:
    print('Screenshot too dark, retrying...')
    time.sleep(1)
    b = screenshot('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')

print(f'Done. brightness={b:.1f}')
