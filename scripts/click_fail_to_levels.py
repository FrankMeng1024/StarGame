"""
click_fail_to_levels.py — Click "选关" button on fail screen to navigate to level select.
Then capture: level_select → click ← 返回 → menu → gallery → gallery detail → menu → shop
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

found = []
def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV', shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
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

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Canvas: abs(14,137) size(975,290) for 1920x1200 DevTools window at (0,0)
r_win = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win))
abs_left = r_win.left + 14
abs_top = r_win.top + 137
cw, ch = 975, 290
canvas = (abs_left, abs_top, cw, ch)

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

def capture(name, label=""):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    with mss.mss() as sct:
        monitor = {"left": r_win.left, "top": r_win.top, "width": r_win.right-r_win.left, "height": r_win.bottom-r_win.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        brightness = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, name)
        pil.save(path)
    print(f"  📸 {name} brightness={brightness:.1f}" + (f" ({label})" if label else ""), flush=True)
    return brightness, path

def capture_canvas(name, label=""):
    """Capture canvas region only for clearer view"""
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
    print(f"  📸 {name} brightness={brightness:.1f}" + (f" ({label})" if label else ""), flush=True)
    return brightness, path

print("=== Fail screen → navigate ===", flush=True)

# Current state: fail screen with "重试" and "选关" buttons
# Game coords (800x500):
#   cardX=230, cardY=70, cardW=340, cardH=360
#   btnAreaY=378, bY=386, btnH=36
#   重试: center at game(319, 404) → ratio(0.399, 0.808)
#   选关: center at game(481, 404) → ratio(0.601, 0.808)

print("\n[0] Click '选关' on fail screen → levels", flush=True)
# Try multiple click attempts - touchstart should fire on LEFTDOWN
for attempt in range(3):
    phys_click(0.601, 0.808, f"选关 (attempt {attempt+1})")
    time.sleep(0.5)

time.sleep(2.0)
brightness, _ = capture_canvas("nav-00-after-levels-click.png", "after 选关 click")

# Check if we navigated (if brightness changed or screen changed)
print(f"\n[1] Level Select screen", flush=True)
capture_canvas("nav-01-level-select.png", "level select")

# Try clicking back button to get to menu
# levels.js back button: at game(SAFE_LEFT+12+44, SAFE_TOP+10+16) = approx (56, 26) → ratio(0.070, 0.052)
print("\n[2] Click ← 返回 (levels → menu)", flush=True)
phys_click(0.070, 0.052, "← 返回 from levels")
time.sleep(2.5)
capture_canvas("nav-02-menu-from-levels.png", "menu from levels")

# From menu: click 星座图鉴
print("\n[3] Click 星座图鉴 (gallery)", flush=True)
phys_click(0.668, 0.748, "星座图鉴")
time.sleep(3.0)
capture_canvas("nav-03-gallery-list.png", "gallery list")

# Click first node (top-left slot 0)
# Node 0: cx=193.6, cy=129.6 in 800x500 → ratio(0.242, 0.259)
print("\n[4] Click gallery node slot 0", flush=True)
phys_click(0.242, 0.259, "gallery node-0")
time.sleep(2.5)
capture_canvas("nav-04-gallery-detail.png", "gallery detail")

# Click ← 返回 from gallery
print("\n[5] Click ← 返回 (gallery → menu)", flush=True)
phys_click(0.065, 0.052, "← 返回 from gallery")
time.sleep(2.5)
capture_canvas("nav-05-menu-after-gallery.png", "menu after gallery")

# Click 道具商店
print("\n[6] Click 道具商店 (shop)", flush=True)
phys_click(0.668, 0.886, "道具商店")
time.sleep(3.0)
capture_canvas("nav-06-shop.png", "shop")

# Click ← 返回 from shop (goes to levels)
print("\n[7] Click ← 返回 (shop → levels)", flush=True)
phys_click(0.070, 0.052, "← 返回 from shop")
time.sleep(2.0)
capture_canvas("nav-07-levels-from-shop.png", "levels from shop")

print("\n=== Done ===", flush=True)
print(f"Screenshots in: {OUT_DIR}", flush=True)
