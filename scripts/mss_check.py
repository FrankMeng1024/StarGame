"""
mss_check.py — Sprint 开始截图管道验证
用法: python scripts/mss_check.py --sprint N
输出: docs/qa/sprintN-evidence/mss-check.png
退出码: 0=OK, 1=FAIL

验证内容:
1. hwnd 动态发现（不硬编码）
2. DevTools 前台显示
3. mss 截图
4. 非全黑验证（亮度 > 10）
"""
import ctypes, ctypes.wintypes, time, os, sys, subprocess, argparse
import mss, mss.tools
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ─── 参数 ───────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=0, help='Sprint 编号（用于输出目录）')
parser.add_argument('--out', type=str, default=None, help='覆盖输出路径')
args = parser.parse_args()

if args.out:
    OUT_PATH = args.out
elif args.sprint > 0:
    OUT_DIR = f"docs/qa/sprint{args.sprint}-evidence"
    os.makedirs(OUT_DIR, exist_ok=True)
    OUT_PATH = f"{OUT_DIR}/mss-check.png"
else:
    OUT_DIR = "docs/spike-results"
    os.makedirs(OUT_DIR, exist_ok=True)
    OUT_PATH = f"{OUT_DIR}/mss-check.png"

# ─── hwnd 动态发现 ───────────────────────────────
user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
found = []

def _enum_callback(hwnd, _lparam):
    if not user32.IsWindowVisible(hwnd):
        return True
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        proc = subprocess.run(
            ['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
            capture_output=True, text=True, timeout=2,
            encoding='utf-8', errors='ignore'
        )
        if 'wechatdevtools' in proc.stdout.lower():
            title_buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, title_buf, 256)
            if title_buf.value:
                found.append((hwnd, title_buf.value))
    except Exception:
        pass
    return True

user32.EnumWindows(WNDENUMPROC(_enum_callback), 0)

if not found:
    print("[FAIL] 未找到 WeChat DevTools 窗口（wechatdevtools.exe）", flush=True)
    print("       请确认微信开发者工具已打开", flush=True)
    sys.exit(1)

hwnd, title = found[0]
print(f"[OK] 发现 hwnd={hwnd}, 标题='{title}'", flush=True)

# ─── 前台显示 ────────────────────────────────────
user32.ShowWindow(hwnd, 9)   # SW_RESTORE
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

# ─── 获取窗口尺寸 + 推算模拟器区域 ───────────────
r = RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wx, wy = r.left, r.top
ww = r.right - r.left
wh = r.bottom - r.top
print(f"[INFO] DevTools 窗口: ({wx},{wy}) {ww}x{wh}", flush=True)

# 模拟器面板比例（基于探针测试校准）
# DevTools 全屏 1920x1200 时，游戏画布在左半部分
# 绝对坐标: left=0, top=wy+40, width=960, height=540
sim_x = int(wx + 0)
sim_y = int(wy + wh * 0.033)
sim_w = int(ww * 0.50)
sim_h = int(wh * 0.45)
print(f"[INFO] 模拟器区域: ({sim_x},{sim_y}) {sim_w}x{sim_h}", flush=True)

# ─── 截图 + 非全黑验证（最多 3 次）─────────────
MAX_RETRIES = 3
success = False

for attempt in range(1, MAX_RETRIES + 1):
    with mss.mss() as sct:
        region = {"top": sim_y, "left": sim_x, "width": sim_w, "height": sim_h}
        img = sct.grab(region)
        mss.tools.to_png(img.rgb, img.size, output=OUT_PATH)

    pil = Image.open(OUT_PATH).convert('RGB')
    brightness = float(np.array(pil).mean())
    print(f"[INFO] 尝试 {attempt}/{MAX_RETRIES}: 亮度={brightness:.1f}", flush=True)

    if brightness > 10:
        success = True
        print(f"[OK] 截图成功: {OUT_PATH} ({img.width}x{img.height}), 亮度={brightness:.1f}", flush=True)
        break
    else:
        if attempt < MAX_RETRIES:
            print(f"[WARN] 全黑截图，等待 2s 重试...", flush=True)
            time.sleep(2)

if not success:
    print(f"[FAIL] 截图失败: {MAX_RETRIES} 次全部全黑", flush=True)
    print("       可能原因: DevTools 窗口被遮挡 / 模拟器未加载 / 坐标偏移", flush=True)
    sys.exit(1)

print("[PASS] 截图管道验证通过", flush=True)
sys.exit(0)
