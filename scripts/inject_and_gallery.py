"""
inject_and_gallery.py — 向 DevTools 注入 JWT + 存档，截取图鉴界面

流程:
  1. 找到 wechatdevtools.exe 句柄
  2. 将游戏 API_BASE 指向 localhost:3000
  3. 通过 DevTools 控制台注入 JWT + 存档数据
  4. 重新加载游戏（等待 intro）
  5. 导航到图鉴界面并截图
"""
import sys, os, time, subprocess, json, ctypes, ctypes.wintypes
import ctypes.wintypes as wt

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
    print(f"缺少依赖: {e} — 运行: pip install mss pillow numpy")
    sys.exit(1)

user32 = ctypes.windll.user32

OUT_DIR = 'docs/qa/sprint46-evidence'
os.makedirs(OUT_DIR, exist_ok=True)

# ── 发现 hwnd ──────────────────────────────────────────────────────────
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


def get_canvas_abs(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx_ = r.left; wy_ = r.top
    # Calibrated: canvas at window-relative (14,137), size 975x290
    return wx_ + 14, wy_ + 137, 975, 290


def _sendinput_phys(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    norm_x = int((phys_x - vx) * 65535 / vw)
    norm_y = int((phys_y - vy) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _INPUT(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_input',)
        _fields_ = [('type', ctypes.c_ulong), ('_input', _INPUT)]

    flags_abs = 0x0001 | 0x8000 | 0x4000  # MOVE|ABSOLUTE|VIRTUALDESK
    for flag in [flags_abs, 0x0002 | 0x8000 | 0x4000, 0x0004 | 0x8000 | 0x4000]:
        inp = INPUT(type=0)
        inp.mi.dx = norm_x; inp.mi.dy = norm_y; inp.mi.dwFlags = flag
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)


def canvas_click(hwnd, ratio_x, ratio_y, label=''):
    ax, ay, cw, ch = get_canvas_abs(hwnd)
    px = ax + int(cw * ratio_x)
    py = ay + int(ch * ratio_y)
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.3)
    if label:
        print(f"  🖱  Click {label} @ ratio({ratio_x:.3f},{ratio_y:.3f}) log({px},{py})")


def screenshot(hwnd, filename):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {'left': r.left, 'top': r.top,
                   'width': r.right - r.left, 'height': r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3]
        path = os.path.join(OUT_DIR, filename)
        Image.fromarray(arr).save(path)
        b = arr.mean()
        print(f"  📸 {filename} brightness={b:.1f}")
        return b, path


def set_clipboard(text):
    """Set clipboard text using pyperclip or win32 API."""
    try:
        import subprocess
        # Use PowerShell to set clipboard — most reliable on Windows
        proc = subprocess.run(
            ['powershell', '-Command', f'Set-Clipboard -Value {json.dumps(text)}'],
            capture_output=True, timeout=5
        )
        return proc.returncode == 0
    except Exception as e:
        print(f"  clipboard error: {e}")
        return False


def type_text(text):
    """Type text using clipboard paste for reliability."""
    if not set_clipboard(text):
        print(f"  WARNING: clipboard set failed, typing directly")
        # Fallback: type character by character
        for ch in text:
            ctypes.windll.user32.keybd_event(ord(ch) if ch.isascii() else 0, 0, 0, 0)
            ctypes.windll.user32.keybd_event(ord(ch) if ch.isascii() else 0, 0, 2, 0)
            time.sleep(0.02)
        return
    time.sleep(0.2)
    # Ctrl+A to clear, then Ctrl+V to paste
    VK_CONTROL = 0x11
    VK_A = 0x41
    VK_V = 0x56
    def key(vk, down):
        ctypes.windll.user32.keybd_event(vk, 0, 0 if down else 2, 0)
    key(VK_CONTROL, True); key(VK_A, True); key(VK_A, False); key(VK_CONTROL, False)
    time.sleep(0.1)
    key(VK_CONTROL, True); key(VK_V, True); key(VK_V, False); key(VK_CONTROL, False)
    time.sleep(0.2)


def press_enter():
    VK_RETURN = 0x0D
    ctypes.windll.user32.keybd_event(VK_RETURN, 0, 0, 0)
    time.sleep(0.05)
    ctypes.windll.user32.keybd_event(VK_RETURN, 0, 2, 0)
    time.sleep(0.3)


def click_devtools_console(hwnd):
    """Click on the DevTools console input area (bottom right panel)."""
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    # DevTools console is in the right panel, bottom area
    # Approximate position: x=75% of window width, y=90% of window height
    console_x = r.left + int(win_w * 0.82)
    console_y = r.top + int(win_h * 0.92)
    user32.SetCursorPos(console_x, console_y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.5)
    print(f"  🖱  Clicked console at ({console_x},{console_y})")


# ── JWT for test_dev_user_001 ──────────────────────────────────────────
# Generated with JWT_SECRET from backend/.env
JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuaWQiOiJ0ZXN0X2Rldl91c2VyXzAwMSIsImlhdCI6MTc3Njc4MTA2OCwiZXhwIjoxNzc5MzczMDY4fQ.qVz20ah3M_JvJL1r5uQqLffcCam_YxN4eRYl5V7fJrc'

SAVE_DATA = json.dumps({
    "unlockedLevels": [0,1,2,3,4,5,6,7,8,9,10,11],
    "levelScores": {"0":3,"1":2,"2":3,"3":1,"4":2,"5":3},
    "coins": 500,
    "inventory": {},
    "seenScenes": [],
    "nickname": "TestPlayer",
    "avatarUrl": ""
})


def main():
    # 1. Find hwnd
    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: 未找到 wechatdevtools.exe 窗口")
        sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    # 2. Bring to foreground
    user32.ShowWindow(hwnd, 5)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    # 3. Click console area and inject storage
    print("\n[1] 注入测试数据到 wx 本地存储...")
    click_devtools_console(hwnd)
    time.sleep(0.5)

    # Inject token
    inject_token_cmd = f"wx.setStorageSync('starcatcher_token', '{JWT_TOKEN}')"
    print(f"  Injecting token...")
    type_text(inject_token_cmd)
    press_enter()
    time.sleep(0.5)

    # Inject save data
    inject_save_cmd = f"wx.setStorageSync('starcatcher_save', {SAVE_DATA})"
    print(f"  Injecting save data (unlockedLevels 0-11)...")
    type_text(inject_save_cmd)
    press_enter()
    time.sleep(0.5)

    # 4. Reload game
    print("\n[2] 重新加载游戏...")
    r_win = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r_win))
    reload_px = r_win.left + 484
    reload_py = r_win.top + 42
    _sendinput_phys(reload_px, reload_py)
    time.sleep(20)  # Wait for intro animation

    # Focus simulator
    canvas_click(hwnd, 0.300, 0.400, "focus-simulator")
    time.sleep(1.5)

    # Screenshot menu
    b, _ = screenshot(hwnd, 'STORY-00349-01-menu.png')
    if b < 10:
        print("  ERROR: 截图全黑")
        sys.exit(1)
    print(f"  Menu brightness={b:.1f}")

    # 5. Navigate to gallery (星座图鉴)
    print("\n[3] 导航到星座图鉴...")
    canvas_click(hwnd, 0.668, 0.748, "星座图鉴")
    time.sleep(2.5)

    b, path = screenshot(hwnd, 'STORY-00349-gallery-list.png')
    print(f"  Gallery screenshot brightness={b:.1f}")

    if b < 10:
        print("  太暗，重试...")
        time.sleep(1)
        b, path = screenshot(hwnd, 'STORY-00349-gallery-list.png')
        print(f"  Retry brightness={b:.1f}")

    print(f"\n✓ 完成 — gallery screenshot saved to {OUT_DIR}")
    print("请检查截图确认图鉴界面已显示解锁的星座")


if __name__ == '__main__':
    main()
