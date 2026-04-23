"""
calibrate.py — 发现 DevTools 窗口（含第二扩展屏），确认 canvas 基准，推导所有界面坐标。
输出：calibration.json — 供 nav_all_screens.py 使用

用法：
  python scripts/calibrate.py
  python scripts/calibrate.py --sprint 56 --story STORY-00350

步骤：
  1. 枚举所有窗口，找 wechatdevtools，打印绝对坐标（支持多显示器）
  2. 截全窗口，保存 docs/qa/sprintN-evidence/calib-full-window.png
  3. 扫描 canvas 边界（找游戏画面深色背景区域）
  4. 截 canvas 区域，保存 calib-canvas.png
  5. 打印所有推导坐标，写入 calibration.json
"""
import ctypes, ctypes.wintypes, mss, subprocess, time, os, json, sys, argparse
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=56)
parser.add_argument('--story', type=str, default='STORY-00350')
parser.add_argument('--out', type=str, default=None)
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32

# ── 1. 枚举所有 wechatdevtools 窗口 ──────────────────────────────
def find_devtools():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
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
                w = r.right - r.left
                h = r.bottom - r.top
                if w > 400 and h > 400:
                    found.append({
                        'hwnd': hwnd, 'w': w, 'h': h,
                        'left': r.left, 'top': r.top,
                        'right': r.right, 'bottom': r.bottom
                    })
        except:
            pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    found.sort(key=lambda x: -(x['w'] * x['h']))
    return found

print("═══ 枚举 wechatdevtools 窗口 ═══", flush=True)
all_wins = find_devtools()
if not all_wins:
    print("ERROR: 未找到 wechatdevtools 窗口", flush=True)
    sys.exit(1)

for i, w in enumerate(all_wins):
    print(f"  [{i}] hwnd={w['hwnd']} pos=({w['left']},{w['top']}) size={w['w']}x{w['h']}", flush=True)

win = all_wins[0]
hwnd = win['hwnd']
wl, wt, ww, wh = win['left'], win['top'], win['w'], win['h']
print(f"\n使用窗口: hwnd={hwnd} abs=({wl},{wt}) size={ww}x{wh}", flush=True)

# ── 2. 激活窗口，截全窗口 ────────────────────────────────────────
user32.ShowWindow(hwnd, 9)   # SW_RESTORE
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

# 重新读取窗口位置（激活后可能移动）
r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wl, wt = r.left, r.top
ww, wh = r.right - r.left, r.bottom - r.top
print(f"激活后窗口位置: abs=({wl},{wt}) size={ww}x{wh}", flush=True)

with mss.mss() as sct:
    monitor = {"left": wl, "top": wt, "width": ww, "height": wh}
    img = sct.grab(monitor)
    arr_full = np.array(img)[:, :, :3][..., ::-1]  # RGB

full_path = os.path.join(OUT_DIR, "calib-full-window.png")
Image.fromarray(arr_full).save(full_path)
print(f"✓ 全窗口截图: {full_path}  ({arr_full.shape[1]}x{arr_full.shape[0]})", flush=True)

# ── 3. 扫描 canvas 边界 ──────────────────────────────────────────
# 策略：游戏 canvas 背景是深色（近黑）的，DevTools 界面是深灰/白
# 找到左侧连续深色列的边界
print("\n═══ 扫描 canvas 边界 ═══", flush=True)

def find_canvas_bounds(arr):
    """
    游戏 canvas 是深蓝色背景（R<80, G<80, B>60 且 B>R, B>G）的矩形区域。
    DevTools 界面是深灰色（R≈G≈B 的灰色系）。
    策略：找最大的"蓝色调暗像素"连续矩形。
    """
    R = arr[:, :, 0].astype(int)
    G = arr[:, :, 1].astype(int)
    B = arr[:, :, 2].astype(int)

    # 游戏深蓝背景像素特征：
    # - 整体偏暗（R<120, G<120, B<150）
    # - 蓝色分量相对偏高（B > R+10 或 B > G+10）
    # - 不是纯灰（避免 DevTools 灰色背景）
    game_pixel = (
        (R < 120) & (G < 120) & (B < 160) &
        ((B > R + 8) | (B > G + 8)) &
        (R < 100) & (G < 100)
    )

    # 列中"游戏像素"比例
    col_ratio = game_pixel.sum(axis=0) / arr.shape[0]
    row_ratio = game_pixel.sum(axis=1) / arr.shape[1]

    THRESHOLD = 0.10

    def longest_run(mask):
        best_start, best_end, best_len = 0, 0, 0
        cur_start = None
        for i, v in enumerate(mask):
            if v and cur_start is None:
                cur_start = i
            elif not v and cur_start is not None:
                length = i - cur_start
                if length > best_len:
                    best_len = length; best_start = cur_start; best_end = i - 1
                cur_start = None
        if cur_start is not None:
            length = len(mask) - cur_start
            if length > best_len:
                best_start = cur_start; best_end = len(mask) - 1
        return best_start, best_end

    x0, x1 = longest_run(col_ratio > THRESHOLD)
    y0, y1 = longest_run(row_ratio > THRESHOLD)

    return x0, y0, x1 - x0, y1 - y0

cx_rel, cy_rel, cw, ch = find_canvas_bounds(arr_full)
print(f"  Canvas 窗口相对坐标: ({cx_rel},{cy_rel}) 尺寸={cw}x{ch}", flush=True)

# canvas 绝对坐标
canvas_abs = (wl + cx_rel, wt + cy_rel, cw, ch)
print(f"  Canvas 绝对坐标: ({canvas_abs[0]},{canvas_abs[1]}) 尺寸={cw}x{ch}", flush=True)

# 截 canvas 区域验证
canvas_crop = arr_full[cy_rel:cy_rel+ch, cx_rel:cx_rel+cw]
canvas_path = os.path.join(OUT_DIR, "calib-canvas.png")
Image.fromarray(canvas_crop).save(canvas_path)
print(f"✓ Canvas 截图: {canvas_path}  ({canvas_crop.shape[1]}x{canvas_crop.shape[0]})", flush=True)

# ── 4. 推导所有坐标 ────────────────────────────────────────────
print("\n═══ 推导界面坐标 ═══", flush=True)

# 游戏逻辑尺寸固定 800x500（横屏）
GAME_W, GAME_H = 800, 500

def game_to_abs(gx, gy):
    """游戏逻辑坐标 → 屏幕绝对坐标"""
    rx = gx / GAME_W
    ry = gy / GAME_H
    ax = canvas_abs[0] + int(cw * rx)
    ay = canvas_abs[1] + int(ch * ry)
    return ax, ay

def ratio_to_abs(rx, ry):
    ax = canvas_abs[0] + int(cw * rx)
    ay = canvas_abs[1] + int(ch * ry)
    return ax, ay

# ── Menu 按钮（来自 menu.js，右侧面板 rx≈0.770）
coords = {}

# Menu 按钮（在游戏画面右侧，三个按钮）
# 挑战关卡 ry≈0.378，星座图鉴 ry≈0.515，道具商店 ry≈0.640
menu_rx = 0.770
menu_challenge = ratio_to_abs(menu_rx, 0.378)
menu_gallery   = ratio_to_abs(menu_rx, 0.515)
menu_shop      = ratio_to_abs(menu_rx, 0.640)
coords['menu_challenge_btn'] = menu_challenge
coords['menu_gallery_btn']   = menu_gallery
coords['menu_shop_btn']      = menu_shop
print(f"  menu_challenge_btn: abs{menu_challenge}  (ratio 0.770, 0.378)", flush=True)
print(f"  menu_gallery_btn:   abs{menu_gallery}    (ratio 0.770, 0.515)", flush=True)
print(f"  menu_shop_btn:      abs{menu_shop}       (ratio 0.770, 0.640)", flush=True)

# ── 图鉴 (gallery.js)
# areaTop=72, areaBottom=456, areaCX=400, areaCY=264, areaW=688, areaH=384
# Node 0 (猎户座): xr=-0.30, yr=-0.35
# cx=400+(-0.30)*688=193.6, cy=264+(-0.35)*384=129.6
gallery_node0_game = (193.6, 129.6)
gallery_node0 = game_to_abs(*gallery_node0_game)
coords['gallery_node0'] = gallery_node0
print(f"  gallery_node0 (猎户座): game{gallery_node0_game} → abs{gallery_node0}", flush=True)

# 图鉴详情返回按钮: game(12+40, 10+16) = center (52, 26)
gallery_back = game_to_abs(52, 26)
coords['gallery_back_btn'] = gallery_back
print(f"  gallery_back_btn: game(52,26) → abs{gallery_back}", flush=True)

# 图鉴详情 ×关闭 drawer: game(770, 166)
gallery_drawer_close = game_to_abs(770, 166)
coords['gallery_drawer_close'] = gallery_drawer_close
print(f"  gallery_drawer_close: game(770,166) → abs{gallery_drawer_close}", flush=True)

# ── 关卡选择 (levels.js)
# nodeAreaCX=400, nodeAreaCY=258, nodeAreaW=656, nodeAreaH=396
# Node 0 (猎户座): xr=-0.340, yr=-0.26
# cx=400+(-0.340)*656=177, cy=258+(-0.26)*396=155
levels_node0_game = (177, 155)
levels_node0 = game_to_abs(*levels_node0_game)
coords['levels_node0'] = levels_node0
print(f"  levels_node0 (关卡1): game{levels_node0_game} → abs{levels_node0}", flush=True)

# 关卡选择返回按钮（返回menu）: 通常左上角 game(52, 26)
levels_back = game_to_abs(52, 26)
coords['levels_back_btn'] = levels_back
print(f"  levels_back_btn: game(52,26) → abs{levels_back}", flush=True)

# ── 游戏画面 (game.js 关卡内)
# 游戏画面中心（安全区）
game_center = game_to_abs(400, 250)
coords['game_center'] = game_center
print(f"  game_center: game(400,250) → abs{game_center}", flush=True)

# 游戏内星座整体区域（待关卡数据，先记录中心）
# 后续检查 constellation centering 时需要逐关截图
game_canvas_center_ratio = (0.50, 0.50)
coords['game_canvas_ratio_center'] = game_canvas_center_ratio
print(f"  game_canvas_ratio_center: {game_canvas_center_ratio}", flush=True)

# ── reload 按钮（DevTools 工具栏）
# 工具栏在 canvas 上方，扫描找 ↺ 图标
# 使用 find_reload_x 逻辑（扫描 y=38-80, x=700-780 的灰色图标像素）
toolbar_region = arr_full[38:80, 700:780]
gray = ((toolbar_region[:,:,0]>130) & (toolbar_region[:,:,0]<220) &
        (np.abs(toolbar_region[:,:,0].astype(int)-toolbar_region[:,:,1].astype(int))<25) &
        (np.abs(toolbar_region[:,:,1].astype(int)-toolbar_region[:,:,2].astype(int))<25))
col_counts = gray.sum(axis=0)
if col_counts.max() > 0:
    dropdown_rel = int(col_counts.argmax())
    reload_rel_x = 700 + dropdown_rel + 10  # ↺ is ~10px right of ▼ peak
else:
    reload_rel_x = 762  # fallback
reload_abs_x = wl + reload_rel_x
reload_abs_y = wt + 59
coords['reload_btn'] = (reload_abs_x, reload_abs_y)
print(f"  reload_btn (↺): abs({reload_abs_x},{reload_abs_y})  rel_x={reload_rel_x}", flush=True)

# ── Canvas 焦点安全点（用于激活 canvas 不触发游戏元素）
focus_safe = (canvas_abs[0] + int(cw * 0.05), canvas_abs[1] + int(ch * 0.05))
coords['canvas_focus_safe'] = focus_safe
print(f"  canvas_focus_safe: abs{focus_safe}", flush=True)

# ── 5. 写入 calibration.json ─────────────────────────────────────
cal = {
    'hwnd': hwnd,
    'window': {'left': wl, 'top': wt, 'width': ww, 'height': wh},
    'canvas_rel': {'x': cx_rel, 'y': cy_rel, 'w': cw, 'h': ch},
    'canvas_abs': {'x': canvas_abs[0], 'y': canvas_abs[1], 'w': cw, 'h': ch},
    'coords': {k: list(v) if isinstance(v, tuple) else v for k, v in coords.items()}
}
cal_path = os.path.join(OUT_DIR, "calibration.json")
with open(cal_path, 'w', encoding='utf-8') as f:
    json.dump(cal, f, indent=2, ensure_ascii=False)
print(f"\n✓ calibration.json: {cal_path}", flush=True)

# ── 6. 保存带标注的 canvas 截图 ───────────────────────────────────
# 在全窗口截图上标记各关键点
try:
    from PIL import ImageDraw
    annotated = Image.fromarray(arr_full).copy()
    draw = ImageDraw.Draw(annotated)
    colors = {
        'menu': 'lime',
        'gallery': 'cyan',
        'levels': 'yellow',
        'game': 'orange',
        'reload': 'red',
        'canvas': 'white',
    }
    def dot(x_abs, y_abs, color='red', r=6, label=''):
        # Convert to window-relative
        px = x_abs - wl; py = y_abs - wt
        draw.ellipse([px-r, py-r, px+r, py+r], fill=color, outline='black')
        if label:
            draw.text((px+r+2, py-r), label, fill=color)

    dot(*menu_challenge, 'lime', label='挑战关卡')
    dot(*menu_gallery, 'cyan', label='图鉴')
    dot(*menu_shop, 'yellow', label='商店')
    dot(*gallery_node0, 'cyan', label='图鉴node0')
    dot(*gallery_back, 'cyan', label='图鉴返回')
    dot(*levels_node0, 'yellow', label='关卡1')
    dot(*reload_abs_x - wl + wl, reload_abs_y, 'red', label='↺')  # workaround
    # Draw canvas rect
    draw.rectangle([cx_rel, cy_rel, cx_rel+cw, cy_rel+ch], outline='white', width=2)
    # Fix reload dot
    draw.ellipse([reload_rel_x-6, (reload_abs_y-wt)-6, reload_rel_x+6, (reload_abs_y-wt)+6], fill='red', outline='black')
    draw.text((reload_rel_x+8, (reload_abs_y-wt)-6), '↺', fill='red')

    ann_path = os.path.join(OUT_DIR, "calib-annotated.png")
    annotated.save(ann_path)
    print(f"✓ 标注图: {ann_path}", flush=True)
except Exception as e:
    print(f"  标注失败（非关键）: {e}", flush=True)

print("\n═══ Calibration 完成 ═══", flush=True)
print(f"  全窗口截图:  {full_path}", flush=True)
print(f"  Canvas截图:  {canvas_path}", flush=True)
print(f"  标注图:      {os.path.join(OUT_DIR,'calib-annotated.png')}", flush=True)
print(f"  JSON输出:    {cal_path}", flush=True)
