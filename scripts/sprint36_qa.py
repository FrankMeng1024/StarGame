"""
sprint36_qa.py — Sprint 36 QA screenshots
Takes screenshots of: shop, game (girl character), victory screen.
"""
import sys, os, time, ctypes, ctypes.wintypes, subprocess
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try: ctypes.windll.user32.SetProcessDPIAware()
    except Exception: pass

try:
    import mss
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

OUT_DIR = "docs/qa/sprint36-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32

# ─── SendInput ──────────────────────────────────────────
def _sendinput_phys(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw)
    ny = int((phys_y - vy) * 65535 / vh)

    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),
                    ('mouseData',ctypes.c_ulong),('dwFlags',ctypes.c_ulong),
                    ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_ = ('_u',)
        _fields_ = [('type',ctypes.c_ulong),('_u',_U)]

    def send(flags):
        i = INP(type=0)
        i.mi.dx = nx; i.mi.dy = ny; i.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))

    send(0x0001 | 0x8000 | 0x4000)  # MOVE|ABSOLUTE|VIRTUALDESK
    time.sleep(0.08)
    send(0x0002 | 0x8000 | 0x4000)  # DOWN
    time.sleep(0.05)
    send(0x0004 | 0x8000 | 0x4000)  # UP

def click(px, py, label=""):
    print(f"  🖱  click @ ({px},{py}) {label}")
    _sendinput_phys(px, py)
    time.sleep(0.08)

# ─── hwnd discovery ────────────────────────────────────
def find_devtools_hwnd():
    candidates = []
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w, h = r.right-r.left, r.bottom-r.top
                if w > 400 and h > 400:
                    candidates.append((hwnd, w*h))
        except: pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]

def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top,
                   "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        brightness = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename} brightness={brightness:.1f}")
    return brightness, path

# ─── Main ──────────────────────────────────────────────
hwnd = find_devtools_hwnd()
if not hwnd:
    print("ERROR: wechatdevtools not found")
    sys.exit(1)

user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wl, wt = r.left, r.top
print(f"DevTools window: ({wl},{wt})")

# Get simulator canvas bounds
# Simulator is at window-relative (5, 88), canvas ~520x300 in portrait mode
# For mini game in landscape the canvas is ~520x300
# Use the fixed coords discovered: simulator physical starts at ~(2151, 179)
SIM_L = wl + 5    # simulator left
SIM_T = wt + 88   # simulator top
SIM_W = 520       # approximate canvas width
SIM_H = 300       # approximate canvas height

def sim_click(rx, ry, label=""):
    """Click at ratio (rx, ry) of simulator canvas."""
    px = SIM_L + int(SIM_W * rx)
    py = SIM_T + int(SIM_H * ry)
    click(px, py, label)
    time.sleep(0.5)

# Step 1: Reload to get latest code
reload_x = wl + 597
reload_y = wt + 37
print("Step 1: Reload game")
click(reload_x, reload_y, "reload ↺")
time.sleep(4)  # wait for reload

# Step 2: Screenshot menu
b, _ = capture(hwnd, "STORY-00320-01-menu.png")
print(f"  Menu brightness={b:.1f}")

# Step 3: Click 道具商店 button (ratio ~0.750, 0.495 based on mss_navigate.py docs)
# Menu buttons are on right side of screen
print("Step 3: Navigate to shop")
# Shop button at approximately right-center of landscape menu
# The menu has 3 stacked buttons on the right ~60-90% x
# Using the coords from mss_navigate.py: ratio(0.750, 0.495) → shop
sim_click(0.750, 0.495, "道具商店 button")
time.sleep(1.5)
b, _ = capture(hwnd, "STORY-00320-02-shop.png")
print(f"  Shop brightness={b:.1f}")

# Step 4: Back to menu
print("Step 4: Back to menu (← 返回)")
# Back button in shop is at top-left of canvas area
sim_click(0.05, 0.12, "back from shop")
time.sleep(1.5)
b, _ = capture(hwnd, "STORY-00320-03-menu-after-shop.png")
print(f"  Menu after shop brightness={b:.1f}")

# Step 5: Navigate to game via 挑战关卡
print("Step 5: Navigate to level select")
sim_click(0.750, 0.299, "挑战关卡 button")
time.sleep(1.5)
b, _ = capture(hwnd, "STORY-00321-01-levels.png")
print(f"  Levels brightness={b:.1f}")

# Step 6: Click Level 1
print("Step 6: Click Level 1 (猎户座)")
sim_click(0.114, 0.147, "Level 1")
time.sleep(2.0)
b, _ = capture(hwnd, "STORY-00321-02-game.png")
print(f"  Game brightness={b:.1f}")

# Step 7: Let game run and wait for victory/fail
# Game has a 90s timer, we need to either catch all stars or wait for fail
# Take screenshot at t+5s (game with girl character visible)
time.sleep(3)
b, _ = capture(hwnd, "STORY-00321-03-game-playing.png")
print(f"  Game playing brightness={b:.1f}")

# Wait for game to end (let timer run, or try clicking to fire net)
# Click center to fire net
print("Step 8: Fire net (click center)")
for i in range(5):
    sim_click(0.5, 0.5, f"fire net {i+1}")
    time.sleep(1.5)

b, _ = capture(hwnd, "STORY-00322-01-game-mid.png")
print(f"  Game mid brightness={b:.1f}")

# Wait for result (victory or fail)
print("Step 9: Wait for result screen (up to 60s)...")
for wait_i in range(20):
    time.sleep(3)
    b2, p2 = capture(hwnd, f"STORY-00322-02-result-wait{wait_i}.png")
    # Check if result screen visible by looking at the screenshot
    if wait_i == 0:
        print(f"  Waiting for result... {wait_i*3}s elapsed")

print("Done. Check docs/qa/sprint36-evidence/ for screenshots.")
