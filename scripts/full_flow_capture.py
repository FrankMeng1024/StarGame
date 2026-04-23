"""
full_flow_capture.py — 全屏幕流程截图验证脚本
用法: python scripts/full_flow_capture.py --sprint 30 --story FULL

捕获所有关键屏幕: menu, level_select, game, gallery, shop, victory, fail
用于与原HTML游戏对比验证
"""
import sys, os, time, ctypes, ctypes.wintypes, json, argparse

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"缺少依赖: {e} — 运行: pip install mss pillow numpy")
    sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=str, default='30')
parser.add_argument('--story', type=str, default='FULL')
parser.add_argument('--out', type=str, default=None)
parser.add_argument('--quick', action='store_true', help='跳过等待时间(调试用)')
args = parser.parse_args()

OUT_DIR = args.out or f"docs/qa/sprint{args.sprint}-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32
SW_SHOW = 5

import subprocess as _subprocess

def find_devtools_hwnd():
    found = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd): return True
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = _subprocess.run(['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
                capture_output=True, text=True, timeout=2, encoding='utf-8', errors='ignore')
            if 'wechatdevtools' in proc.stdout.lower():
                buf = ctypes.create_unicode_buffer(256)
                user32.GetWindowTextW(hwnd, buf, 256)
                if buf.value:
                    r = ctypes.wintypes.RECT()
                    user32.GetWindowRect(hwnd, ctypes.byref(r))
                    if (r.right - r.left) > 800:  # only the main window
                        found.append(hwnd)
        except: pass
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return found[0] if found else None

def capture(hwnd, filename, label=""):
    filepath = os.path.join(OUT_DIR, filename)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx, wy, ww, wh = r.left, r.top, r.right - r.left, r.bottom - r.top
    with mss.mss() as sct:
        region = {"top": wy, "left": wx, "width": ww, "height": wh}
        img = sct.grab(region)
        arr = np.array(img)
        brightness = float(np.mean(arr[:, :, :3]))
        pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
        pil.save(filepath)
    print(f"  [{label}] {filename} b={brightness:.1f} size={pil.size}")
    return brightness, filepath

def canvas_click(hwnd, canvas, rx, ry, label=""):
    cx, cy, cw, ch = canvas
    # display pixel
    dpx = cx + int(cw * rx)
    dpy = cy + int(ch * ry)
    # logical pixel (same on this system, SCALE=1.0)
    lx, ly = dpx, dpy
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    abs_x = r.left + lx
    abs_y = r.top + ly
    # CSS pixel (game coordinate)
    css_x = round((lx - cx) / cw * 390)
    css_y = round((ly - cy) / ch * 180)  # landscape
    print(f"  canvas_click({label}) @ ratio({rx:.3f},{ry:.3f}) log({lx},{ly}) CSS({css_x},{css_y})")
    user32.SetCursorPos(abs_x, abs_y)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP
    time.sleep(0.3)

def find_canvas():
    """Return (cx, cy, cw, ch) — hardcoded fallback for 1280x800 Move Simulator Left"""
    return (13, 137, 975, 450)

def click_reload(hwnd, label="reload"):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    px = r.left + 921
    py = r.top + 70
    print(f"  click {label} @ ({px},{py})")
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)

def wait(s, label=""):
    if args.quick and s > 3:
        s = 3
    print(f"  wait {s}s {label}")
    time.sleep(s)

def main():
    print(f"full_flow_capture.py — Sprint {args.sprint}")
    print(f"Output: {OUT_DIR}")

    hwnd = find_devtools_hwnd()
    if not hwnd:
        print("ERROR: 未找到 wechatdevtools.exe 窗口")
        sys.exit(1)
    print(f"hwnd={hwnd}")

    user32.ShowWindow(hwnd, SW_SHOW)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    canvas = find_canvas()
    print(f"Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}")

    step = 0
    def shot(name, label):
        nonlocal step
        step += 1
        b, p = capture(hwnd, f"flow-{step:02d}-{name}.png", label)
        if b < 10:
            print(f"  WARNING: 截图全黑 (b={b:.1f})")
        return b, p

    # ══ Step 1: Reload → menu ══
    print("\n[1] Reload → intro → menu")
    click_reload(hwnd, "↺ reload")
    wait(20, "intro animation")
    shot("menu", "主菜单")

    # ══ Step 2: Gallery (星座图鉴) ══
    print("\n[2] Navigate to Gallery (星座图鉴)")
    # 星座图鉴 button: rightX ~ W*0.62 = ~242 CSS
    # In landscape 390×180: 2nd button in right column
    # rightX ≈ 0.62*390 = ~242 CSS, midX of right side ~330 CSS
    # BH ~30, GAP 8, 3 buttons starting from ~usableH*0.42 - totalBtnsH/2
    # H=180 CSS, usableH≈160, startY ≈ 160*0.42 - (3*30+2*8)/2 = 67-46=21 CSS from safe top (~25)
    # Button 0 (挑战关卡): y ≈ 25+21=46 → ry ≈ 46/180=0.256 — but mss_navigate.py uses 0.289
    # Button 1 (星座图鉴): y ≈ 46+30+8=84 CSS → ry ≈ 84/180=0.467
    # But actual CSS units: portrait is 390×844, landscape same device rotated → 844×390
    # Wait — game is landscape and simulator is portrait showing landscape game
    # The simulator canvas 975x450 maps to game CSS 844×390 (landscape iPhone)
    # So rx=0.775, ry=0.289 for 挑战关卡 means CSS(775*0.844, 390*0.289) = (654 CSS, 113 CSS)
    # That's landscape coordinates: x=654/844=77.5% of width, y=113/390=29% of height
    # 星座图鉴 (button index 1): same x, y += BH + GAP ≈ +30+8=38 CSS
    # ry for 星座图鉴 ≈ (113+38)/390 = 151/390 = 0.387
    canvas_click(hwnd, canvas, 0.775, 0.387, "星座图鉴")
    wait(2, "gallery loading")
    shot("gallery", "星座展厅/图鉴")

    # ══ Step 3: Back to menu ══
    print("\n[3] Back to menu from gallery")
    canvas_click(hwnd, canvas, 0.07, 0.10, "← 返回 (gallery)")
    wait(1.5, "back")
    shot("menu-after-gallery", "主菜单(gallery返回后)")

    # ══ Step 4: Shop (道具商店) ══
    print("\n[4] Navigate to Shop (道具商店)")
    # 道具商店 button index 2: ry ≈ (113+38+30+8)/390 = 189/390 = 0.485
    canvas_click(hwnd, canvas, 0.775, 0.485, "道具商店")
    wait(2, "shop loading")
    shot("shop-top", "道具商店上半")

    # ══ Step 5: Back to menu ══
    print("\n[5] Back to menu from shop")
    canvas_click(hwnd, canvas, 0.07, 0.10, "← 返回 (shop)")
    wait(1.5, "back")
    shot("menu-after-shop", "主菜单(shop返回后)")

    # ══ Step 6: Level select ══
    print("\n[6] Level Select")
    canvas_click(hwnd, canvas, 0.775, 0.289, "挑战关卡")
    wait(2.5, "level select loading")
    shot("level-select", "选关页面")

    # ══ Step 7: Game ══
    print("\n[7] Game — Level 1 猎户座")
    canvas_click(hwnd, canvas, 0.130, 0.277, "Level 1 猎户座")
    wait(3, "game loading")
    shot("game-start", "游戏开始(猎户座)")

    # ══ Step 8: Skip overlay if present ══
    print("\n[8] Skip item overlay if present")
    # 跳过 button is at left center of overlay card
    # Card is centered, ~(W-340)/2 = ~250 CSS ... but in landscape W=844
    # "跳过" left button at roughly 40% x center, 87% y of card
    # In canvas coords: rx ~ 0.35, ry ~ 0.70 (rough estimate)
    canvas_click(hwnd, canvas, 0.35, 0.70, "跳过(overlay)")
    wait(1, "after skip")
    shot("game-after-skip", "游戏(跳过道具后)")

    # ══ Step 9: Wait 10s then capture gameplay ══
    print("\n[9] Gameplay screenshot")
    wait(8, "gameplay")
    shot("game-play", "游戏进行中")

    # ══ Done ══
    print(f"\n═══ full_flow_capture complete — {step} screenshots ═══")
    print(f"Output dir: {OUT_DIR}")

if __name__ == '__main__':
    main()
