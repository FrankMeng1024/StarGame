"""
capture_all_screens.py — Navigate mini game to all screens and capture screenshots.
Uses wx.__navigate() via WeChat DevTools TERMINAL tab clipboard paste.

Calibrated for 1918x1200 DevTools window layout:
  - Game canvas: (15, 95, 695, 330) abs pixels
  - TERMINAL tab: x≈0.659*ww, y≈0.601*wh
  - Terminal input: x≈0.485*ww, y≈0.631*wh

Usage:
  python scripts/capture_all_screens.py --sprint 32 --story STORY-00308
"""
import ctypes, ctypes.wintypes, mss, subprocess, time, os, argparse, sys
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=32)
parser.add_argument('--story', type=str, default='STORY-00308')
args = parser.parse_args()

OUT_DIR = f"docs/qa/sprint{args.sprint}-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
STORY = args.story

user32 = ctypes.windll.user32

def find_devtools():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL
            ).decode('utf-8', 'replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w, h = r.right - r.left, r.bottom - r.top
                if w > 400 and h > 400:
                    found.append((hwnd, w, h, r.left, r.top))
        except:
            pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    if not found:
        return None
    found.sort(key=lambda x: -(x[1] * x[2]))
    return found[0]

def sendinput(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw)
    ny = int((phys_y - vy) * 65535 / vh)
    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_u',)
        _fields_ = [('type', ctypes.c_ulong), ('_u', _U)]
    F = 0x8000 | 0x4000
    for flags in [0x0001 | F, 0x0002 | F, 0x0004 | F]:
        inp = INPUT(type=0)
        inp.mi.dx = nx; inp.mi.dy = ny; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)

def click(ax, ay, label=""):
    sendinput(ax, ay)
    if label:
        print(f"  click {label} @ ({ax},{ay})", flush=True)
    time.sleep(0.1)

def capture_canvas(hwnd, wl, wt, ww, wh, filename, label=""):
    """Capture just the game canvas area (left panel)."""
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    # Canvas is in left panel: scaled from 1918x1200 calibration
    REF_W, REF_H = 1918, 1200
    scale_x = ww / REF_W
    scale_y = wh / REF_H
    # From screenshot analysis: canvas at (15, 95) with size 695x330
    cx = wl + int(15 * scale_x)
    cy = wt + int(95 * scale_y)
    cw = int(695 * scale_x)
    ch = int(330 * scale_y)
    with mss.mss() as sct:
        region = {'left': cx, 'top': cy, 'width': cw, 'height': ch}
        img = sct.grab(region)
        arr = np.array(img)[:, :, :3][..., ::-1]
        brightness = float(arr.mean())
        path = os.path.join(OUT_DIR, filename)
        Image.fromarray(arr).save(path)
    lbl = f" [{label}]" if label else ""
    print(f"  captured {filename} brightness={brightness:.1f}{lbl}", flush=True)
    if brightness < 5:
        print(f"  WARNING: screenshot is black!", flush=True)
    return brightness, path

def navigate(hwnd, wl, wt, ww, wh, screen, wait=2.0):
    """Navigate game via wx.__navigate in terminal."""
    REF_W, REF_H = 1918, 1200
    scale_x = ww / REF_W
    scale_y = wh / REF_H

    # TERMINAL tab position (from screenshot analysis: x=1264, y=721 in 1918x1200)
    tab_x = wl + int(1264 * scale_x)
    tab_y = wt + int(721 * scale_y)
    click(tab_x, tab_y, "TERMINAL tab")
    time.sleep(0.5)

    # Terminal input area (prompt line at y=757 in 1918x1200, x=930)
    input_x = wl + int(930 * scale_x)
    input_y = wt + int(757 * scale_y)
    click(input_x, input_y, "terminal input")
    time.sleep(0.3)

    # Paste command
    cmd = f"wx.__navigate('{screen}')"
    subprocess.run(['powershell', '-Command', f'Set-Clipboard "{cmd}"'],
                   capture_output=True, timeout=5)
    time.sleep(0.2)
    keybd = ctypes.windll.user32.keybd_event
    keybd(0x11, 0, 0, 0)  # Ctrl down
    keybd(0x56, 0, 0, 0)  # V down
    keybd(0x56, 0, 2, 0)  # V up
    keybd(0x11, 0, 2, 0)  # Ctrl up
    time.sleep(0.2)
    keybd(0x0D, 0, 0, 0)  # Enter down
    keybd(0x0D, 0, 2, 0)  # Enter up
    time.sleep(wait)
    print(f"  navigated to '{screen}'", flush=True)

def main():
    print(f"capture_all_screens.py — Sprint {args.sprint} / {STORY}", flush=True)

    result = find_devtools()
    if not result:
        print("ERROR: WeChat DevTools not found", flush=True)
        sys.exit(1)

    hwnd, ww, wh, wl, wt = result
    print(f"hwnd={hwnd} pos=({wl},{wt}) size={ww}x{wh}", flush=True)

    REF_W, REF_H = 1918, 1200
    scale_x = ww / REF_W
    scale_y = wh / REF_H

    # Bring to foreground
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    time.sleep(2.0)

    # Verify not locked — take a quick screenshot
    _, path0 = capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-00-initial.png", "initial")
    b0, _ = _, path0
    # b0 returned as float from capture_canvas
    with mss.mss() as sct:
        cx = wl + int(15 * scale_x)
        cy = wt + int(95 * scale_y)
        cw_s = int(695 * scale_x)
        ch_s = int(330 * scale_y)
        region = {'left': cx, 'top': cy, 'width': cw_s, 'height': ch_s}
        img = sct.grab(region)
        arr = np.array(img)[:, :, :3][..., ::-1]
        b0 = float(arr.mean())

    if b0 < 5:
        print("ERROR: Screen appears to be locked or black. Please unlock.", flush=True)
        sys.exit(1)
    print(f"Screen verified: brightness={b0:.1f}", flush=True)

    # ── 1. Menu ─────────────────────────────────────────────────────
    print("\n[1/8] Menu", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'menu', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-01-menu.png", "menu")

    # ── 2. Level Select ─────────────────────────────────────────────
    print("\n[2/8] Level Select", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'levels', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-02-level-select.png", "levels")

    # ── 3. Shop ─────────────────────────────────────────────────────
    print("\n[3/8] Shop", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'shop', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-03-shop.png", "shop")

    # ── 4. Gallery (list) ───────────────────────────────────────────
    print("\n[4/8] Gallery list", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'gallery', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-04-gallery-list.png", "gallery")

    # ── 5. Achievement ──────────────────────────────────────────────
    print("\n[5/8] Achievement", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'achievement', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-05-achievement.png", "achievement")

    # ── 6. Game (navigate to levels then click level 1) ─────────────
    print("\n[6/8] Game screen", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'levels', wait=2.0)
    # Click level 1 card — top-left of the grid
    # In 1918x1200: canvas starts at (15, 95), canvas size ~695x330
    # Level 1 card is near top-left of the scrollable grid
    # ratio (0.114, 0.147) from mss_navigate calibration
    cx_abs = wl + int(15 * scale_x)
    cy_abs = wt + int(95 * scale_y)
    cw_s = int(695 * scale_x)
    ch_s = int(330 * scale_y)
    l1_x = cx_abs + int(cw_s * 0.114)
    l1_y = cy_abs + int(ch_s * 0.30)  # slightly lower to hit the card
    click(l1_x, l1_y, "Level 1 card")
    time.sleep(3.0)
    # Skip item overlay if shown
    skip_x = cx_abs + int(cw_s * 0.35)
    skip_y = cy_abs + int(ch_s * 0.49)
    click(skip_x, skip_y, "skip item overlay")
    time.sleep(3.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-06-game.png", "game")

    # ── 7. Item overlay (navigate to levels, click level, capture overlay) ──
    print("\n[7/8] Item overlay", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'levels', wait=2.0)
    click(l1_x, l1_y, "Level 1 for overlay")
    time.sleep(2.5)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-07-item-overlay.png", "item overlay")

    # ── 8. Fail screen (navigate directly) ──────────────────────────
    print("\n[8/8] Fail/Complete screen", flush=True)
    navigate(hwnd, wl, wt, ww, wh, 'fail', wait=2.0)
    capture_canvas(hwnd, wl, wt, ww, wh, f"{STORY}-08-fail.png", "fail")

    print("\nAll screenshots captured!", flush=True)

if __name__ == '__main__':
    main()
