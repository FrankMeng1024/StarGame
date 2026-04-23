"""
quick_nav.py — Navigate from fail screen → reload → menu → gallery → shop
Uses correct button ratios derived from console log evidence.
Canvas: win(14, 137) 975x290 for 1920x1200 window.

Correct button ratios (from console: [menu] btn=gallery x=533 y=176 w=248 h=35):
  gallery center: game(657, 193.5) → ratio(0.821, 0.387)
  shop center:    game(657, 243.5) → ratio(0.821, 0.488)
  levels center:  game(657, 143)   → ratio(0.821, 0.286)

Reload wait: 35s (was 20s — insufficient for compile + intro)
"""
import ctypes, ctypes.wintypes, time, sys, subprocess, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32

OUT_DIR = "docs/qa/sprint56-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

# Find wechatdevtools hwnd
found = []
def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
            shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            if w>400 and h>400: found.append((hwnd, w*h))
    except: pass
    return True
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WNDENUMPROC(cb), 0)
found.sort(key=lambda x: -x[1])
hwnd = found[0][0]
print(f"hwnd={hwnd}", flush=True)

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r_win = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win))
print(f"Window: ({r_win.left},{r_win.top}) {r_win.right-r_win.left}x{r_win.bottom-r_win.top}", flush=True)

# Canvas fallback: win(14,137) 975x290
abs_left = r_win.left + 14
abs_top  = r_win.top  + 137
cw, ch   = 975, 290
canvas   = (abs_left, abs_top, cw, ch)
print(f"Canvas: abs({abs_left},{abs_top}) {cw}x{ch}", flush=True)

def phys_click(rx, ry, label=""):
    px = canvas[0] + int(canvas[2] * rx)
    py = canvas[1] + int(canvas[3] * ry)
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP
    time.sleep(0.15)
    if label:
        print(f"  click {label} @ ratio({rx:.3f},{ry:.3f}) abs({px},{py})", flush=True)

def capture_canvas(name, label=""):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    with mss.mss() as sct:
        region = {"left": abs_left, "top": abs_top, "width": cw, "height": ch}
        img = sct.grab(region)
        arr = np.array(img)[:,:,:3][...,::-1]
        brightness = float(arr.mean())
        pil = Image.fromarray(arr)
        path = os.path.join(OUT_DIR, name)
        pil.save(path)
    print(f"  screenshot {name} brightness={brightness:.1f}" + (f" ({label})" if label else ""), flush=True)
    return brightness, path

def sendinput_click(px, py, label=""):
    """Use SendInput for toolbar buttons (outside canvas)"""
    vx_origin = user32.GetSystemMetrics(76)
    vy_origin = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    norm_x = int((px - vx_origin) * 65535 / vw)
    norm_y = int((py - vy_origin) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_u',)
        _fields_ = [('type', ctypes.c_ulong), ('_u', _U)]

    def make(flags):
        i = INPUT(type=0)
        i.mi.dx, i.mi.dy, i.mi.dwFlags = norm_x, norm_y, flags
        return i

    F = 0x8000 | 0x4000  # ABSOLUTE | VIRTUALDESK
    ctypes.windll.user32.SendInput(1, ctypes.byref(make(0x0001|F)), ctypes.sizeof(INPUT))
    time.sleep(0.1)
    ctypes.windll.user32.SendInput(1, ctypes.byref(make(0x0002|F)), ctypes.sizeof(INPUT))
    time.sleep(0.1)
    ctypes.windll.user32.SendInput(1, ctypes.byref(make(0x0004|F)), ctypes.sizeof(INPUT))
    time.sleep(0.2)
    if label:
        print(f"  sendinput {label} @ abs({px},{py})", flush=True)

print("\n=== Step 0: Reload game ===", flush=True)
r_win = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win))
reload_px = r_win.left + 484
reload_py = r_win.top + 42
sendinput_click(reload_px, reload_py, "reload button")
print("  Waiting 35s for compile + intro animation...", flush=True)
time.sleep(35)

# Focus simulator to close debug panel
phys_click(0.300, 0.400, "focus-sim")
time.sleep(1.5)

print("\n=== Step 1: Menu ===", flush=True)
capture_canvas("quick-01-menu.png", "menu")

print("\n=== Step 2: Click 挑战关卡 (ratio 0.821, 0.286) ===", flush=True)
phys_click(0.821, 0.286, "挑战关卡")
time.sleep(3.0)
capture_canvas("quick-02-levels.png", "levels")

print("\n=== Step 3: Click Level 1 (ratio 0.094, 0.200) ===", flush=True)
phys_click(0.094, 0.200, "Level 1")
time.sleep(2.0)
phys_click(0.500, 0.500, "skip overlay")
time.sleep(1.5)
capture_canvas("quick-03-game.png", "game")

print("\n=== Step 4: Wait for fail (120s timer) + 10s buffer ===", flush=True)
time.sleep(130)
capture_canvas("quick-04-fail.png", "fail screen")

print("\n=== Step 5: Reload → menu ===", flush=True)
r_win = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win))
reload_px = r_win.left + 484
reload_py = r_win.top + 42
sendinput_click(reload_px, reload_py, "reload 2")
print("  Waiting 35s...", flush=True)
time.sleep(35)
phys_click(0.300, 0.400, "focus-sim-2")
time.sleep(1.5)

print("\n=== Step 6: Click 星座图鉴 (ratio 0.821, 0.387) ===", flush=True)
phys_click(0.821, 0.387, "星座图鉴")
time.sleep(3.0)
capture_canvas("quick-05-gallery-list.png", "gallery list")

print("\n=== Step 7: Click gallery node 0 (ratio 0.242, 0.259) ===", flush=True)
phys_click(0.242, 0.259, "gallery node 0")
time.sleep(2.5)
capture_canvas("quick-06-gallery-detail.png", "gallery detail")

print("\n=== Step 8: Back to menu ===", flush=True)
phys_click(0.065, 0.052, "back from gallery")
time.sleep(2.5)

print("\n=== Step 9: Click 道具商店 (ratio 0.821, 0.488) ===", flush=True)
phys_click(0.821, 0.488, "道具商店")
time.sleep(3.0)
capture_canvas("quick-07-shop.png", "shop")

print("\n=== Done ===", flush=True)
print(f"All screenshots in: {OUT_DIR}", flush=True)
