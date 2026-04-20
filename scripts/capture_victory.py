"""
capture_victory.py — Navigate to Level 1, tap all 7 stars, capture victory screen
Strategy: tap all 7 Orion star positions in rapid sequence then wait for victory card.
"""
import sys, os, time, ctypes, ctypes.wintypes
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

try:
    import mss, mss.tools
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing: {e}")
    sys.exit(1)

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# ── Find DevTools window ──────────────────────────────────────────────────────
def find_devtools_hwnd():
    result = []
    EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def _cb(hwnd, _):
        buf = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buf, 256)
        title = buf.value
        if 'wechatdevtools' in title.lower() or '微信开发者工具' in title.lower() or 'DevTools' in title:
            cls = ctypes.create_unicode_buffer(64)
            user32.GetClassNameW(hwnd, cls, 64)
            rect = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            w = rect.right - rect.left
            h = rect.bottom - rect.top
            if w > 800 and h > 600:
                result.append((hwnd, title, rect.left, rect.top, w, h))
        return True
    user32.EnumWindows(EnumWindowsProc(_cb), 0)
    return result

wins = find_devtools_hwnd()
if not wins:
    # Try by process name
    import subprocess
    r = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq wechatdevtools.exe', '/FO', 'CSV'], capture_output=True, text=True)
    print("DevTools processes:", r.stdout[:200])
    # Try finding child windows
    EnumWindowsProc2 = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    all_wins = []
    def _cb2(hwnd, _):
        cls = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(hwnd, cls, 64)
        rect = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top
        if w > 800 and h > 600 and rect.left > 1000:  # extended monitor
            buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, buf, 256)
            all_wins.append((hwnd, buf.value, cls.value, rect.left, rect.top, w, h))
        return True
    user32.EnumWindows(EnumWindowsProc2(_cb2), 0)
    # Show windows on extended monitor
    for hw, t, c, x, y, w, h in all_wins[:10]:
        print(f"  hwnd={hw} title={t[:40]} class={c} pos=({x},{y}) size={w}x{h}")
    sys.exit(1)

hwnd, title, wl, wt, ww, wh = wins[0]
print(f"DevTools: hwnd={hwnd} title={title[:50]} at ({wl},{wt}) {ww}x{wh}")

# ── Focus DevTools ────────────────────────────────────────────────────────────
SW_RESTORE = 9
cur_thread = kernel32.GetCurrentThreadId()
target_thread = user32.GetWindowThreadProcessId(hwnd, None)
user32.AttachThreadInput(cur_thread, target_thread, True)
user32.ShowWindow(hwnd, SW_RESTORE)
user32.BringWindowToTop(hwnd)
user32.SetForegroundWindow(hwnd)
time.sleep(0.8)
user32.AttachThreadInput(cur_thread, target_thread, False)

# ── Canvas region ─────────────────────────────────────────────────────────────
# Simulator is in left portion of DevTools window
# Canvas: wl+14, wt+86, width=670, height=440
canvas_x = wl + 14
canvas_y = wt + 86
canvas_w = 670
canvas_h = 440

def canvas_to_screen(cx, cy):
    return canvas_x + cx, canvas_y + cy

# ── Orion star positions (normalized x,y) ──────────────────────────────────────
# Game: skyX0=16, skyX1=W-16 (W=670), skyY0=SAFE_TOP+60=120, skyY1=H*0.62=273
# SAFE_TOP for WeChat mini-game horizontal = ~60px
sky_x0, sky_x1 = 16, 670 - 16  # = 16, 654
sky_y0, sky_y1 = 120, int(440 * 0.62)  # = 120, 272

orion_stars = [
    (0.28, 0.18),  # 参宿四 Betelgeuse
    (0.68, 0.20),  # 参宿五 Bellatrix
    (0.38, 0.50),  # 参宿一 Alnitak
    (0.50, 0.52),  # 参宿二 Alnilam
    (0.62, 0.50),  # 参宿三 Mintaka
    (0.32, 0.82),  # 参宿增四 Saiph
    (0.70, 0.80),  # 参宿七 Rigel
]

star_positions = []
for sx, sy in orion_stars:
    cx = sky_x0 + sx * (sky_x1 - sky_x0)
    cy = sky_y0 + sy * (sky_y1 - sky_y0)
    px, py = canvas_to_screen(cx, cy)
    star_positions.append((int(px), int(py)))
    print(f"  star ({sx:.2f},{sy:.2f}) → canvas ({int(cx)},{int(cy)}) → screen ({int(px)},{int(py)})")

# ── SendInput click ───────────────────────────────────────────────────────────
INPUT_MOUSE = 0
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_ABSOLUTE = 0x8000
MOUSEEVENTF_VIRTUALDESK = 0x4000

screen_w = user32.GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
screen_h = user32.GetSystemMetrics(79)  # SM_CYVIRTUALSCREEN
virt_x   = user32.GetSystemMetrics(76)  # SM_XVIRTUALSCREEN
virt_y   = user32.GetSystemMetrics(77)  # SM_YVIRTUALSCREEN
print(f"VirtualScreen: ({virt_x},{virt_y}) {screen_w}x{screen_h}")

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [("dx", ctypes.c_long), ("dy", ctypes.c_long),
                ("mouseData", ctypes.wintypes.DWORD), ("dwFlags", ctypes.wintypes.DWORD),
                ("time", ctypes.wintypes.DWORD), ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong))]

class INPUT(ctypes.Structure):
    class _I(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT)]
    _anonymous_ = ("_i",)
    _fields_ = [("type", ctypes.wintypes.DWORD), ("_i", _I)]

def click(x, y):
    # Convert to normalized 0..65535 coords relative to virtual screen
    nx = int((x - virt_x) * 65535 / screen_w)
    ny = int((y - virt_y) * 65535 / screen_h)
    flags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    inp_move = INPUT(type=INPUT_MOUSE)
    inp_move.mi.dx = nx; inp_move.mi.dy = ny; inp_move.mi.dwFlags = flags
    inp_down = INPUT(type=INPUT_MOUSE)
    inp_down.mi.dx = nx; inp_down.mi.dy = ny; inp_down.mi.dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    inp_up = INPUT(type=INPUT_MOUSE)
    inp_up.mi.dx = nx; inp_up.mi.dy = ny; inp_up.mi.dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    arr = (INPUT * 3)(inp_move, inp_down, inp_up)
    user32.SendInput(3, arr, ctypes.sizeof(INPUT))

# ── Navigate to Level 1 ───────────────────────────────────────────────────────
# Current state: may be anywhere. Navigate: menu → level select → level 1
# Use the navigation coords from mss_navigate.py
# Menu "挑战关卡" button: ratio(0.750, 0.299) of canvas
btn_challenge_x = int(canvas_x + 0.750 * canvas_w)
btn_challenge_y = int(canvas_y + 0.299 * canvas_h)

# Level select Level 1 card: ratio(0.114, 0.147) of canvas
btn_level1_x = int(canvas_x + 0.114 * canvas_w)
btn_level1_y = int(canvas_y + 0.147 * canvas_h)

print(f"\nNavigating to Level 1...")
print(f"  Menu 挑战关卡: ({btn_challenge_x}, {btn_challenge_y})")
print(f"  Level 1 card: ({btn_level1_x}, {btn_level1_y})")

# Re-focus DevTools before clicking
user32.AttachThreadInput(cur_thread, target_thread, True)
user32.SetForegroundWindow(hwnd)
time.sleep(0.5)
user32.AttachThreadInput(cur_thread, target_thread, False)

# Step 1: Try to get to menu first. Click a safe area that might dismiss overlays
# Click in center of game area (safe location)
cx_center = canvas_x + canvas_w // 2
cy_center = canvas_y + canvas_h // 2

# Click center to dismiss any overlay (pause menu, result card, etc.)
click(cx_center, cy_center)
time.sleep(0.5)

# Now try clicking 挑战关卡 (works if we're on menu)
click(btn_challenge_x, btn_challenge_y)
time.sleep(1.0)

# Click Level 1
click(btn_level1_x, btn_level1_y)
time.sleep(2.0)  # Wait for level to load

# Dismiss any overlay (pre-level tutorial or lore)
# Skip button area: ratio(0.360, 0.490)
skip_x = int(canvas_x + 0.360 * canvas_w)
skip_y = int(canvas_y + 0.490 * canvas_h)
click(skip_x, skip_y)
time.sleep(0.5)

print("Now in game. Taking pre-game screenshot...")

# ── Capture helper ────────────────────────────────────────────────────────────
OUT_DIR = "docs/qa/sprint33-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

def capture(name):
    region = {'left': canvas_x, 'top': canvas_y, 'width': canvas_w, 'height': canvas_h}
    with mss.mss() as sct:
        img = sct.grab(region)
    arr = np.array(img)
    brightness = arr[:, :, :3].mean()
    img_rgb = arr[:, :, [2, 1, 0]]  # BGR→RGB
    pil = Image.fromarray(img_rgb.astype('uint8'))
    path = os.path.join(OUT_DIR, name)
    pil.save(path)
    print(f"  {name} b={brightness:.1f}")
    return brightness

# Take a pre-game state screenshot to verify we're in game
capture('s33v3-pre-game.png')

# ── Now tap all 7 stars ───────────────────────────────────────────────────────
# Wait a moment for game to fully load
time.sleep(1.0)

# Re-focus
user32.AttachThreadInput(cur_thread, target_thread, True)
user32.SetForegroundWindow(hwnd)
time.sleep(0.3)
user32.AttachThreadInput(cur_thread, target_thread, False)

print("\nTapping all 7 Orion stars...")
for i, (px, py) in enumerate(star_positions):
    print(f"  Tapping star {i+1}/7 at ({px}, {py})")
    click(px, py)
    time.sleep(0.15)  # Small delay between taps

# Wait for victory animation / result card to appear
print("Waiting for victory result card...")
time.sleep(2.5)

# Capture victory screen
b = capture('s33v3-victory.png')
if b < 10:
    print("WARNING: Screenshot may be black, retrying...")
    time.sleep(1.0)
    # Re-focus
    user32.AttachThreadInput(cur_thread, target_thread, True)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    user32.AttachThreadInput(cur_thread, target_thread, False)
    b = capture('s33v3-victory.png')

print(f"\nDone! Victory screenshot saved (b={b:.1f})")
