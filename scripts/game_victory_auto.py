"""
Navigate to Level 1, skip overlay, then frantically click in game area to catch stars.
Victory triggers when caught >= total.
"""
import sys, ctypes, ctypes.wintypes, time, subprocess, os
import mss, numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
user32 = ctypes.windll.user32

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
        except:
            pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]


def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.8)
    r2 = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r2))
    with mss.mss() as sct:
        monitor = {'left': r2.left, 'top': r2.top,
                   'width': r2.right - r2.left, 'height': r2.bottom - r2.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        b = float(arr.mean())
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f'  {filename} b={b:.1f} size={pil.size}')
    return b, path


def click_at(hwnd, lx, ly, label=''):
    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.05)
    user32.SetCursorPos(int(lx), int(ly))
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    if label:
        print(f'  click {label} ({int(lx)},{int(ly)})')


def get_rect(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r


def canvas_bounds(r):
    """Returns (cx, cy, cw, ch) for current window size"""
    W = r.right - r.left
    H = r.bottom - r.top
    if W > 1400:  # fullscreen ~1940
        scale_x = W / 1280
        scale_y = H / 800
        return (int(13 * scale_x), int(137 * scale_y), int(975 * scale_x), int(450 * scale_y))
    else:  # 1293x800
        return (13, 137, 975, 450)


def game_to_screen(hwnd, gx, gy, game_w=690, game_h=390):
    """Convert game coords (0-690, 0-390) to screen coords"""
    r = get_rect(hwnd)
    cx, cy, cw, ch = canvas_bounds(r)
    sx = r.left + cx + int(gx * cw / game_w)
    sy = r.top + cy + int(gy * ch / game_h)
    return sx, sy


def main():
    hwnd = find_devtools_hwnd()
    if not hwnd:
        print('ERROR: DevTools not found')
        sys.exit(1)
    print(f'hwnd={hwnd}')

    r = get_rect(hwnd)
    print(f'Window: {r.right-r.left}x{r.bottom-r.top} at ({r.left},{r.top})')

    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.0)

    # Step 1: Reload
    r = get_rect(hwnd)
    click_at(hwnd, r.left + 911, r.top + 60, 'reload')
    print('Waiting 21s for intro...')
    time.sleep(21)

    r = get_rect(hwnd)
    capture(hwnd, 'flow-44-menu.png')

    # Step 2: Click 挑战关卡
    r = get_rect(hwnd)
    click_at(hwnd, r.left + 564, r.top + 265, '挑战关卡')
    time.sleep(3.0)

    r = get_rect(hwnd)
    capture(hwnd, 'flow-45-level-select.png')

    # Step 3: Click Level 1
    r = get_rect(hwnd)
    cx, cy, cw, ch = canvas_bounds(r)
    l1_x = r.left + cx + int(cw * 0.130)
    l1_y = r.top + cy + int(ch * 0.277)
    click_at(hwnd, l1_x, l1_y, 'Level 1')
    time.sleep(2.5)

    r = get_rect(hwnd)
    capture(hwnd, 'flow-46-after-l1-click.png')

    # Step 4: Check if overlay appeared — if it did, game_to_screen the overlay area
    # The overlay is in the upper portion of game canvas
    # Try clicking "确定出发" button (touchend) by using physical click position
    # "确定出发" button is at game coords around (261, 210) based on levels.js 
    # Actually, let's try mouse_event TWICE quickly — sometimes touchend fires second time
    
    # Try multiple approaches to dismiss overlay
    # Method A: click 确定出发 region with double-click
    r = get_rect(hwnd)
    sx, sy = game_to_screen(hwnd, 261, 210)
    print(f'  Trying 确定出发 at ({sx},{sy})')
    for i in range(3):
        user32.SetCursorPos(sx, sy)
        user32.mouse_event(0x0002, 0, 0, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(0x0004, 0, 0, 0, 0)
        time.sleep(0.1)

    time.sleep(2.0)
    r = get_rect(hwnd)
    capture(hwnd, 'flow-47-after-confirm.png')

    # Step 5: Now frantically click various star positions in game
    # Level 1 (猎户座): ~7 stars spread across the constellation
    # Stars tend to appear at random positions but within game area
    # Click rapidly across the canvas to try to intercept the net with stars
    print('Starting rapid star-catching...')
    
    # The game has stars moving at the top half of game area
    # Net swings back and forth; click to throw net upward
    # Stars in 猎户座 shape: roughly diamond/hourglass pattern in center-top area
    
    # Click positions (game coords) — try to cover star spawn area
    star_positions = [
        (345, 100), (300, 120), (380, 110), (320, 90),
        (250, 150), (400, 140), (345, 80), (290, 130),
        (360, 160), (310, 100), (345, 130), (270, 120),
        (330, 110), (350, 95), (295, 145), (375, 125),
    ]
    
    for round_n in range(15):
        for gx, gy in star_positions:
            sx, sy = game_to_screen(hwnd, gx, gy)
            user32.SetCursorPos(sx, sy)
            user32.mouse_event(0x0002, 0, 0, 0, 0)
            time.sleep(0.03)
            user32.mouse_event(0x0004, 0, 0, 0, 0)
            time.sleep(0.05)
        
        # Take capture every 3 rounds to check state
        if round_n in (2, 5, 8, 12, 14):
            r = get_rect(hwnd)
            fn = f'flow-48-game-r{round_n}.png'
            capture(hwnd, fn)
            # Check if we hit a result screen (much brighter or different palette)
    
    # Final capture
    time.sleep(2.0)
    r = get_rect(hwnd)
    capture(hwnd, 'flow-49-game-final.png')
    print('Done — check flow-49 for result screen')


if __name__ == '__main__':
    main()
