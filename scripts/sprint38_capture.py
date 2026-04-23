"""
sprint38_capture.py — 快速截图全屏幕用于 Sprint 38 差距分析
用法: python scripts/sprint38_capture.py
"""
import sys, os, time, subprocess, json, ctypes, ctypes.wintypes
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    import mss, numpy as np
    from PIL import Image
except ImportError as e:
    print(f"缺少依赖: {e}")
    sys.exit(1)

OUT_DIR = "docs/qa/sprint38-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
user32 = ctypes.windll.user32

def find_devtools_hwnd():
    candidates = []
    def callback(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL).decode('utf-8', 'replace')
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
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]

def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5)
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
    print(f"  📸 {filename} brightness={brightness:.1f}")
    return brightness, path

def sendinput_phys(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76); vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78); vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw); ny = int((phys_y - vy) * 65535 / vh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class _I(ctypes.Union): _fields_ = [('mi',MI)]
        _anonymous_ = ('_i',); _fields_ = [('type',ctypes.c_ulong),('_i',_I)]
    F = 0x0001|0x8000|0x4000
    for flags in [F, F|0x0002, F|0x0004]:
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
        time.sleep(0.05)

def canvas_click(canvas, rx, ry, label=""):
    ax = canvas[0] + int(canvas[2] * rx)
    ay = canvas[1] + int(canvas[3] * ry)
    sendinput_phys(ax, ay)
    if label: print(f"  🖱  Click {label} ratio({rx:.3f},{ry:.3f})")

def find_canvas(hwnd):
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    ww = r.right-r.left; wh = r.bottom-r.top
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":ww,"height":wh})
        arr = np.array(img)[:,:,:3][...,::-1]
    B = 56; scan_x = min(260, ww//4); col_B = arr[:,scan_x,2].astype(int)
    cy_top = None
    for y in range(55, wh):
        if col_B[y] > B: cy_top = y; break
    if cy_top is None: return None
    last_y = cy_top
    for y in range(cy_top, min(cy_top+600, wh)):
        if col_B[y] > B: last_y = y
        elif y > last_y+15: break
    ch = last_y - cy_top
    if ch < 100: return None
    scan_y = cy_top + ch//2; row_B = arr[scan_y,:,2].astype(int)
    cx_l = 0
    for x in range(0, min(200, ww)):
        if row_B[x] > B: cx_l = x; break
    last_x = cx_l
    for x in range(cx_l, min(ww-5, 700)):
        if row_B[x] > B: last_x = x
        elif x > last_x+20: break
    cw = last_x - cx_l
    if cw < 100: return None
    abs_l = r.left + cx_l; abs_t = r.top + cy_top
    return (abs_l, abs_t, cw, ch)

def click_reload(hwnd):
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    sendinput_phys(r.left+484, r.top+42)
    print("  🖱  Click ↺ reload")

def main():
    hwnd = find_devtools_hwnd()
    if not hwnd: print("ERROR: no devtools"); sys.exit(1)
    print(f"hwnd={hwnd}")
    user32.ShowWindow(hwnd, 5); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

    canvas = find_canvas(hwnd)
    if canvas:
        print(f"Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}")
    else:
        # fallback
        r2 = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r2))
        canvas = (r2.left+14, r2.top+138, 686, 459)
        print(f"Canvas fallback: {canvas}")

    # ── 1. Reload → wait for intro → capture intro mid-play ──
    print("\n[1] Reload → intro animation")
    click_reload(hwnd)
    time.sleep(4)  # ~4s into intro (meteor phase)
    capture(hwnd, "mini-01-intro.png")

    # ── 2. Wait for menu (~20s total) ──
    print("\n[2] Waiting for menu...")
    time.sleep(17)  # total ~21s from reload
    canvas_click(canvas, 0.513, 0.184, "focus")
    time.sleep(1)
    capture(hwnd, "mini-02-menu.png")

    # ── 3. Levels screen ──
    print("\n[3] Click 挑战关卡 → levels")
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.750, 0.299, "挑战关卡")
    time.sleep(2.5)
    capture(hwnd, "mini-03-levels.png")

    # ── 4. Game screen ──
    print("\n[4] Click Level 1 → game")
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.092, 0.110, "Level 1")
    time.sleep(2)
    canvas_click(canvas, 0.349, 0.490, "跳过")
    time.sleep(2.5)
    capture(hwnd, "mini-04-game.png")

    # ── 5. Shop (navigate back to menu first via reload, then click shop) ──
    print("\n[5] Reload → menu → shop")
    click_reload(hwnd); time.sleep(20)
    canvas_click(canvas, 0.513, 0.184, "focus"); time.sleep(1)
    # Click 道具商店 button
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.750, 0.495, "道具商店")
    time.sleep(2.5)
    capture(hwnd, "mini-05-shop.png")

    # ── 6. Gallery ──
    print("\n[6] Back to menu → gallery")
    # Click back from shop (top-left back button ~ratio 0.05, 0.05)
    canvas_click(canvas, 0.08, 0.06, "← back from shop")
    time.sleep(2)
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.750, 0.408, "星座图鉴")
    time.sleep(2.5)
    capture(hwnd, "mini-06-gallery.png")

    # ── 7. Gallery detail ──
    print("\n[7] Gallery detail (click first card)")
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.092, 0.110, "first card")
    time.sleep(2.5)
    capture(hwnd, "mini-07-gallery-detail.png")

    # ── 8. Fail screen via JS console ──
    print("\n[8] Reload → navigate to fail via console")
    # We'll capture victory/fail later via the JS console approach
    # For now, let's also get the complete screen by console
    click_reload(hwnd); time.sleep(20)
    canvas_click(canvas, 0.513, 0.184, "focus"); time.sleep(1)
    # Navigate to levels → game → let run briefly then navigate to complete via console
    # Actually just capture game screen and navigate complete via __navigate
    sendinput_phys(canvas[0]+int(canvas[2]*0.513), canvas[1]+int(canvas[3]*0.184))
    time.sleep(0.3)
    canvas_click(canvas, 0.750, 0.299, "挑战关卡"); time.sleep(2.5)
    canvas_click(canvas, 0.513, 0.184, "focus"); time.sleep(0.3)
    canvas_click(canvas, 0.092, 0.110, "Level 1"); time.sleep(2)
    canvas_click(canvas, 0.349, 0.490, "跳过"); time.sleep(2)
    # Screenshot of game in action
    capture(hwnd, "mini-04b-game2.png")

    print("\n✓ All captures done. Screenshots in:", OUT_DIR)

if __name__ == '__main__':
    main()
