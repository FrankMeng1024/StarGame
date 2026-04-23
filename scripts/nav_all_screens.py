"""
nav_all_screens.py — 每次 reload + 导航到单个界面，截图后退出。
不依赖返回导航，彻底绕开 canvas 焦点劫持问题。

策略（每次调用）：
  1. 读取 calibration.json（或动态发现窗口）
  2. 临时 patch game.js: intro → menu
  3. 点击 ↺ reload，等待编译完成（默认 15s）
  4. 根据 --screen 参数，点击对应按钮导航到目标界面
  5. 截图 → 恢复 game.js

用法：
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen menu
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen gallery
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen gallery_detail
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen shop
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen levels
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen game
  python scripts/nav_all_screens.py --sprint 56 --story STORY-00350 --screen all

--screen all: 依次截所有界面（每次都重 reload），相当于连续调用 6 次。

--cal: 指定 calibration.json 路径。默认读 docs/qa/sprintN-mini-evidence/calibration.json。
       如果不存在，先自动运行 calibrate.py。

--wait: reload 等待秒数（默认 15s）。
"""
import ctypes, ctypes.wintypes, mss, subprocess, time, os, json, argparse, sys, re, base64
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

try:
    import requests
except ImportError:
    requests = None

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=56)
parser.add_argument('--story', type=str, default='STORY-00350')
parser.add_argument('--out', type=str, default=None)
parser.add_argument('--no-glm', action='store_true')
parser.add_argument('--screen', type=str, default='all',
    help='menu | gallery | gallery_detail | shop | levels | game | all')
parser.add_argument('--cal', type=str, default=None, help='calibration.json 路径')
parser.add_argument('--wait', type=int, default=15, help='reload 等待秒数')
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
STORY = args.story

user32 = ctypes.windll.user32

# ── GLM ───────────────────────────────────────────────────────────
def load_api_key():
    key = os.getenv('GLM_API_KEY')
    if key: return key
    env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
    if os.path.exists(env_path):
        for line in open(env_path, encoding='utf-8'):
            if line.strip().startswith('GLM_API_KEY='): return line.strip().split('=',1)[1].strip()
    return "76abfcaf43fe465a8faa15d66b1524ab.uaevFFL3CQiy8vjv"

GLM_KEY = load_api_key()
GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
GLM_PROMPT = """分析这张微信小游戏（追星少女/StarCatcher）截图，仅返回 JSON（不要 markdown 代码块）：
{"screen_type":"menu|level_select|pre_level|game|fail|complete|shop|gallery|unknown","confidence":"high|medium|low"}"""

def glm_check(img_path):
    if args.no_glm or requests is None: return ('skipped', 'skipped')
    try:
        b64 = base64.b64encode(open(img_path, 'rb').read()).decode()
        payload = {"model": "glm-4v-flash", "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": GLM_PROMPT}]}], "max_tokens": 128, "temperature": 0.1}
        r = requests.post(GLM_URL, headers={"Authorization": f"Bearer {GLM_KEY}",
            "Content-Type": "application/json"}, json=payload, timeout=30)
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"].strip()
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
        if m: raw = m.group(1).strip()
        data = json.loads(raw)
        return (data.get('screen_type', 'unknown'), data.get('confidence', 'low'))
    except Exception as e:
        return ('error', str(e)[:80])

# ── game.js patch ─────────────────────────────────────────────────
GAME_JS = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'miniprogram', 'game.js'))

def patch_gamejs():
    content = open(GAME_JS, 'r', encoding='utf-8').read()
    if "TEMP-NAV" in content:
        print("  ⚠ game.js 已是 patch 状态", flush=True); return False
    new = content.replace("navigate('intro');", "navigate('menu');  // TEMP-NAV", 1)
    if new == content:
        print("  ⚠ patch 目标未找到（可能已修改）", flush=True); return False
    open(GAME_JS, 'w', encoding='utf-8').write(new)
    print("  ✓ game.js patched: intro→menu", flush=True); return True

def restore_gamejs():
    content = open(GAME_JS, 'r', encoding='utf-8').read()
    new = content.replace("navigate('menu');  // TEMP-NAV", "navigate('intro');", 1)
    open(GAME_JS, 'w', encoding='utf-8').write(new)
    print("  ✓ game.js restored", flush=True)

# ── SendInput ─────────────────────────────────────────────────────
def sendinput(phys_x, phys_y, skip_move=False):
    vx = user32.GetSystemMetrics(76)
    vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78)
    vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw)
    ny = int((phys_y - vy) * 65535 / vh)

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', ctypes.c_long), ('dy', ctypes.c_long),
                    ('mouseData', ctypes.c_ulong), ('dwFlags', ctypes.c_ulong),
                    ('time', ctypes.c_ulong), ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi', MOUSEINPUT)]
        _anonymous_ = ('_u',)
        _fields_ = [('type', ctypes.c_ulong), ('_u', _U)]

    F = 0x8000 | 0x4000  # ABSOLUTE | VIRTUALDESK
    flags_list = [0x0002 | F, 0x0004 | F]
    if not skip_move:
        flags_list = [0x0001 | F] + flags_list
    for flags in flags_list:
        inp = INPUT(type=0)
        inp.mi.dx = nx; inp.mi.dy = ny; inp.mi.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        time.sleep(0.05)

def click_abs(ax, ay, label=""):
    sendinput(ax, ay)
    if label:
        print(f"  🖱 click {label} @ abs({ax},{ay})", flush=True)

# ── 动态发现 DevTools ─────────────────────────────────────────────
def find_devtools():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd): return True
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
                    found.append({'hwnd': hwnd, 'w': w, 'h': h,
                                  'left': r.left, 'top': r.top})
        except: pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    found.sort(key=lambda x: -(x['w'] * x['h']))
    return found[0] if found else None

# ── 截图 ──────────────────────────────────────────────────────────
def capture(hwnd, wl, wt, canvas_abs, filename, label=""):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.8)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        monitor = {"left": r.left, "top": r.top,
                   "width": r.right - r.left, "height": r.bottom - r.top}
        img = sct.grab(monitor)
        arr = np.array(img)[:, :, :3][..., ::-1]
    brightness = float(arr.mean())
    cx, cy, cw, ch = canvas_abs
    rel_cx = cx - r.left; rel_cy = cy - r.top
    crop = arr[max(0, rel_cy):min(arr.shape[0], rel_cy + ch),
               max(0, rel_cx):min(arr.shape[1], rel_cx + cw)]
    path = os.path.join(OUT_DIR, filename)
    Image.fromarray(crop).save(path)
    print(f"  📸 {filename}  brightness={brightness:.1f}" +
          (f"  [{label}]" if label else ""), flush=True)
    return brightness, path

# ── Reload → Menu ─────────────────────────────────────────────────
def do_reload(hwnd, wl, wt, ww, wh, reload_abs_x, reload_abs_y, wait_s):
    """
    从当前任意状态出发，点击 ↺，等待编译完成后回到 menu。
    因为 game.js 已 patch 为 navigate('menu')，reload 后直接进 menu。

    关键：reload 点击时 canvas 未加载（刚开始编译），所以 toolbar 点击可正常到达 DevTools UI。
    """
    keybd = ctypes.windll.user32.keybd_event
    print(f"  [RELOAD] 激活 DevTools 窗口...", flush=True)
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    # 点击 ↺
    print(f"  [RELOAD] 点击 ↺ abs({reload_abs_x},{reload_abs_y})", flush=True)
    sendinput(reload_abs_x, reload_abs_y)
    time.sleep(0.2)
    # 立即按 Escape 关闭可能弹出的下拉
    keybd(0x1B, 0, 0, 0); keybd(0x1B, 0, 2, 0)
    time.sleep(0.1)
    keybd(0x1B, 0, 0, 0); keybd(0x1B, 0, 2, 0)
    time.sleep(0.1)
    # 点击工具栏左侧安全区域（非按钮区），确保 dropdown 关闭
    safe_x = wl + 200; safe_y = wt + 42
    sendinput(safe_x, safe_y)
    time.sleep(0.2)

    print(f"  [RELOAD] 等待编译 {wait_s}s...", flush=True)
    time.sleep(wait_s)

    # 编译完成后再次激活，按 Escape 清理残余弹窗
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    keybd(0x1B, 0, 0, 0); keybd(0x1B, 0, 2, 0)
    time.sleep(0.3)
    print(f"  [RELOAD] 完成，游戏应在 menu 界面", flush=True)

# ── 单次截图流程 ──────────────────────────────────────────────────
def shoot_screen(screen_key, hwnd, wl, wt, ww, wh, cal, step_num):
    """
    reload → 导航到 screen_key → 截图。
    每次调用都从 reload 开始，不依赖之前的状态。
    """
    canvas_abs = (cal['canvas_abs']['x'], cal['canvas_abs']['y'],
                  cal['canvas_abs']['w'], cal['canvas_abs']['h'])
    cw, ch = canvas_abs[2], canvas_abs[3]
    coords  = cal['coords']

    reload_x = coords['reload_btn'][0]
    reload_y = coords['reload_btn'][1]

    # ── Reload ───────────────────────────────────────────────────
    do_reload(hwnd, wl, wt, ww, wh, reload_x, reload_y, args.wait)

    # 短暂等待，再截图确认 menu 已出现
    time.sleep(1.0)

    # ── 根据目标界面点击导航 ─────────────────────────────────────
    if screen_key == 'menu':
        fname = f"{STORY}-{step_num:02d}-menu.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "menu")
        return brightness, path, fname

    elif screen_key == 'gallery':
        # 点击 星座图鉴 按钮
        bx, by = coords['menu_gallery_btn']
        click_abs(bx, by, "星座图鉴 btn")
        time.sleep(3.5)
        fname = f"{STORY}-{step_num:02d}-gallery-list.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "gallery list")
        return brightness, path, fname

    elif screen_key == 'gallery_detail':
        # 点击 星座图鉴 → 等待 → 点击 node 0
        bx, by = coords['menu_gallery_btn']
        click_abs(bx, by, "星座图鉴 btn")
        time.sleep(3.5)
        # 点 node 0 (猎户座)
        nx, ny = coords['gallery_node0']
        click_abs(nx, ny, "gallery node 0 (猎户座)")
        time.sleep(2.0)
        fname = f"{STORY}-{step_num:02d}-gallery-detail.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "gallery detail")
        return brightness, path, fname

    elif screen_key == 'shop':
        bx, by = coords['menu_shop_btn']
        click_abs(bx, by, "道具商店 btn")
        time.sleep(3.5)
        fname = f"{STORY}-{step_num:02d}-shop.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "shop")
        return brightness, path, fname

    elif screen_key == 'levels':
        bx, by = coords['menu_challenge_btn']
        click_abs(bx, by, "挑战关卡 btn")
        time.sleep(3.5)
        fname = f"{STORY}-{step_num:02d}-level-select.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "levels")
        return brightness, path, fname

    elif screen_key == 'game':
        # 挑战关卡 → Level 1 → skip overlay → 游戏
        bx, by = coords['menu_challenge_btn']
        click_abs(bx, by, "挑战关卡 btn")
        time.sleep(3.5)
        lx, ly = coords['levels_node0']
        click_abs(lx, ly, "Level 1 (猎户座)")
        time.sleep(2.5)
        # skip pre-level overlay (click center)
        cx_abs = canvas_abs[0] + canvas_abs[2] // 2
        cy_abs = canvas_abs[1] + canvas_abs[3] // 2
        click_abs(cx_abs, cy_abs, "skip overlay")
        time.sleep(3.0)
        fname = f"{STORY}-{step_num:02d}-game.png"
        brightness, path = capture(hwnd, wl, wt, canvas_abs, fname, "game")
        return brightness, path, fname

    else:
        print(f"  ERROR: 未知 screen_key={screen_key}", flush=True)
        return 0, None, None

# ── Main ──────────────────────────────────────────────────────────
ALL_SCREENS = ['menu', 'gallery', 'gallery_detail', 'shop', 'levels', 'game']

def main():
    print(f"nav_all_screens.py — Sprint {args.sprint} / {STORY} / screen={args.screen}", flush=True)

    # 读 calibration.json
    cal_path = args.cal or os.path.join(OUT_DIR, "calibration.json")
    if not os.path.exists(cal_path):
        print(f"  calibration.json 不存在，先运行 calibrate.py...", flush=True)
        ret = subprocess.call(
            [sys.executable, os.path.join(os.path.dirname(__file__), 'calibrate.py'),
             '--sprint', str(args.sprint), '--story', STORY, '--out', OUT_DIR])
        if ret != 0:
            print("ERROR: calibrate.py 失败", flush=True); sys.exit(1)
    cal = json.load(open(cal_path, 'r', encoding='utf-8'))
    print(f"  ✓ 读取 calibration.json: hwnd={cal['hwnd']}  "
          f"canvas=({cal['canvas_abs']['x']},{cal['canvas_abs']['y']}) "
          f"{cal['canvas_abs']['w']}x{cal['canvas_abs']['h']}", flush=True)

    # 动态重新发现窗口（hwnd 在 DevTools 重启后可能变化）
    win = find_devtools()
    if not win:
        print("ERROR: 未找到 wechatdevtools 窗口", flush=True); sys.exit(1)
    hwnd = win['hwnd']
    wl, wt, ww, wh = win['left'], win['top'], win['w'], win['h']
    print(f"  ✓ DevTools hwnd={hwnd} abs=({wl},{wt}) size={ww}x{wh}", flush=True)

    # 如果窗口位置与 calibration 不同，更新 canvas_abs 偏移
    old_wl = cal['window']['left']; old_wt = cal['window']['top']
    if wl != old_wl or wt != old_wt:
        dx = wl - old_wl; dy = wt - old_wt
        print(f"  ⚠ 窗口位置偏移 ({dx},{dy})，更新 canvas_abs 和 coords", flush=True)
        cal['canvas_abs']['x'] += dx
        cal['canvas_abs']['y'] += dy
        for k, v in cal['coords'].items():
            if isinstance(v, list) and len(v) == 2:
                cal['coords'][k] = [v[0] + dx, v[1] + dy]
        cal['window']['left'] = wl; cal['window']['top'] = wt

    # Patch game.js
    patched = patch_gamejs()

    results = []
    try:
        screens = ALL_SCREENS if args.screen == 'all' else [args.screen]
        for i, screen_key in enumerate(screens, 1):
            print(f"\n[{i}/{len(screens)}] 截图: {screen_key}", flush=True)
            brightness, path, fname = shoot_screen(
                screen_key, hwnd, wl, wt, ww, wh, cal, i)
            if brightness is not None and brightness < 5:
                print(f"  ⚠ 截图全黑！brightness={brightness:.1f}", flush=True)
            if path:
                st, cf = glm_check(path)
                print(f"  GLM: {st} ({cf})", flush=True)
                results.append({'screen': screen_key, 'file': fname,
                                 'brightness': round(brightness, 1),
                                 'glm': st, 'glm_conf': cf})
    finally:
        if patched:
            restore_gamejs()

    print("\n═══ 完成 ═══", flush=True)
    for r in results:
        flag = "✓" if r['brightness'] > 5 else "✗ BLACK"
        print(f"  {flag} [{r['screen']}] {r['file']}  brightness={r['brightness']}  GLM={r['glm']}({r['glm_conf']})", flush=True)

if __name__ == '__main__':
    main()
