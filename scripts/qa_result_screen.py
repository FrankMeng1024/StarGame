"""
qa_result_screen.py — 专用结算页截图QA脚本 (STORY-00386)
用于捕获 fail result screen 和 victory result screen 的截图证据。

前提：游戏已修改为 diffMap = [5, 5, 5, 5, 5] (短计时器)
"""
import sys, os, time
import ctypes, ctypes.wintypes

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"缺少依赖: {e}")
    sys.exit(1)

user32 = ctypes.windll.user32
SW_RESTORE = 9

OUT_DIR = "docs/qa/sprint73-evidence"
os.makedirs(OUT_DIR, exist_ok=True)


def find_devtools_hwnd():
    import subprocess
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


def capture(hwnd, filename, label=""):
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.0)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top,
                   "width": r.right - r.left, "height": r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)
        brightness = float(arr.mean())
        # Retry up to 3 times if full black
        for attempt in range(3):
            if brightness > 10:
                break
            time.sleep(2)
            img = sct.grab(monitor)
            arr = np.array(img)
            brightness = float(arr.mean())
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        # Scale to half size
        w2, h2 = pil.width // 2, pil.height // 2
        if w2 > 0 and h2 > 0:
            pil = pil.resize((w2, h2), Image.LANCZOS)
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
        print(f"  Saved {filename} brightness={brightness:.1f}")
        if brightness <= 10:
            print(f"  WARNING: 截图全黑")
        return path


def sendinput_click(phys_x, phys_y, screen_w, screen_h, label=""):
    norm_x = int(phys_x * 65535 / screen_w)
    norm_y = int(phys_y * 65535 / screen_h)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]

    class INPUT(ctypes.Structure):
        class _INPUT(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_input',)
        _fields_ = [('type', ctypes.c_ulong), ('_input', _INPUT)]

    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_ABSOLUTE = 0x8000
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
    if label:
        print(f"  Click {label} @ ({phys_x},{phys_y})")


def game_click(game_x, game_y, label=""):
    """Click at game canvas coordinate using calibrated formula."""
    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)
    phys_x = int(14.1 + game_x * 1.154)
    phys_y = int(138.0 + game_y * 1.155)
    sendinput_click(phys_x, phys_y, screen_w, screen_h, label)


def reload_devtools(hwnd):
    """Click the reload button in DevTools toolbar."""
    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    # Reload button at window-relative (484, 42) — calibrated
    phys_x = r.left + 484
    phys_y = r.top + 42
    sendinput_click(phys_x, phys_y, screen_w, screen_h, "reload ↺")


def main():
    print("qa_result_screen.py — STORY-00386 result screen QA")

    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: 未找到 wechatdevtools.exe 窗口")
        sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)

    # Step 1: Reload to start fresh
    print("\n[1] Reloading DevTools...")
    reload_devtools(hwnd)
    time.sleep(20)  # Wait for intro animation

    # Step 2: Navigate to level select
    print("\n[2] Click 挑战关卡...")
    game_click(300, 160, "focus")
    time.sleep(0.4)
    game_click(657, 149, "挑战关卡")
    time.sleep(3.0)

    # Step 3: Start Level 1
    print("\n[3] Click Level 1...")
    game_click(300, 160, "focus")
    time.sleep(0.4)
    game_click(162, 207, "Level 1")
    time.sleep(2)
    game_click(422, 195, "跳过 overlay")
    time.sleep(2)
    capture(hwnd, "STORY-00386-01-game.png", "game screen")

    # Step 4: Wait for fail (timer = 5s + 2s load ≈ 7s total)
    print("\n[4] Waiting 10s for fail result (timer=5s)...")
    time.sleep(10)
    capture(hwnd, "STORY-00386-02-fail.png", "fail result screen")

    # Step 5: Take another screenshot 2s later for stable state
    print("\n[5] Second fail screenshot (2s later)...")
    time.sleep(2)
    capture(hwnd, "STORY-00386-03-fail-stable.png", "fail result stable")

    print("\n✓ Screenshots saved to", OUT_DIR)
    print("Evidence files:")
    print("  STORY-00386-01-game.png")
    print("  STORY-00386-02-fail.png")
    print("  STORY-00386-03-fail-stable.png")


if __name__ == '__main__':
    main()
