"""
mss_gallery_shop.py — Navigate to gallery list, gallery detail, and shop screens.
Depends on the game already being in a state reachable from menu (runs reload first).

Usage: python scripts/mss_gallery_shop.py --sprint N --story STORY-XXXXX
"""
import sys, os, time, subprocess, json, argparse
import ctypes, ctypes.wintypes

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing dep: {e}")
    sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=56)
parser.add_argument('--story', type=str, default='SCREEN')
parser.add_argument('--out', type=str, default=None)
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
STORY = args.story

user32 = ctypes.windll.user32


def find_devtools_hwnd():
    candidates = []
    def callback(hwnd, _):
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
                    candidates.append((hwnd, w * h))
        except: pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]


def find_canvas_bounds(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": win_w, "height": win_h}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3][..., ::-1]
    B_GAME = 56
    scan_x = min(260, win_w // 4)
    col_B = arr[:, scan_x, 2].astype(int)
    cy_top = None
    for y in range(55, win_h):
        if col_B[y] > B_GAME:
            cy_top = y
            break
    if cy_top is None:
        return None
    last_blue_y = cy_top
    for y in range(cy_top, min(cy_top + 600, win_h)):
        if col_B[y] > B_GAME:
            last_blue_y = y
        elif y > last_blue_y + 15:
            break
    cy_bottom = last_blue_y
    ch = cy_bottom - cy_top
    if ch < 100:
        return None
    scan_row_y = cy_top + ch // 2
    row_B = arr[scan_row_y, :, 2].astype(int)
    cx_left = 0
    for x in range(0, min(200, win_w)):
        if row_B[x] > B_GAME:
            cx_left = x
            break
    last_blue_x = cx_left
    for x in range(cx_left, min(win_w - 5, 700)):
        if row_B[x] > B_GAME:
            last_blue_x = x
        elif x > last_blue_x + 20:
            break
    cx_right = last_blue_x
    cw = cx_right - cx_left
    ch = cy_bottom - cy_top
    if cw < 100 or ch < 100:
        return None
    return (cx_left, cy_top, cw, ch)


def _sendinput_phys(phys_x, phys_y):
    vx_origin = user32.GetSystemMetrics(76)
    vy_origin = user32.GetSystemMetrics(77)
    vw        = user32.GetSystemMetrics(78)
    vh        = user32.GetSystemMetrics(79)
    norm_x = int((phys_x - vx_origin) * 65535 / vw)
    norm_y = int((phys_y - vy_origin) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _INPUT(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_input',)
        _fields_ = [('type', ctypes.c_ulong), ('_input', _INPUT)]

    MOUSEEVENTF_MOVE        = 0x0001
    MOUSEEVENTF_LEFTDOWN    = 0x0002
    MOUSEEVENTF_LEFTUP      = 0x0004
    MOUSEEVENTF_ABSOLUTE    = 0x8000
    MOUSEEVENTF_VIRTUALDESK = 0x4000
    INPUT_MOUSE = 0

    move = INPUT(type=INPUT_MOUSE)
    move.mi.dx = norm_x; move.mi.dy = norm_y
    move.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    ctypes.windll.user32.SendInput(1, ctypes.byref(move), ctypes.sizeof(INPUT))
    time.sleep(0.1)

    down = INPUT(type=INPUT_MOUSE)
    down.mi.dx = norm_x; down.mi.dy = norm_y
    down.mi.dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    ctypes.windll.user32.SendInput(1, ctypes.byref(down), ctypes.sizeof(INPUT))
    time.sleep(0.05)

    up = INPUT(type=INPUT_MOUSE)
    up.mi.dx = norm_x; up.mi.dy = norm_y
    up.mi.dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
    ctypes.windll.user32.SendInput(1, ctypes.byref(up), ctypes.sizeof(INPUT))


def canvas_click(canvas, rx, ry, label=""):
    phys_x = canvas[0] + int(canvas[2] * rx)
    phys_y = canvas[1] + int(canvas[3] * ry)
    user32.SetCursorPos(phys_x, phys_y)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.15)
    if label:
        print(f"  🖱  Click {label} @ ratio({rx:.3f},{ry:.3f}) abs({phys_x},{phys_y})")


def capture(hwnd, filename, label=""):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": r.right - r.left, "height": r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        brightness = float(arr.mean())
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename} brightness={brightness:.1f}" + (f" ({label})" if label else ""))
    return brightness, path


def main():
    print(f"mss_gallery_shop.py — Sprint {args.sprint} / {STORY}")
    print(f"Output dir: {OUT_DIR}")

    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: wechatdevtools.exe not found")
        sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    # Detect canvas
    win_bounds = find_canvas_bounds(hwnd)
    if win_bounds is None:
        r_fb = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(r_fb))
        fb_ww = r_fb.right - r_fb.left
        fb_wh = r_fb.bottom - r_fb.top
        scale_x = fb_ww / 1917.0
        scale_y = fb_wh / 1200.0
        fb_cx = int(14 * scale_x)
        fb_cy = int(137 * scale_y)
        fb_cw = int(974 * scale_x)
        fb_ch = int(290 * scale_y)
        win_bounds = (fb_cx, fb_cy, fb_cw, fb_ch)
        print(f"⚠ Canvas fallback: win({fb_cx},{fb_cy}) {fb_cw}x{fb_ch}")

    cx_win, cy_win, cw, ch = win_bounds
    r_win2 = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r_win2))
    abs_left = r_win2.left + cx_win
    abs_top  = r_win2.top  + cy_win
    canvas = (abs_left, abs_top, cw, ch)
    print(f"✓ Canvas: win({cx_win},{cy_win}) {cw}x{ch} → abs({abs_left},{abs_top})")

    # Step 1: Capture current state (assume game is at menu after mss_navigate.py)
    print("\n[1/6] Capture menu (assumed already at menu)")
    canvas_click(canvas, 0.300, 0.400, "focus-simulator")
    time.sleep(1.0)
    brightness, path = capture(hwnd, f"{STORY}-01-menu.png", "menu")
    print(f"  ✓ menu captured (brightness={brightness:.1f})")

    # Step 2: Navigate to gallery (星座图鉴 button)
    # Menu buttons (right half): 挑战关卡=ratio(0.668,0.610), 星座图鉴=ratio(0.668,0.748), 道具商店=ratio(0.668,0.886)
    print("\n[2/6] Navigate to gallery (星座图鉴)")
    canvas_click(canvas, 0.668, 0.748, "星座图鉴")
    time.sleep(3.0)
    brightness, path = capture(hwnd, f"{STORY}-02-gallery-list.png", "gallery list")
    print(f"  ✓ gallery list captured (brightness={brightness:.1f})")

    # Step 3: Click first constellation node (top-left, slot 0)
    # Node 0 position in 800×500 game space: cx≈194, cy≈130 → ratio(0.242, 0.259)
    print("\n[3/6] Click first constellation node (slot 0, top-left)")
    canvas_click(canvas, 0.242, 0.259, "node-slot0")
    time.sleep(2.5)
    brightness, path = capture(hwnd, f"{STORY}-03-gallery-detail.png", "gallery detail")
    print(f"  ✓ gallery detail captured (brightness={brightness:.1f})")

    # Step 4: Back to menu (← 返回 button top-left)
    # Back button: game coords (52, 26) → ratio(0.065, 0.052)
    print("\n[4/6] Back to menu (← 返回)")
    canvas_click(canvas, 0.065, 0.052, "← 返回")
    time.sleep(2.0)
    brightness, _ = capture(hwnd, f"{STORY}-04-back-to-menu.png", "back to menu")
    print(f"  ✓ back to menu (brightness={brightness:.1f})")

    # Step 5: Navigate to shop (道具商店 button)
    print("\n[5/6] Navigate to shop (道具商店)")
    canvas_click(canvas, 0.668, 0.886, "道具商店")
    time.sleep(3.0)
    brightness, path = capture(hwnd, f"{STORY}-05-shop.png", "shop")
    print(f"  ✓ shop captured (brightness={brightness:.1f})")

    # Step 6: Back to menu from shop
    # Shop back button should also be at approximately (0.065, 0.052)
    print("\n[6/6] Back to menu from shop (← 返回)")
    canvas_click(canvas, 0.065, 0.052, "← 返回 from shop")
    time.sleep(2.0)
    brightness, _ = capture(hwnd, f"{STORY}-06-back-from-shop.png", "back from shop")
    print(f"  ✓ back from shop (brightness={brightness:.1f})")

    print("\n═══ Done ═══")
    print(f"Screenshots saved to: {OUT_DIR}")
    sys.exit(0)


if __name__ == '__main__':
    main()
