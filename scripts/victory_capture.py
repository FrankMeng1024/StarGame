"""
victory_capture.py — Navigate to Level 1, trigger victory via overlay skip, capture victory screen.
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
    time.sleep(1.2)
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
    time.sleep(0.1)
    user32.SetCursorPos(int(lx), int(ly))
    time.sleep(0.25)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.1)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    if label:
        print(f'  Click {label} at ({int(lx)},{int(ly)})')


def get_rect(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r


def main():
    hwnd = find_devtools_hwnd()
    if not hwnd:
        print('ERROR: DevTools not found')
        sys.exit(1)
    print(f'hwnd={hwnd}')

    r = get_rect(hwnd)
    print(f'Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')

    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.0)

    # --- Step 1: Reload ---
    r = get_rect(hwnd)
    click_at(hwnd, r.left + 911, r.top + 60, 'reload')
    print('Waiting 21s for intro...')
    time.sleep(21)

    r = get_rect(hwnd)
    print(f'After reload: {r.right-r.left}x{r.bottom-r.top} at ({r.left},{r.top})')
    capture(hwnd, 'flow-40-menu.png')

    # --- Step 2: Click 挑战关卡 ---
    # Menu uses touchstart, button at image (564, 265) in 1293x800 window
    r = get_rect(hwnd)
    click_at(hwnd, r.left + 564, r.top + 265, '挑战关卡')
    time.sleep(3.0)

    r = get_rect(hwnd)
    W = r.right - r.left
    print(f'After 挑战关卡: {W}x{r.bottom-r.top} at ({r.left},{r.top})')
    capture(hwnd, 'flow-41-level-select.png')

    # --- Step 3: Click Level 1 ---
    # Canvas position: (13, 137, 975, 450) for 1280x800 baseline
    # Scale up for actual window size
    if W > 1400:  # fullscreen 1940x1200
        scale_x = W / 1280
        scale_y = (r.bottom - r.top) / 800
        cx = int(13 * scale_x)
        cy = int(137 * scale_y)
        cw = int(975 * scale_x)
        ch = int(450 * scale_y)
    else:  # 1293x800
        cx, cy, cw, ch = 13, 137, 975, 450

    # Level 1 in mss_navigate uses rx=0.130, ry=0.277
    l1_x = r.left + cx + int(cw * 0.130)
    l1_y = r.top + cy + int(ch * 0.277)
    click_at(hwnd, l1_x, l1_y, 'Level 1')
    time.sleep(2.5)

    r = get_rect(hwnd)
    W = r.right - r.left
    print(f'After Level 1: {W}x{r.bottom-r.top} at ({r.left},{r.top})')
    capture(hwnd, 'flow-42-after-l1-click.png')

    # --- Step 4: Click skip overlay (跳过) if overlay appeared ---
    # The overlay "跳过" button is at canvas game coords (261, 258)
    # In displayed canvas: scale game coords to canvas pixel size
    if W > 1400:
        scale_x = W / 1280
        scale_y = (r.bottom - r.top) / 800
        cx = int(13 * scale_x)
        cy = int(137 * scale_y)
        cw = int(975 * scale_x)
        ch = int(450 * scale_y)
    else:
        cx, cy, cw, ch = 13, 137, 975, 450

    # Game internal 690x390 space -> canvas display (cw x ch)
    game_w, game_h = 690, 390
    skip_game_x, skip_game_y = 261, 258
    skip_x = r.left + cx + int(skip_game_x * cw / game_w)
    skip_y = r.top + cy + int(skip_game_y * ch / game_h)
    click_at(hwnd, skip_x, skip_y, '跳过 overlay skip')
    time.sleep(3.0)

    r = get_rect(hwnd)
    print(f'After skip: {r.right-r.left}x{r.bottom-r.top}')
    capture(hwnd, 'flow-43-game-screen.png')

    print('DONE - now waiting for game to play out or checking state')


if __name__ == '__main__':
    main()
