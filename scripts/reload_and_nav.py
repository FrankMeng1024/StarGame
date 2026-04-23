"""
reload_and_nav.py — Correct reload button position + longer wait + proper navigation
Based on toolbar-zoom.png analysis: reload ↺ is at abs(668, 51) in 1920x1200 window.

Canvas fallback: win(14, 137) 975x290 for 1920x1200 window (right panel open).
"""
import ctypes, ctypes.wintypes, time, sys, subprocess, os, io
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
_log = io.open("reload_nav_log.txt", "w", encoding="utf-8")
def log(msg):
    _log.write(msg + "\n"); _log.flush()
    print(msg, flush=True)

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32

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
log(f"hwnd={hwnd}")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r_win = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win))
log(f"Window: ({r_win.left},{r_win.top}) {r_win.right-r_win.left}x{r_win.bottom-r_win.top}")

OUT_DIR = "docs/qa/sprint56-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

# Canvas: abs(14, 137) 975x290 for 1920x1200 window
abs_left = r_win.left + 14
abs_top  = r_win.top  + 137
cw, ch   = 975, 290
canvas   = (abs_left, abs_top, cw, ch)
log(f"Canvas: abs({abs_left},{abs_top}) {cw}x{ch}")

def sendinput_abs(px, py, label=""):
    """SendInput with ABSOLUTE+VIRTUALDESK coords."""
    vx = user32.GetSystemMetrics(76); vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78); vh = user32.GetSystemMetrics(79)
    nx = int((px - vx) * 65535 / vw)
    ny = int((py - vy) * 65535 / vh)

    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),
                    ('mouseData',ctypes.c_ulong),('dwFlags',ctypes.c_ulong),
                    ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class IN(ctypes.Structure):
        class _U(ctypes.Union): _fields_ = [('mi',MI)]
        _anonymous_ = ('_u',); _fields_ = [('type',ctypes.c_ulong),('_u',_U)]

    F = 0x8000|0x4000  # ABSOLUTE|VIRTUALDESK
    def mk(fl):
        i = IN(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=fl; return i

    ctypes.windll.user32.SendInput(1, ctypes.byref(mk(0x0001|F)), ctypes.sizeof(IN))
    time.sleep(0.05)
    ctypes.windll.user32.SendInput(1, ctypes.byref(mk(0x0002|F)), ctypes.sizeof(IN))
    time.sleep(0.05)
    ctypes.windll.user32.SendInput(1, ctypes.byref(mk(0x0004|F)), ctypes.sizeof(IN))
    time.sleep(0.15)
    if label: log(f"  sendinput {label} @ abs({px},{py})")

def canvas_click(rx, ry, label=""):
    """Click at canvas-relative ratio using SetCursorPos+mouse_event."""
    px = canvas[0] + int(canvas[2] * rx)
    py = canvas[1] + int(canvas[3] * ry)
    user32.SetCursorPos(px, py); time.sleep(0.05)
    user32.mouse_event(0x0002, 0,0,0,0); time.sleep(0.05)
    user32.mouse_event(0x0004, 0,0,0,0); time.sleep(0.15)
    if label: log(f"  canvas_click {label} @ ratio({rx:.3f},{ry:.3f}) abs({px},{py})")

def capture_canvas(name, label=""):
    user32.ShowWindow(hwnd, 5); time.sleep(0.8)
    with mss.mss() as sct:
        region = {"left": abs_left, "top": abs_top, "width": cw, "height": ch}
        img = sct.grab(region)
        arr = np.array(img)[:,:,:3][...,::-1]
        brightness = float(arr.mean())
        Image.fromarray(arr).save(os.path.join(OUT_DIR, name))
    log(f"  screenshot {name} brightness={brightness:.1f} ({label})")
    return brightness

# ── Step 0: Find and click reload button ──────────────────────────
# From toolbar-zoom.png (2x zoom of top 80 rows):
# "Ordinary Compilation ↺" — the ↺ icon is at roughly x=668, y=51 in physical coords
# (based on the zoomed image showing it near the middle-left of row 2)
log("\n=== Step 0: Reload ===")
# First scan for the ↺ button by checking multiple x positions along y=51
# We'll try x=668 (from visual inspection)
reload_x = r_win.left + 668
reload_y = r_win.top + 51
sendinput_abs(reload_x, reload_y, "reload ↺ at (668,51)")
log("  Waiting 50s for compile + intro animation...")
time.sleep(50)

# Take screenshot to check state
b = capture_canvas("reload-01-after50s.png", "after 50s reload wait")
log(f"  Brightness after 50s: {b:.1f}")

# If still fail screen (high brightness ~97), try clicking intro to skip
log("\n=== Step 1: Click intro to proceed to menu ===")
# Intro animation is fullscreen canvas — click anywhere to skip
canvas_click(0.500, 0.500, "skip intro click 1")
time.sleep(1.0)
canvas_click(0.500, 0.500, "skip intro click 2")
time.sleep(2.0)
b = capture_canvas("reload-02-after-intro-click.png", "after intro click")
log(f"  Brightness: {b:.1f}")

# Step 2: click menu area (if on menu, brightness should drop to ~25-30)
log("\n=== Step 2: Click 挑战关卡 ===")
# True button ratios from console: gallery x=533 y=176, shop x=533 y=226
# levels estimated: x=533 y=126, all at w=800 game space
# ratio: (533+248/2)/800 = 657/800 = 0.821; y: (126+35/2)/500 = 143.5/500 = 0.287
canvas_click(0.821, 0.287, "挑战关卡")
time.sleep(3.0)
b = capture_canvas("reload-03-levels.png", "level select")
log(f"  Level select brightness: {b:.1f}")

# Step 3: click Level 1
log("\n=== Step 3: Level 1 ===")
canvas_click(0.094, 0.200, "Level 1")
time.sleep(2.0)
canvas_click(0.500, 0.500, "skip overlay")
time.sleep(1.5)
b = capture_canvas("reload-04-game.png", "game")
log(f"  Game brightness: {b:.1f}")

# Step 4: reload again for menu navigation
log("\n=== Step 4: Reload again for menu→gallery→shop ===")
r_win2 = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r_win2))
sendinput_abs(r_win2.left + 668, r_win2.top + 51, "reload 2")
log("  Waiting 50s...")
time.sleep(50)
canvas_click(0.500, 0.500, "skip intro 1")
time.sleep(1.0)
canvas_click(0.500, 0.500, "skip intro 2")
time.sleep(2.0)
b = capture_canvas("reload-05-menu2.png", "menu after 2nd reload")
log(f"  Menu brightness: {b:.1f}")

# Step 5: gallery
log("\n=== Step 5: Gallery ===")
canvas_click(0.821, 0.387, "星座图鉴")
time.sleep(3.0)
b = capture_canvas("reload-06-gallery-list.png", "gallery list")
log(f"  Gallery brightness: {b:.1f}")

canvas_click(0.242, 0.259, "gallery node 0")
time.sleep(2.5)
b = capture_canvas("reload-07-gallery-detail.png", "gallery detail")
log(f"  Gallery detail brightness: {b:.1f}")

canvas_click(0.065, 0.052, "back from gallery")
time.sleep(2.5)

# Step 6: shop
log("\n=== Step 6: Shop ===")
canvas_click(0.821, 0.488, "道具商店")
time.sleep(3.0)
b = capture_canvas("reload-08-shop.png", "shop")
log(f"  Shop brightness: {b:.1f}")

log("\n=== Done ===")
_log.close()
