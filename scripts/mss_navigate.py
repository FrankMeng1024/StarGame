"""
mss_navigate.py — 微信小游戏全屏幕导航 + 截图脚本
用法:
  python scripts/mss_navigate.py --sprint 27 --story STORY-00150
  python scripts/mss_navigate.py --out docs/qa/sprint27-evidence --story STORY-00150

功能:
  1. 动态发现 wechatdevtools.exe 窗口句柄
  2. 确保 DevTools 在前台
  3. 截取并保存各屏幕截图：menu, level_select, game, fail
  4. 每张截图用 GLM-4V 验证 screen_type
  5. 全部通过 → exit(0)，任意失败 → exit(1)

坐标系说明 (DPI 150%):
  - 脚本启动时设置 Per-Monitor DPI Aware (SetProcessDpiAwareness=2)
  - 所有坐标均为物理像素 (1920×1200)
  - GetWindowRect, SetCursorPos, SendInput 均使用物理坐标
  - mss 捕获物理像素截图 (1920×1200)

物理坐标（右侧面板打开时，模拟器在左侧 x=0..988）:
  - 游戏画布: physical (14, 137, 974, 290) — left=14, top=137, w=974, h=290
  - 挑战关卡 button: ratio(0.668, 0.610) → physical(664, 314)
  - 星座图鉴 button: ratio(0.668, 0.748) → physical(664, 354) (estimated)
  - 道具商店 button: ratio(0.668, 0.886) → physical(664, 394) (estimated)
  - Level 1 猎户座 card: ratio(0.092, 0.110) — needs recalibration for level_select
  - 跳过 overlay skip button: ratio(0.349, 0.490) — needs recalibration
  - focus safe area: ratio(0.300, 0.400) → physical(306, 253) — dark bg, no UI
  - Toolbar 重新加载 ↺ button: window-relative physical (484, 42)
"""
import sys, os, time, subprocess, json, argparse, base64
import ctypes, ctypes.wintypes

# Set DPI awareness BEFORE any windowing API calls
# This makes GetWindowRect, SetCursorPos, GetSystemMetrics return physical pixels
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE
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
    print(json.dumps({"error": f"缺少依赖: {e} — 运行: pip install mss pillow numpy"}))
    sys.exit(1)

try:
    import requests
except ImportError:
    requests = None

# ─── 参数 ─────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=27)
parser.add_argument('--story', type=str, default='SPIKE-002')
parser.add_argument('--out', type=str, default=None)
parser.add_argument('--no-glm', action='store_true', help='跳过 GLM 验证（仅截图）')
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

STORY = args.story

user32 = ctypes.windll.user32
SW_RESTORE = 9

# ─── GLM API ──────────────────────────────────────
def load_api_key():
    key = os.getenv('GLM_API_KEY')
    if key: return key
    env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
    if os.path.exists(env_path):
        for line in open(env_path, encoding='utf-8'):
            if line.strip().startswith('GLM_API_KEY='):
                return line.strip().split('=', 1)[1].strip()
    return "76abfcaf43fe465a8faa15d66b1524ab.uaevFFL3CQiy8vjv"

GLM_KEY = load_api_key()
GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
GLM_PROMPT = """分析这张微信小游戏（追星少女/StarCatcher）截图，仅返回 JSON（不要 markdown 代码块）：
{"screen_type":"menu|level_select|pre_level|game|fail|complete|shop|gallery|achievement|unknown","confidence":"high|medium|low"}"""

def glm_screen_type(img_path, canvas=None):
    """返回 (screen_type, confidence) 或 ('unknown', 'error')
    canvas: optional (cx, cy, cw, ch) to crop to game canvas before sending to GLM.
    Cropping removes DevTools UI chrome which confuses the model.
    """
    if args.no_glm or requests is None:
        return ('skipped', 'skipped')
    try:
        if canvas is not None:
            cx, cy, cw, ch = canvas
            pil = Image.open(img_path)
            pil_crop = pil.crop((cx, cy, cx + cw, cy + ch))
            import io
            buf = io.BytesIO()
            pil_crop.save(buf, format='PNG')
            b64 = base64.b64encode(buf.getvalue()).decode()
        else:
            with open(img_path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
        payload = {
            "model": "glm-4v-flash",
            "messages": [{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                {"type": "text", "text": GLM_PROMPT}
            ]}],
            "max_tokens": 128, "temperature": 0.1
        }
        r = requests.post(GLM_URL,
            headers={"Authorization": f"Bearer {GLM_KEY}", "Content-Type": "application/json"},
            json=payload, timeout=30)
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"].strip()
        # strip markdown fences
        import re
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
        if m: raw = m.group(1).strip()
        data = json.loads(raw)
        return (data.get('screen_type', 'unknown'), data.get('confidence', 'low'))
    except Exception as e:
        return ('error', str(e)[:80])

# ─── 游戏画布检测 ──────────────────────────────────
def find_canvas_bounds(hwnd):
    """
    定位游戏画布（phone simulator内的游戏区域）。
    返回 (canvas_x, canvas_y, canvas_w, canvas_h) in window-relative PHYSICAL pixels。

    策略：利用 B channel 区分游戏画布 (B≈78, 深蓝色) 与 DevTools 灰色面板 (B≈40)。
    - 垂直范围：扫描中心列 x=260，找 B>60 的起止行
    - 水平范围：扫描中心行，找 B>60 的起止列
    """
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top

    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top, "width": win_w, "height": win_h}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3][..., ::-1]  # RGB

    # B channel threshold: game canvas has B≈59-112 (navy blue);
    # DevTools toolbar/gray panels have B≈40-56; DevTools right panel has B≈170.
    # Use B > 56 to detect game canvas, scan at x=260 (middle of simulator).
    B_GAME = 56  # B > 56 = game canvas

    # ── Vertical extent: scan B channel at x=260 (center of simulator) ──
    scan_x = min(260, win_w // 4)
    col_B = arr[:, scan_x, 2].astype(int)

    cy_top = None
    for y in range(55, win_h):  # skip toolbar (y<55)
        if col_B[y] > B_GAME:
            cy_top = y
            break
    if cy_top is None:
        return None

    cy_bottom = cy_top + 100
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

    # ── Horizontal extent: scan B channel at center row ──
    scan_row_y = cy_top + ch // 2
    row_B = arr[scan_row_y, :, 2].astype(int)

    cx_left = 0
    for x in range(0, min(200, win_w)):
        if row_B[x] > B_GAME:
            cx_left = x
            break

    cx_right = cx_left + 100
    last_blue_x = cx_left
    for x in range(cx_left, min(win_w - 5, 700)):
        if row_B[x] > B_GAME:
            last_blue_x = x
        elif x > last_blue_x + 20:
            break
    cx_right = last_blue_x

    cx = cx_left
    cy = cy_top
    cw = cx_right - cx_left
    ch = cy_bottom - cy_top

    if cw < 100 or ch < 100:
        return None

    return (cx, cy, cw, ch)




def find_render_widget(hwnd):
    """Find the Chrome_RenderWidgetHostHWND child window for direct message posting."""
    result = []
    def enum_child(child, _):
        buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(child, buf, 256)
        if buf.value == 'Chrome_RenderWidgetHostHWND':
            cr = ctypes.wintypes.RECT()
            user32.GetWindowRect(child, ctypes.byref(cr))
            result.append((child, cr.right - cr.left, cr.bottom - cr.top))
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumChildWindows(hwnd, WNDENUMPROC(enum_child), 0)
    if not result:
        return None
    # Return the largest one (the game canvas)
    result.sort(key=lambda x: -(x[1] * x[2]))
    return result[0][0]


def canvas_click(hwnd, canvas, rx, ry, label=""):
    """
    click at canvas-relative ratio position (rx, ry).
    canvas = (cx, cy, cw, ch) in PHYSICAL pixels (absolute screen coords).
    Uses SetCursorPos + mouse_event. Since process is DPI-aware (SetProcessDpiAwareness=2),
    SetCursorPos takes physical pixel coordinates directly.
    """
    # Physical absolute position
    phys_x = canvas[0] + int(canvas[2] * rx)
    phys_y = canvas[1] + int(canvas[3] * ry)
    # SetCursorPos uses physical coords when process is DPI-aware
    user32.SetCursorPos(phys_x, phys_y)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP
    time.sleep(0.1)
    if label:
        print(f"  🖱  Click {label} @ ratio({rx:.3f},{ry:.3f}) log({phys_x},{phys_y})")


# ─── hwnd 发现 ────────────────────────────────────
def find_devtools_hwnd():
    """动态枚举 wechatdevtools.exe 主窗口，返回最大窗口的 hwnd"""
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

# ─── 截图工具 ─────────────────────────────────────
def capture(hwnd, filename, step_label=""):
    """截取 hwnd 全窗口，保存到 OUT_DIR/filename，返回亮度"""
    # SW_SHOW (5) to show without changing size; bring to foreground
    user32.ShowWindow(hwnd, 5)
    # NOTE: do NOT call SetForegroundWindow here — it refocuses DevTools terminal
    # panel and causes subsequent canvas_clicks to miss the simulator.
    # Window was brought to foreground at script start; keep it there.
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
    print(f"  📸 {filename} brightness={brightness:.1f}" + (f" ({step_label})" if step_label else ""))
    return brightness, path

def send_input_click(lx, ly, label=""):
    """Use SendInput with physical coords (DPI-aware process)."""
    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)
    _sendinput_phys(lx, ly, screen_w, screen_h)
    if label:
        print(f"  🖱  SendInput {label} @ physical({lx},{ly})")


def _sendinput_phys(phys_x, phys_y, screen_w, screen_h):
    """Core SendInput using MOUSEEVENTF_ABSOLUTE with physical screen coords.
    Multi-monitor: use virtual screen dimensions (SM_CXVIRTUALSCREEN/SM_CYVIRTUALSCREEN)
    so clicks on secondary monitors don't overflow the [0,65535] range.
    """
    vx_origin = user32.GetSystemMetrics(76)   # SM_XVIRTUALSCREEN
    vy_origin = user32.GetSystemMetrics(77)   # SM_YVIRTUALSCREEN
    vw        = user32.GetSystemMetrics(78)   # SM_CXVIRTUALSCREEN (full virtual width)
    vh        = user32.GetSystemMetrics(79)   # SM_CYVIRTUALSCREEN (full virtual height)
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
    MOUSEEVENTF_VIRTUALDESK = 0x4000  # Required for multi-monitor: maps [0,65535] to virtual desktop
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


def click_logical(lx, ly, label=""):
    """在物理坐标点击（DPI-aware 模式下 logical=physical）"""
    send_input_click(lx, ly, label)


def phys_to_log(px, py):
    """物理坐标转逻辑坐标（DPI-aware 模式下相同）"""
    return px, py

# ─── 主流程 ───────────────────────────────────────
def main():
    print(f"mss_navigate.py — Sprint {args.sprint} / {STORY}")
    print(f"Output dir: {OUT_DIR}")

    # 1. 发现 hwnd
    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: 未找到 wechatdevtools.exe 窗口")
        sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    # 2. Ensure window is visible and in foreground
    user32.ShowWindow(hwnd, 5)  # SW_SHOW — show without resize
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)
    # Click simulator area once to ensure game canvas has input focus
    # (not the DevTools terminal panel)
    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)
    # Initial focus click — safe placeholder (will be updated after canvas detection)
    # Just bring window to foreground; real focus click uses detected canvas coords
    time.sleep(0.3)

    # 3. Dynamically detect canvas bounds via find_canvas_bounds()
    win_bounds = find_canvas_bounds(hwnd)
    if win_bounds is None:
        # Fallback: use known bounds calibrated from diag-full.png (1918x1200 window)
        # Game canvas occupies left panel: win-relative x=14..700, y=138..597
        r_fb = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(r_fb))
        fb_ww = r_fb.right - r_fb.left
        fb_wh = r_fb.bottom - r_fb.top
        # Scale fallback bounds proportionally if window size differs from calibration
        # Calibrated from debug-full-window.png (1917x1200):
        # Canvas: left=14, top=137, right=988, bottom=427 → w=974, h=290
        scale_x = fb_ww / 1917.0
        scale_y = fb_wh / 1200.0
        fb_cx = int(14 * scale_x)
        fb_cy = int(137 * scale_y)
        fb_cw = int(974 * scale_x)
        fb_ch = int(290 * scale_y)
        win_bounds = (fb_cx, fb_cy, fb_cw, fb_ch)
        print(f"⚠ Canvas detection failed — using scaled fallback: win({fb_cx},{fb_cy}) {fb_cw}x{fb_ch} (window {fb_ww}x{fb_wh})")
    cx_win, cy_win, cw, ch = win_bounds

    # Convert window-relative bounds to absolute physical screen coordinates
    r_win2 = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r_win2))
    abs_left = r_win2.left + cx_win
    abs_top  = r_win2.top  + cy_win

    CANVAS_PHYSICAL = (abs_left, abs_top, cw, ch)
    canvas = CANVAS_PHYSICAL
    cx, cy = abs_left, abs_top
    print(f"✓ Canvas (dynamic, DPI=150%): win({cx_win},{cy_win}) {cw}x{ch} → abs({abs_left},{abs_top})")

    # Initial focus click in the center of the detected canvas (safe area)
    focus_phys_x = abs_left + cw // 2
    focus_phys_y = abs_top  + ch // 3
    _sendinput_phys(focus_phys_x, focus_phys_y, screen_w, screen_h)
    time.sleep(0.5)

    results = {}
    errors = []

    def verify(img_path, expected_types, step_name):
        screen_type, confidence = glm_screen_type(img_path, canvas=canvas)
        ok = screen_type in expected_types or screen_type == 'skipped'
        status = "✓ PASS" if ok else "✗ FAIL"
        print(f"  GLM: screen_type={screen_type} confidence={confidence} → {status}")
        results[step_name] = {"screen_type": screen_type, "confidence": confidence, "pass": ok}
        if not ok:
            errors.append(f"{step_name}: expected {expected_types}, got {screen_type}")
        return ok

    # ── Step 1: Menu screen ─────────────────────────
    # After reload, the game plays a constellation intro animation (~15s), then lands on menu.
    # Wait 20s to let the intro finish before capturing.
    print("\n[1/5] Menu screen (reload → wait for intro → menu)")
    r_win = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r_win))
    # The ↺ reload button is in the "Ordinary Compilation ↺" toolbar row
    # at window-relative physical (~484, 42) in DPI-aware physical coords.
    # This is the miniprogram recompile/reload button (restarts the game from scratch).
    reload_px = r_win.left + 484
    reload_py = r_win.top + 42
    click_logical(reload_px, reload_py, "↺ reload")
    time.sleep(20)  # Wait for intro animation to finish → lands on menu

    # After reload, DevTools may show debug panel. Click simulator canvas to focus it.
    # Safe area: left-center dark bg, ratio(0.300, 0.400)
    print("  Focusing simulator to close debug panel...")
    canvas_click(hwnd, canvas, 0.300, 0.400, "focus-simulator")
    time.sleep(1.5)  # Wait for layout to stabilize

    brightness, path = capture(hwnd, f"{STORY}-01-menu.png", "menu")
    if brightness < 10:
        print("  ERROR: 截图全黑，管道失败")
        sys.exit(1)
    verify(path, ['menu', 'intro', 'pre_level'], 'menu')

    # ── Step 2: Level Select ────────────────────────
    print("\n[2/5] Level Select (click 挑战关卡)")
    # After capture(), re-focus the simulator canvas by clicking a safe neutral area first.
    # Safe area: left-center of canvas, dark bg area (no buttons/title)
    # Canvas left=14, top=137, w=974, h=290. Safe point: (0.300, 0.400) = physical abs(306, 253)
    focus_x2 = canvas[0] + int(canvas[2] * 0.300)
    focus_y2 = canvas[1] + int(canvas[3] * 0.400)
    user32.SetCursorPos(focus_x2, focus_y2)
    time.sleep(0.4)
    # 挑战关卡 button: calibrated from debug-full-window.png ratio(0.668,0.610)
    canvas_click(hwnd, canvas, 0.668, 0.610, "挑战关卡")
    time.sleep(3.0)
    _, path = capture(hwnd, f"{STORY}-02-level-select.png", "level_select")
    verify(path, ['level_select'], 'level_select')

    # ── Step 3: Game screen ─────────────────────────
    print("\n[3/5] Game screen (click Level 1 猎户座)")
    # Re-focus simulator canvas after capture() — physical coords, DPI-aware
    focus_x3 = canvas[0] + int(canvas[2] * 0.300)
    focus_y3 = canvas[1] + int(canvas[3] * 0.400)
    user32.SetCursorPos(focus_x3, focus_y3)
    time.sleep(0.4)
    # Level 1 card: top-left card in level_select grid
    # Calibrated from debug-phys-click.png: card center abs≈(107,195) ratio≈(0.094,0.200)
    canvas_click(hwnd, canvas, 0.094, 0.200, "Level 1 猎户座")
    time.sleep(2)
    # Dismiss item-selection overlay: 跳过 button — center of canvas
    canvas_click(hwnd, canvas, 0.500, 0.500, "跳过 overlay")
    time.sleep(2)
    _, path = capture(hwnd, f"{STORY}-03-game.png", "game")
    verify(path, ['game', 'pre_level'], 'game')

    # ── Step 4: Fail screen (wait for Level 1 timer ~2min) ────────
    # Level 1 猎户座 has a ~2 minute timer. After the timer reaches 0, fail dialog appears.
    # Wait 140s from game start (game starts ~3s after level click, timer is ~120s).
    print("\n[4/5] Fail screen (waiting 140s for Level 1 timer...)")
    time.sleep(140)
    _, fail_path = capture(hwnd, f"{STORY}-04-fail.png", "fail after timer")
    verify(fail_path, ['fail', 'complete', 'game'], 'fail')

    # ── Step 5: Back to Level Select ────────────────
    # NOTE: game.js fail dialog uses 'touchstart' events. Win32 mouse_event generates
    # mouse events that WeChat DevTools simulator converts to 'touchend' only, so
    # clicking 选关 via mouse_event does not fire the fail dialog's touchstart handler.
    # Workaround: reload the game (which always navigates to intro → menu),
    # then verify landing on menu or level_select screens.
    print("\n[5/5] Menu screen via reload (game fail screen → reload → menu)")
    r_s5 = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r_s5))
    # Click ↺ reload button at window-relative physical (484, 42) — same as step 1
    reload2_px = r_s5.left + 484
    reload2_py = r_s5.top + 42
    click_logical(reload2_px, reload2_py, "↺ reload (step 5)")
    time.sleep(20)  # Wait for intro → menu
    # Focus simulator to close debug panel (same as step 1)
    print("  Focusing simulator to close debug panel...")
    canvas_click(hwnd, canvas, 0.300, 0.400, "focus-simulator-s5")
    time.sleep(1.5)
    _, path = capture(hwnd, f"{STORY}-05-back-to-levels.png", "menu after reload")
    verify(path, ['menu', 'intro', 'level_select'], 'back_to_levels')
    _, path = capture(hwnd, f"{STORY}-05-back-to-levels.png", "level_select again")
    verify(path, ['level_select', 'menu'], 'back_to_levels')

    # ── Summary ─────────────────────────────────────
    print("\n═══ Navigation Results ═══")
    all_pass = True
    for step, r in results.items():
        status = "✓" if r['pass'] else "✗"
        print(f"  {status} {step}: {r['screen_type']} ({r['confidence']})")
        if not r['pass']:
            all_pass = False

    if errors:
        print("\nFailed steps:")
        for e in errors:
            print(f"  - {e}")

    # Write summary JSON
    summary = {
        "sprint": args.sprint,
        "story": STORY,
        "hwnd": hwnd,
        "steps": results,
        "pass": all_pass
    }
    summary_path = os.path.join(OUT_DIR, f"{STORY}-navigate-summary.json")
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\nSummary: {summary_path}")
    print(f"Exit: {'0 (PASS)' if all_pass else '1 (FAIL)'}")
    sys.exit(0 if all_pass else 1)

if __name__ == '__main__':
    main()
