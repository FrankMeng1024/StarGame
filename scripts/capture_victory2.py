"""
capture_victory2.py — From fail screen, click Retry, tap stars, capture victory
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

# ── Find DevTools ──────────────────────────────────────────────────────────────
def find_devtools():
    result = []
    EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def _cb(hwnd, _):
        buf = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buf, 256)
        title = buf.value
        rect = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top
        if w > 800 and h > 600 and '微信开发者工具' in title:
            result.append((hwnd, title, rect.left, rect.top, w, h))
        return True
    user32.EnumWindows(EnumWindowsProc(_cb), 0)
    return result

wins = find_devtools()
if not wins:
    print("ERROR: DevTools not found")
    sys.exit(1)

hwnd, title, wl, wt, ww, wh = wins[0]
print(f"DevTools at ({wl},{wt}) {ww}x{wh}")

cur_thread = kernel32.GetCurrentThreadId()
target_thread = user32.GetWindowThreadProcessId(hwnd, None)

def focus():
    user32.AttachThreadInput(cur_thread, target_thread, True)
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.BringWindowToTop(hwnd)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    user32.AttachThreadInput(cur_thread, target_thread, False)

# ── Canvas region ──────────────────────────────────────────────────────────────
canvas_x = wl + 14
canvas_y = wt + 86
canvas_w = 670
canvas_h = 440

# ── SendInput helpers ──────────────────────────────────────────────────────────
MOUSEEVENTF_MOVE        = 0x0001
MOUSEEVENTF_LEFTDOWN    = 0x0002
MOUSEEVENTF_LEFTUP      = 0x0004
MOUSEEVENTF_ABSOLUTE    = 0x8000
MOUSEEVENTF_VIRTUALDESK = 0x4000

screen_w = user32.GetSystemMetrics(78)
screen_h = user32.GetSystemMetrics(79)
virt_x   = user32.GetSystemMetrics(76)
virt_y   = user32.GetSystemMetrics(77)
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

def click(x, y, delay_after=0.1):
    nx = int((x - virt_x) * 65535 / screen_w)
    ny = int((y - virt_y) * 65535 / screen_h)
    flags_abs = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    inp_move = INPUT(type=0); inp_move.mi.dx = nx; inp_move.mi.dy = ny; inp_move.mi.dwFlags = MOUSEEVENTF_MOVE | flags_abs
    inp_dn   = INPUT(type=0); inp_dn.mi.dx = nx;   inp_dn.mi.dy = ny;   inp_dn.mi.dwFlags = MOUSEEVENTF_LEFTDOWN | flags_abs
    inp_up   = INPUT(type=0); inp_up.mi.dx = nx;   inp_up.mi.dy = ny;   inp_up.mi.dwFlags = MOUSEEVENTF_LEFTUP | flags_abs
    arr = (INPUT * 3)(inp_move, inp_dn, inp_up)
    user32.SendInput(3, arr, ctypes.sizeof(INPUT))
    time.sleep(delay_after)

def capture(name, check_brightness=True):
    region = {'left': canvas_x, 'top': canvas_y, 'width': canvas_w, 'height': canvas_h}
    with mss.mss() as sct:
        img = sct.grab(region)
    arr = np.array(img)
    brightness = arr[:, :, :3].mean()
    img_rgb = arr[:, :, [2, 1, 0]]
    pil = Image.fromarray(img_rgb.astype('uint8'))
    out = os.path.join("docs/qa/sprint33-evidence", name)
    os.makedirs("docs/qa/sprint33-evidence", exist_ok=True)
    pil.save(out)
    print(f"  {name} b={brightness:.1f}")
    return brightness

# ── STEP 1: Focus and take current state screenshot ──────────────────────────
focus()
b0 = capture('victory-step0-current.png')
print(f"Current state brightness: {b0:.1f}")

# ── STEP 2: Click '重试' button ──────────────────────────────────────────────
# '重试' button is approximately at ratio (0.38, 0.557) on canvas in fail screen
# From game.js _drawResult: button at (cx - 100, cy+btnOffY) roughly
# Canvas cx = 670/2 = 335, buttons at bottom of card
# Fail card: cardY=max(10,(H-cardH)/2), H=440, cardH=300 → cardY=70
# Buttons at bottom of card: cy = cardY + cardH - 40 = 70 + 300 - 40 = 330
# 重试 button: cx=190 (left), cy=330+10=340 → canvas ratio: 190/670=0.284, 340/440=0.773
retry_x = int(canvas_x + 190)  # retry button cx approx
retry_y = int(canvas_y + 330)  # retry button cy approx
print(f"\nClicking 重试 at ({retry_x}, {retry_y})")
focus()
click(retry_x, retry_y, delay_after=0.3)
time.sleep(1.5)  # Wait for game to start
b1 = capture('victory-step1-after-retry.png')
print(f"After retry brightness: {b1:.1f}")

# ── STEP 3: Now we should be in game. Tap all 7 Orion stars ─────────────────
# Sky area: skyX0=16, skyX1=654, skyY0=120, skyY1=273
sky_x0, sky_x1 = 16, 654
sky_y0, sky_y1 = 120, 273

orion_stars = [
    (0.28, 0.18),  # 参宿四
    (0.68, 0.20),  # 参宿五
    (0.38, 0.50),  # 参宿一
    (0.50, 0.52),  # 参宿二
    (0.62, 0.50),  # 参宿三
    (0.32, 0.82),  # 参宿增四
    (0.70, 0.80),  # 参宿七
]

star_positions = []
for sx, sy in orion_stars:
    cx = sky_x0 + sx * (sky_x1 - sky_x0)
    cy = sky_y0 + sy * (sky_y1 - sky_y0)
    px = canvas_x + cx
    py = canvas_y + cy
    star_positions.append((int(px), int(py)))

print("\nTapping 7 Orion stars (3 rounds to catch moving targets)...")

# Tap all stars 3 times with small delay — stars move so multiple rounds help
for round_n in range(3):
    print(f"  Round {round_n+1}:")
    for i, (px, py) in enumerate(star_positions):
        click(px, py, delay_after=0.08)
    time.sleep(0.2)
    # Also tap in a 3x3 grid around each star position (stars move slightly)
    for px, py in star_positions:
        for dx in [-8, 0, 8]:
            for dy in [-8, 0, 8]:
                click(px + dx, py + dy, delay_after=0.02)

print("Waiting 2s for victory animation...")
time.sleep(2.0)

b2 = capture('victory-step2-result.png')
print(f"After taps brightness: {b2:.1f}")

# Check if we got victory or still game
print("\nFinal state captured.")
