"""
sprint34_capture.py — Sprint 34-mini 证据截图脚本
截取：menu, level_select, game, fail, gallery_list, gallery_detail

使用 mss_check.py 相同的模拟器区域公式，避免全窗口截图问题。
"""
import ctypes, ctypes.wintypes, time, os, sys, subprocess, argparse, json
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss, mss.tools
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"[FAIL] 缺少依赖: {e} — pip install mss pillow numpy")
    sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--out', type=str, default='docs/qa/sprint34-mini-evidence')
parser.add_argument('--mode', type=str, default='all',
                    help='all | menu | gallery | fail | victory')
args = parser.parse_args()

OUT_DIR = args.out
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)


def find_devtools():
    found = []
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = subprocess.run(['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
                capture_output=True, text=True, timeout=2, encoding='utf-8', errors='ignore')
            if 'wechatdevtools' in proc.stdout.lower():
                title_buf = ctypes.create_unicode_buffer(256)
                user32.GetWindowTextW(hwnd, title_buf, 256)
                if title_buf.value:
                    found.append((hwnd, title_buf.value))
        except Exception:
            pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return found[0] if found else None


def get_sim_region(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx, wy = r.left, r.top
    ww = r.right - r.left
    wh = r.bottom - r.top
    # Calibrated from devtools-full.png analysis (2026-04-20):
    # Game simulator (landscape) is left panel: x=22..517, y=70..400 in 1620x1200 DevTools
    sim_x = int(wx + ww * 0.014)   # 22/1620 ≈ 0.014
    sim_y = int(wy + wh * 0.058)   # 70/1200 ≈ 0.058
    sim_w = int(ww * 0.306)        # 495/1620 ≈ 0.306  (add 25px margin → 520/1620=0.321)
    sim_h = int(wh * 0.275)        # 330/1200 ≈ 0.275
    return (sim_x, sim_y, sim_w, sim_h)


def capture_sim(hwnd, filename, label=""):
    sim_x, sim_y, sim_w, sim_h = get_sim_region(hwnd)
    path = os.path.join(OUT_DIR, filename)
    for attempt in range(1, 4):
        with mss.mss() as sct:
            region = {"top": sim_y, "left": sim_x, "width": sim_w, "height": sim_h}
            img = sct.grab(region)
            mss.tools.to_png(img.rgb, img.size, output=path)
        pil_rgb = Image.open(path).convert('RGB')
        brightness = float(np.array(pil_rgb).mean())
        print(f"  📸 {filename} brightness={brightness:.1f}" + (f" ({label})" if label else ""))
        if brightness > 10:
            return path, brightness
        print(f"  ⚠ 全黑，重试 {attempt}/3...")
        time.sleep(2)
    print(f"  ✗ 截图全黑，失败: {filename}")
    return path, 0.0


def sendinput_phys(phys_x, phys_y):
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
        class _I(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_i',)
        _fields_ = [('type', ctypes.c_ulong), ('_i', _I)]

    MOVE = 0x0001; DOWN = 0x0002; UP = 0x0004; ABS = 0x8000; VDESK = 0x4000
    for flags in [MOVE | ABS | VDESK, DOWN | ABS | VDESK, None, UP | ABS | VDESK]:
        if flags is None:
            time.sleep(0.05)
            continue
        inp = INPUT(type=0)
        inp.mi.dx = norm_x; inp.mi.dy = norm_y; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.08)


def click_ratio(hwnd, rx, ry, label=""):
    sim_x, sim_y, sim_w, sim_h = get_sim_region(hwnd)
    px = sim_x + int(sim_w * rx)
    py = sim_y + int(sim_h * ry)
    sendinput_phys(px, py)
    if label:
        print(f"  🖱 Click {label} @ ratio({rx:.3f},{ry:.3f}) → physical({px},{py})")
    time.sleep(0.3)


def click_reload(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    reload_px = r.left + 484
    reload_py = r.top + 42
    sendinput_phys(reload_px, reload_py)
    print(f"  🖱 Click ↺ reload @ physical({reload_px},{reload_py})")


def main():
    result = find_devtools()
    if not result:
        print("[FAIL] 未找到 wechatdevtools.exe")
        sys.exit(1)
    hwnd, title = result
    print(f"✓ hwnd={hwnd} title='{title}'")

    # Bring to foreground without moving to primary screen
    user32.ShowWindow(hwnd, 9)   # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    sim_x, sim_y, sim_w, sim_h = get_sim_region(hwnd)
    print(f"✓ Simulator region: ({sim_x},{sim_y}) {sim_w}x{sim_h}")

    mode = args.mode

    # ── Reload to get fresh menu ────────────────────
    if mode in ('all', 'menu'):
        print("\n[1] 重新加载 → 等待 intro → menu")
        click_reload(hwnd)
        time.sleep(22)
        # Focus simulator canvas to dismiss any debug panel
        click_ratio(hwnd, 0.5, 0.3, "focus-sim")
        time.sleep(1.5)
        capture_sim(hwnd, "STORY-00313-01-menu.png", "menu after STORY-00313 fix")
        capture_sim(hwnd, "STORY-00314-01-menu.png", "menu fresh")

    # ── Level select ────────────────────────────────
    if mode in ('all', 'menu'):
        print("\n[2] 挑战关卡 → level select")
        # 挑战关卡 button at ratio(0.750, 0.299) in canvas, but canvas is ~top 40% of sim
        # In the simulator region (437x936): game landscape is top portion
        # Landscape 974x434 within sim. Game buttons are in right panel.
        # Calibrated from pixel analysis 2026-04-20:
        # 挑战关卡 button center at ~(455, 115) in 520x330 sim → ratio(0.875, 0.348)
        click_ratio(hwnd, 0.5, 0.3, "focus before click")
        time.sleep(0.3)
        click_ratio(hwnd, 0.875, 0.348, "挑战关卡 button")
        time.sleep(3.0)
        capture_sim(hwnd, "STORY-00314-02-level-select.png", "level select")

    # ── Game screen ─────────────────────────────────
    if mode in ('all', 'menu'):
        print("\n[3] Level 1 猎户座 → game")
        click_ratio(hwnd, 0.5, 0.3, "focus")
        time.sleep(0.3)
        # Level 1 card (猎户座) is top-left card in the grid
        click_ratio(hwnd, 0.09, 0.22, "Level 1 猎户座 card")
        time.sleep(2.5)
        # Skip item overlay (center of screen)
        click_ratio(hwnd, 0.50, 0.50, "跳过 overlay")
        time.sleep(2.0)
        capture_sim(hwnd, "STORY-00314-03-game.png", "game screen")

    # ── Fail screen (wait for timer) ─────────────────
    if mode in ('all', 'fail'):
        print("\n[4] 等待 145s → fail screen")
        time.sleep(145)
        capture_sim(hwnd, "STORY-00314-04-fail.png", "fail screen")

    # ── Gallery via reload → menu → 星座图鉴 ─────────
    if mode in ('all', 'gallery'):
        if mode == 'gallery':
            print("\n[G0] 重新加载 → menu for gallery")
            click_reload(hwnd)
            time.sleep(22)
            click_ratio(hwnd, 0.5, 0.3, "focus-sim")
            time.sleep(1.5)

        print("\n[G1] 星座图鉴 → gallery list")
        click_ratio(hwnd, 0.5, 0.3, "focus")
        time.sleep(0.3)
        # 星座图鉴 button at ~(455, 153) in 520x330 → ratio(0.875, 0.464)
        click_ratio(hwnd, 0.875, 0.464, "星座图鉴 button")
        time.sleep(3.0)
        capture_sim(hwnd, "STORY-00315-01-gallery-list.png", "gallery list")

        print("\n[G2] 猎户座 card → gallery detail")
        click_ratio(hwnd, 0.5, 0.3, "focus")
        time.sleep(0.3)
        # First constellation card top-left area of gallery grid
        click_ratio(hwnd, 0.20, 0.25, "猎户座 card")
        time.sleep(3.0)
        capture_sim(hwnd, "STORY-00315-02-gallery-detail.png", "gallery detail")

    print("\n✓ Sprint 34 截图完成")
    sys.exit(0)

if __name__ == '__main__':
    main()
