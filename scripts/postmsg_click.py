"""
postmsg_click.py — Direct PostMessage to Chrome_RenderWidgetHostHWND
Bypasses SetForegroundWindow focus restriction
"""
import ctypes, ctypes.wintypes as wt, time, mss, numpy as np, subprocess, os, sys
from PIL import Image

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32

# Find DevTools hwnd
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
            if tb.value: found.append((hwnd,tb.value))
    except: pass
    return True
user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found: sys.exit('no devtools')
hwnd = found[0][0]
print(f'Main hwnd={hwnd}')

# Find Chrome_RenderWidgetHostHWND children
widgets = []
def child_cb(child, _):
    buf = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(child, buf, 256)
    if buf.value == 'Chrome_RenderWidgetHostHWND':
        r = wt.RECT()
        user32.GetWindowRect(child, ctypes.byref(r))
        w = r.right-r.left; h = r.bottom-r.top
        widgets.append((child, r.left, r.top, w, h))
    return True
WNDENUMPROC2 = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumChildWindows(hwnd, WNDENUMPROC2(child_cb), 0)
print(f'Found {len(widgets)} Chrome_RenderWidgetHostHWND windows:')
for w in widgets:
    print(f'  child={w[0]} pos=({w[1]},{w[2]}) size={w[3]}x{w[4]}')

if not widgets:
    sys.exit('no render widget found')

# Use the largest widget (game canvas)
widgets.sort(key=lambda x: -(x[3]*x[4]))
game_widget = widgets[0]
gw_hwnd, gw_x, gw_y, gw_w, gw_h = game_widget
print(f'Using game widget: hwnd={gw_hwnd} pos=({gw_x},{gw_y}) {gw_w}x{gw_h}')

WM_LBUTTONDOWN = 0x0201
WM_LBUTTONUP   = 0x0202
WM_MOUSEMOVE   = 0x0200
MK_LBUTTON     = 0x0001

def makelparam(x, y):
    return ctypes.c_int((y & 0xFFFF) << 16 | (x & 0xFFFF)).value

def post_click(abs_x, abs_y, label=''):
    """PostMessage click at absolute screen coords, converted to widget-local coords"""
    local_x = abs_x - gw_x
    local_y = abs_y - gw_y
    lp = makelparam(local_x, local_y)
    user32.PostMessageW(gw_hwnd, WM_MOUSEMOVE,   0,          lp)
    time.sleep(0.05)
    user32.PostMessageW(gw_hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lp)
    time.sleep(0.05)
    user32.PostMessageW(gw_hwnd, WM_LBUTTONUP,   0,          lp)
    time.sleep(0.1)
    if label: print(f'  PostMsg click {label} @ local({local_x},{local_y})')

def screenshot(path):
    r = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {'left':r.left,'top':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
        img = sct.grab(monitor)
        arr = np.array(img)[:,:,:3]
        os.makedirs(os.path.dirname(path), exist_ok=True)
        Image.fromarray(arr).save(path)
        b = arr.mean()
        print(f'  screenshot {path} brightness={b:.1f}')
        return b

# Game canvas is at physical: gw_x, gw_y (absolute screen)
# The game canvas logical coords based on mss_navigate calibration:
# Canvas: win(14,137) 975x290 within the full DevTools window
# But the game widget hwnd IS the canvas widget at gw_x,gw_y

# Step 1: Click "选关" button on fail screen
# Fail screen has two buttons: 重试 (left ~30%) and 选关 (right ~62%)
# These are in the fail overlay, centered in game canvas
# Game canvas is 975x290 physical pixels
# The fail overlay is in the center: roughly at x=0.62*975=605, y=0.87*290=252 (from game ratio)
canvas_ax = gw_x  # absolute x of game canvas start
canvas_ay = gw_y  # absolute y of game canvas start

# "选关" button ratio (0.440, 0.877) from canvas
xuanguan_x = canvas_ax + int(gw_w * 0.440)
xuanguan_y = canvas_ay + int(gw_h * 0.877)
print(f'\nStep 1: Click xuanguan (back to levels) at abs({xuanguan_x},{xuanguan_y})')
post_click(xuanguan_x, xuanguan_y, 'xuanguan')
time.sleep(1.5)
screenshot('docs/qa/sprint46-evidence/p1-after-xuanguan.png')

# Step 2: Click "返回" or navigate to menu
# After clicking 选关, we should be on the level select screen
# On level select, click "返回" back button
# Back button is at top-left of level select: approx (0.03, 0.1) of canvas
back_x = canvas_ax + int(gw_w * 0.03)
back_y = canvas_ay + int(gw_h * 0.1)
post_click(back_x, back_y, 'back-to-menu')
time.sleep(1.5)
screenshot('docs/qa/sprint46-evidence/p2-after-back.png')

# Step 3: Click "星座图鉴" button on menu
# Menu button: 星座图鉴 at ratio(0.668, 0.748)
gallery_x = canvas_ax + int(gw_w * 0.668)
gallery_y = canvas_ay + int(gw_h * 0.748)
post_click(gallery_x, gallery_y, 'gallery-menu-btn')
time.sleep(2.0)
b = screenshot('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')

print(f'\nFinal gallery brightness={b:.1f}')
print('Done')
