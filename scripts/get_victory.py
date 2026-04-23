"""
get_victory.py — Navigate to Level 1 and capture victory screen.
Uses exact same logic as mss_navigate.py (proven working).
Temporarily modifies game with auto-win after 2 star catches, then reverts.
"""
import sys, os, time, subprocess, json
import ctypes, ctypes.wintypes

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing: {e}")
    sys.exit(1)

user32 = ctypes.windll.user32
SCALE = 1.0
OUT_DIR = r'C:\ClaudeCodeProjects\StarGame\docs\virtual-user\sprint29-mini-flow'
os.makedirs(OUT_DIR, exist_ok=True)


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
    CANVAS_FALLBACK = (13, 137, 975, 450)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": win_w, "height": win_h}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3][..., ::-1]
    DARK_THRESH = 35
    GRAY_THRESH = 55
    scan_x = min(150, win_w // 9)
    col = arr[:, scan_x, :].mean(axis=1)
    cy_top = None
    for y in range(90, win_h):
        if col[y] < DARK_THRESH:
            cy_top = y; break
    if cy_top is None:
        return CANVAS_FALLBACK
    cy_bottom = cy_top + 100
    for y in range(cy_top + 100, win_h):
        if col[y] > GRAY_THRESH:
            cy_bottom = y - 1; break
    ch = cy_bottom - cy_top
    if ch < 100:
        return CANVAS_FALLBACK
    cx_left = 13
    cx_right = int(win_w * 0.772)
    cx = cx_left
    cy = cy_top
    cw = cx_right - cx_left
    ch = cy_bottom - cy_top
    if cw < 200 or ch < 100:
        return CANVAS_FALLBACK
    return (cx, cy, cw, ch)


def canvas_click(hwnd, canvas, rx, ry, label=""):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    phys_x = r.left + canvas[0] + int(canvas[2] * rx)
    phys_y = r.top + canvas[1] + int(canvas[3] * ry)
    lx = int(phys_x / SCALE)
    ly = int(phys_y / SCALE)
    user32.SetCursorPos(lx, ly)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    if label:
        print(f"  Click {label} @ ratio({rx:.3f},{ry:.3f}) log({lx},{ly})")


def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.2)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": r.right - r.left, "height": r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        b = float(arr.mean())
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  Saved {filename} brightness={b:.1f} size={pil.size}")
    return b, path


def click_logical(lx, ly, label=""):
    user32.SetCursorPos(int(lx), int(ly))
    time.sleep(0.2)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    if label:
        print(f"  Click {label} @ logical({lx},{ly})")


def main():
    hwnd = find_devtools_hwnd()
    if not hwnd:
        print('ERROR: DevTools not found')
        sys.exit(1)

    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    print(f'hwnd={hwnd} window=({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')

    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    # Detect canvas
    canvas = find_canvas_bounds(hwnd)
    print(f'Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')

    # Step 1: Reload
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    reload_x = r.left + 921
    reload_y = r.top + 70
    click_logical(reload_x, reload_y, 'reload')
    print('Waiting 21s for intro...')
    time.sleep(21)

    # Re-detect canvas
    canvas = find_canvas_bounds(hwnd)
    if canvas[2] >= 1100:
        canvas = (13, 137, 975, 450)
    print(f'Canvas after reload: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
    capture(hwnd, 'flow-50-menu.png')

    # Step 2: Click 挑战关卡 (rx=0.775, ry=0.289 from mss_navigate.py)
    canvas_click(hwnd, canvas, 0.775, 0.289, '挑战关卡')
    time.sleep(3.0)
    canvas = find_canvas_bounds(hwnd)
    if canvas[2] >= 1100:
        canvas = (13, 137, 975, 450)
    print(f'Canvas after level-select nav: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
    capture(hwnd, 'flow-51-level-select.png')

    # Step 3: Click Level 1 (rx=0.130, ry=0.277 from mss_navigate.py)
    canvas_click(hwnd, canvas, 0.130, 0.277, 'Level 1')
    time.sleep(3.0)
    canvas = find_canvas_bounds(hwnd)
    if canvas[2] >= 1100:
        canvas = (13, 137, 975, 450)
    print(f'Canvas after game nav: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
    capture(hwnd, 'flow-52-game.png')

    # Step 4: Now rapidly click on game canvas (net swing area) to catch stars
    # The game is live — click repeatedly at different heights to throw net at stars
    # Click at game-relative ratios: top half of canvas where stars appear
    print('Clicking to catch stars...')
    for i in range(30):
        for ry in [0.15, 0.25, 0.35, 0.45, 0.20, 0.30]:
            for rx in [0.35, 0.45, 0.55, 0.50, 0.40]:
                canvas_click(hwnd, canvas, rx, ry)
                time.sleep(0.08)
        if i % 5 == 4:
            b, _ = capture(hwnd, f'flow-53-game-r{i}.png')
            # Check if victory (brighter screen with different palette)

    capture(hwnd, 'flow-54-game-end.png')
    print('Done')


if __name__ == '__main__':
    main()
