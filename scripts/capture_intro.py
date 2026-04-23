"""
capture_intro.py — 捕获开场动画截图（冻结指定时刻）

策略:
  1. 点击 DevTools 控制台输入框
  2. 粘贴 JS: wx.__introFreezeAt=N; wx.__navigate('intro')
  3. 等待 1.5s (intro 渲染冻结帧)
  4. 截图

用法:
  python scripts/capture_intro.py --sprint 40 --story STORY-00329
"""
import sys, os, time, subprocess, ctypes, ctypes.wintypes, argparse

# DPI awareness — must be before any windowing API
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
    print(f"Missing: {e} — pip install mss pillow numpy"); sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=40)
parser.add_argument('--story', type=str, default='STORY-00329')
parser.add_argument('--out', type=str, default=None)
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
STORY = args.story

user32 = ctypes.windll.user32


def find_devtools_hwnd():
    candidates = []
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
                w = r.right - r.left; h = r.bottom - r.top
                if w > 400 and h > 400:
                    candidates.append((hwnd, w * h))
        except: pass
        return True
    FT = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(FT(cb), 0)
    if not candidates: return None
    return sorted(candidates, key=lambda x: -x[1])[0][0]


def sendinput(px, py):
    """SendInput click at physical coordinates."""
    vx = user32.GetSystemMetrics(76); vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78); vh = user32.GetSystemMetrics(79)
    nx = int((px - vx) * 65535 / vw)
    ny = int((py - vy) * 65535 / vh)

    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),
                    ('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _I(ctypes.Union): _fields_ = [('mi', MI)]
        _anonymous_ = ('_input',)
        _fields_ = [('type',ctypes.c_ulong),('_input',_I)]

    FLAGS = [(0x8001|0x4000), (0x8002|0x4000), (0x8004|0x4000)]
    for fl in FLAGS:
        inp = INPUT(type=0); inp.mi.dx = nx; inp.mi.dy = ny; inp.mi.dwFlags = fl
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.06)


def set_clipboard(text):
    """Set clipboard text via PowerShell."""
    ps = f"Set-Clipboard -Value '{text}'"
    subprocess.run(['powershell', '-Command', ps], capture_output=True, timeout=5)
    time.sleep(0.2)


def keydown(vk): ctypes.windll.user32.keybd_event(vk, 0, 0, 0); time.sleep(0.04)
def keyup(vk):   ctypes.windll.user32.keybd_event(vk, 0, 2, 0); time.sleep(0.04)
def hotkey(mod, key): keydown(mod); keydown(key); keyup(key); keyup(mod)


def paste_and_run(js_code):
    """Paste js_code into console and press Enter."""
    set_clipboard(js_code)
    # Ctrl+A (select all in console), then Ctrl+V (paste), then Enter
    hotkey(0x11, 0x41)  # Ctrl+A
    time.sleep(0.1)
    hotkey(0x11, 0x56)  # Ctrl+V
    time.sleep(0.2)
    keydown(0x0D); keyup(0x0D)  # Enter
    time.sleep(0.3)


def capture(hwnd, filename):
    """Capture full DevTools window, save to OUT_DIR/filename."""
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        mon = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(mon)
        arr = np.array(img)
        brightness = float(arr[:,:,:3].mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename}  brightness={brightness:.1f}")
    return brightness, path


def capture_canvas_only(hwnd, filename, canvas_bounds):
    """Capture only the game canvas region."""
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.5)
    cx, cy, cw, ch = canvas_bounds
    with mss.mss() as sct:
        mon = {"left": cx, "top": cy, "width": cw, "height": ch}
        img = sct.grab(mon)
        arr = np.array(img)
        brightness = float(arr[:,:,:3].mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename}  brightness={brightness:.1f}  (canvas {cw}x{ch})")
    return brightness, path


def main():
    print(f"capture_intro.py — Sprint {args.sprint} / {STORY}")

    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: DevTools window not found"); sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    user32.ShowWindow(hwnd, 9)   # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    print(f"✓ DevTools window: {win_w}x{win_h} at ({r.left},{r.top})")

    # Canvas bounds (calibrated from mss_navigate.py):
    # win-relative physical (14, 137, 974, 290) at 1917x1200
    sx = win_w / 1917.0; sy = win_h / 1200.0
    canvas_abs = (
        r.left + int(14 * sx),
        r.top  + int(137 * sy),
        int(974 * sx),
        int(290 * sy),
    )
    print(f"✓ Canvas: abs({canvas_abs[0]},{canvas_abs[1]}) {canvas_abs[2]}x{canvas_abs[3]}")

    # Console input: bottom of right panel
    # Right panel starts around x = 990 (win-relative)
    # Console input row: y ≈ win_h - 25
    console_x = r.left + int(990 * sx) + int((win_w - int(990 * sx)) / 2)
    console_y = r.top + win_h - 25
    print(f"✓ Console click target: ({console_x},{console_y})")

    freeze_points = [
        (2.0,  f"{STORY}-01-t2s.png",  "t=2s 流星雨"),
        (6.0,  f"{STORY}-02-t6s.png",  "t=6s 星座显现中"),
        (10.0, f"{STORY}-03-t10s.png", "t=10s 完整星座+标题"),
    ]

    for freeze_t, filename, label in freeze_points:
        print(f"\n── {label} ──")

        # Click console input
        sendinput(console_x, console_y)
        time.sleep(0.5)

        # Type JS: set freeze then navigate to intro
        js = f"wx.__introFreezeAt={freeze_t};wx.__navigate('intro');"
        print(f"  JS: {js}")
        paste_and_run(js)
        time.sleep(1.5)   # Wait for intro to render the frozen frame

        # Capture canvas
        b, path = capture_canvas_only(hwnd, filename, canvas_abs)
        if b < 5:
            print("  ⚠ Very dark, retrying...")
            time.sleep(0.5)
            b, path = capture_canvas_only(hwnd, filename, canvas_abs)

        print(f"  → {path} (brightness={b:.1f})")

    print(f"\n✓ Done → {OUT_DIR}/")


if __name__ == '__main__':
    main()
