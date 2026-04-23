"""
capture_flow.py — 截取小游戏全流程截图
用法: python scripts/capture_flow.py --out docs/virtual-user/sprint32-mini-flow
"""
import sys, os, ctypes, ctypes.wintypes, time, argparse
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import mss, mss.tools
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--out', default='docs/virtual-user/sprint32-mini-flow')
args = parser.parse_args()
os.makedirs(args.out, exist_ok=True)

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [('left',ctypes.c_long),('top',ctypes.c_long),('right',ctypes.c_long),('bottom',ctypes.c_long)]

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),
                ('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
class INPUT(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [('mi',MOUSEINPUT)]
    _anonymous_ = ('_u',)
    _fields_ = [('type',ctypes.c_ulong),('_u',_U)]

def find_devtools():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, lp):
        if user32.IsWindowVisible(hwnd):
            buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, buf, 256)
            t = buf.value
            if 'Weixin Devtools' in t or 'WeChat' in t or '微信开发者工具' in t:
                found.append(hwnd)
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return found[0] if found else None

def click(x, y):
    SM_CX = user32.GetSystemMetrics(0)
    SM_CY = user32.GetSystemMetrics(1)
    nx = int(x * 65535 / SM_CX)
    ny = int(y * 65535 / SM_CY)
    for flags in [0x0001|0x8000, 0x0002|0x8000, 0x0004|0x8000]:
        inp = INPUT(type=0, mi=MOUSEINPUT(dx=nx, dy=ny, mouseData=0, dwFlags=flags, time=0, dwExtraInfo=None))
        user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.06)

def grab_full(hwnd, path):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sc:
        mon = {'left': r.left, 'top': r.top, 'width': r.right-r.left, 'height': r.bottom-r.top}
        img = sc.grab(mon)
        mss.tools.to_png(img.rgb, img.size, output=path)
    pil = Image.open(path).convert('RGB')
    br = float(np.array(pil).mean())
    print(f'  -> {path} ({pil.width}x{pil.height}) brightness={br:.1f}')
    return br

hwnd = find_devtools()
if not hwnd:
    print('ERROR: DevTools not found'); sys.exit(1)
print(f'DevTools hwnd={hwnd}')

user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

# ── Step 1: Menu (already on menu after reload) ──────────────────────────
print('[1/7] Menu screenshot')
grab_full(hwnd, f'{args.out}/flow-01-menu.png')

# ── Step 2: Level Select ─────────────────────────────────────────────────
print('[2/7] Click 挑战关卡 -> level select')
# From flow-01-menu.png analysis: button at x~770, y~270 in 1280x800 window
click(770, 270)
time.sleep(2)
grab_full(hwnd, f'{args.out}/flow-02-levels.png')

# ── Step 3: Game screen (click Level 1) ──────────────────────────────────
print('[3/7] Click Level 1 -> game')
# Level 1 card is at top-left of grid, approximately x~115, y~200
click(115, 200)
time.sleep(1.5)
# Click skip overlay if present (x~360, y~370)
click(360, 370)
time.sleep(2)
grab_full(hwnd, f'{args.out}/flow-03-game.png')

# ── Step 4: Victory screen (navigate via menu reload then play through) ───
# Actually: navigate to shop first (back to menu, click 道具商店)
print('[4/7] Back to menu (reload) then shop')
# Press reload: the ↺ button is at approximately x~920, y~70
click(920, 70)
time.sleep(3)
# Click 道具商店
click(770, 358)
time.sleep(2)
grab_full(hwnd, f'{args.out}/flow-04-shop.png')

# ── Step 5: Gallery ───────────────────────────────────────────────────────
print('[5/7] Back to menu then gallery')
click(920, 70)
time.sleep(3)
click(770, 314)  # 星座图鉴
time.sleep(2)
grab_full(hwnd, f'{args.out}/flow-05-gallery-list.png')

# ── Step 6: Gallery detail ────────────────────────────────────────────────
print('[6/7] Click first gallery card -> detail')
click(200, 250)
time.sleep(2)
grab_full(hwnd, f'{args.out}/flow-06-gallery-detail.png')

# ── Step 7: Back to menu ──────────────────────────────────────────────────
print('[7/7] Back button from gallery')
click(100, 180)  # back button typically top-left
time.sleep(1.5)
grab_full(hwnd, f'{args.out}/flow-07-back-to-menu.png')

print('Done.')
