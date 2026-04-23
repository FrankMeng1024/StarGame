"""
screenshot_gallery.py — 导航到图鉴界面并截图
用法: python scripts/screenshot_gallery.py --sprint N --story STORY-XXXXX

流程:
1. 动态发现 DevTools hwnd
2. 动态扫描游戏画布区域（B通道检测）
3. reload 游戏 → 等待菜单
4. 从控制台日志读取按钮坐标（或用比例推算）
5. 点击"星座图鉴"按钮
6. 截图保存
"""
import sys, os, time, subprocess, json, argparse, ctypes, ctypes.wintypes

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    try: ctypes.windll.user32.SetProcessDPIAware()
    except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss, numpy as np
    from PIL import Image
except ImportError as e:
    print(f"缺少依赖: {e} — 运行: pip install mss pillow numpy")
    sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=48)
parser.add_argument('--story', type=str, default='STORY-00350')
parser.add_argument('--out', type=str, default=None)
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
STORY = args.story

user32 = ctypes.windll.user32


# ─── hwnd 发现 ────────────────────────────────────────────────────
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
                w, h = r.right-r.left, r.bottom-r.top
                if w > 400 and h > 400:
                    candidates.append((hwnd, w*h))
        except: pass
        return True
    P = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(P(cb), 0)
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0] if candidates else None


# ─── 游戏画布动态检测 ─────────────────────────────────────────────
def find_canvas(hwnd):
    """返回 (abs_x, abs_y, w, h) 绝对物理坐标，或 None"""
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx, wy = r.left, r.top
    ww, wh = r.right-r.left, r.bottom-r.top

    with mss.mss() as sct:
        img = sct.grab({"left": wx, "top": wy, "width": ww, "height": wh})
        arr = np.array(img)[:,:,:3][...,::-1]  # RGB

    B_GAME = 40  # 宽松阈值：覆盖 intro/menu 不同背景亮度
    # 垂直扫描：x=260 处 B 通道
    scan_x = min(260, ww//4)
    col_B = arr[:, scan_x, 2].astype(int)
    cy_top = next((y for y in range(55, wh) if col_B[y] > B_GAME), None)
    if cy_top is None:
        return None
    last_blue_y = cy_top
    for y in range(cy_top, min(cy_top+700, wh)):
        if col_B[y] > B_GAME: last_blue_y = y
        elif y > last_blue_y + 15: break
    cy_bottom = last_blue_y
    ch = cy_bottom - cy_top
    if ch < 100: return None

    # 水平扫描：中间行
    mid_y = cy_top + ch//2
    row_B = arr[mid_y, :, 2].astype(int)
    cx_left = next((x for x in range(0, min(200, ww)) if row_B[x] > B_GAME), 0)
    last_blue_x = cx_left
    for x in range(cx_left, min(ww-5, 900)):
        if row_B[x] > B_GAME: last_blue_x = x
        elif x > last_blue_x + 20: break
    cx_right = last_blue_x
    cw = cx_right - cx_left
    if cw < 100: return None

    return (wx + cx_left, wy + cy_top, cw, ch)


# ─── 截图工具 ─────────────────────────────────────────────────────
def capture(canvas_abs, filename):
    """截取游戏画布区域"""
    cx, cy, cw, ch = canvas_abs
    time.sleep(0.8)
    with mss.mss() as sct:
        img = sct.grab({"left": cx, "top": cy, "width": cw, "height": ch})
        arr = np.array(img)
        brightness = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename} brightness={brightness:.1f} ({cw}x{ch})")
    return brightness, path


# ─── 点击工具 ─────────────────────────────────────────────────────
def click_abs(ax, ay, label=""):
    """绝对物理坐标点击"""
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    nx = int((ax - vx) * 65535 / vw)
    ny = int((ay - vy) * 65535 / vh)

    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),
                    ('mouseData',ctypes.c_ulong),('dwFlags',ctypes.c_ulong),
                    ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi', MI)]
        _anonymous_ = ('_u',)
        _fields_ = [('type', ctypes.c_ulong), ('_u', _U)]

    F_MOVE = 0x0001; F_DOWN = 0x0002; F_UP = 0x0004
    F_ABS  = 0x8000; F_VDESK = 0x4000

    for flags, extra in [(F_MOVE|F_ABS|F_VDESK, 0), (F_DOWN|F_ABS|F_VDESK, 0), (F_UP|F_ABS|F_VDESK, 0)]:
        inp = INPUT(type=0); inp.mi.dx = nx; inp.mi.dy = ny; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.07)

    if label: print(f"  🖱  {label} @ abs({ax},{ay})")


def click_ratio(canvas_abs, rx, ry, label=""):
    """按画布比例点击"""
    cx, cy, cw, ch = canvas_abs
    ax = cx + int(cw * rx)
    ay = cy + int(ch * ry)
    click_abs(ax, ay, label)


# ─── 主流程 ───────────────────────────────────────────────────────
def main():
    print(f"screenshot_gallery.py — Sprint {args.sprint} / {STORY}")

    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: 未找到 wechatdevtools.exe"); sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    # 前台显示
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    # 获取窗口坐标
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx, wy, ww, wh = r.left, r.top, r.right-r.left, r.bottom-r.top
    print(f"  窗口: ({wx},{wy}) {ww}x{wh}")

    # Reload 游戏 — 工具栏 ↺ 按钮在 "Ordinary Compilation" 右侧
    # 从截图校准: 工具栏第二行 y≈51, reload按钮 x≈665 (1920x1200窗口相对)
    reload_rx = 665.0 / 1920.0  # 比例
    reload_ry = 51.0 / 1200.0
    reload_x = wx + int(ww * reload_rx)
    reload_y = wy + int(wh * reload_ry)
    click_abs(reload_x, reload_y, "↺ reload")
    print("  等待 intro 动画 + 菜单 (22s)...")
    time.sleep(22)

    # 游戏画布（从截图校准，1920x1200窗口）:
    # 左上: (18, 100), 右下: (710, 428) → w=692, h=328
    canvas_rx, canvas_ry = 18.0/1920, 100.0/1200
    canvas_rw, canvas_rh = 692.0/1920, 328.0/1200
    canvas = (
        wx + int(ww * canvas_rx),
        wy + int(wh * canvas_ry),
        int(ww * canvas_rw),
        int(wh * canvas_rh),
    )
    cx, cy, cw, ch = canvas
    print(f"✓ 画布 (比例校准): ({cx},{cy}) {cw}x{ch}")

    # 尝试动态检测 canvas 覆盖静态值（B≥40 更宽松）
    dynamic = find_canvas(hwnd)
    if dynamic and dynamic[2] > 200 and dynamic[3] > 150:
        canvas = dynamic
        cx, cy, cw, ch = canvas
        print(f"✓ 画布 (动态检测): ({cx},{cy}) {cw}x{ch}")

    # 聚焦模拟器（点中心安全区域）
    click_ratio(canvas, 0.30, 0.40, "聚焦模拟器")
    time.sleep(1.0)

    # 如果还在 intro 动画，点击"轻触跳过"（右下角约 ratio(0.94, 0.90)）
    click_ratio(canvas, 0.94, 0.90, "轻触跳过 (intro skip)")
    time.sleep(2.0)

    # Step 1: 截图菜单
    brightness, _ = capture(canvas, f"{STORY}-01-menu.png")
    if brightness < 10:
        print("ERROR: 菜单截图全黑"); sys.exit(1)

    # Step 2: 点击"星座图鉴"
    # 菜单按钮垂直分布：
    #   挑战关卡 ratio ≈ (0.50, 0.59)   ← 已知从 mss_navigate
    #   星座图鉴 ratio ≈ (0.50, 0.70)   ← 第二个按钮，间距约11%
    #   道具商店 ratio ≈ (0.50, 0.81)   ← 第三个按钮
    # 从菜单截图控制台日志验证：
    #   btn=gallery x=533 y=175 w=248 h=35 (game internal ~667x375)
    #   gallery center game_y = 175+17.5 = 192.5 → ratio = 192.5/375 = 0.513
    #   但截图里视觉上挑战关卡≈0.59，图鉴≈0.70，商店≈0.81
    # 用游戏内部坐标精确计算（来自控制台日志）:
    #   game canvas size: 667x375 (WeChat landscape default)
    #   btn=gallery y=175 h=35 → center_y=192.5 → ratio_y = 192.5/375 = 0.513 ← 不对
    #
    # 实际上控制台日志的坐标是 game.js 里按钮定义的坐标系。
    # 从截图目测："星座图鉴"在画布高度约70%处。
    # 用 mss_navigate 里的 level-select 坐标反推：
    #   挑战关卡 0.610 → 图鉴约 0.610+0.105=0.715 → 商店约0.820
    click_ratio(canvas, 0.668, 0.715, "星座图鉴")
    time.sleep(3.0)

    # Step 3: 截图图鉴界面
    brightness, path = capture(canvas, f"{STORY}-02-gallery.png")
    if brightness < 10:
        print("ERROR: 图鉴截图全黑"); sys.exit(1)
    print(f"✓ 图鉴截图已保存: {path}")

    # Step 4: 等待一下（图鉴有动画），再截一张
    time.sleep(2.0)
    capture(canvas, f"{STORY}-03-gallery-animated.png")

    print("\n✓ 完成")
    sys.exit(0)


if __name__ == '__main__':
    main()
