"""
sprint36_capture.py — Sprint 36 QA evidence capture (single-screen)
Captures: menu, shop (STORY-00320), game with girl (STORY-00321), fail/victory (STORY-00322)

Reload method: Ctrl+Shift+R (confirmed working on single screen)
Canvas: win(20,95) ~690x330 (auto-detected from blue pixels)
"""
import sys, os, time, ctypes, ctypes.wintypes, subprocess
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try: ctypes.windll.user32.SetProcessDPIAware()
    except Exception: pass

try:
    import mss, numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing: {e}"); sys.exit(1)

OUT_DIR = "docs/qa/sprint36-evidence"
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32

# ── SendInput ──────────────────────────────────────────────────────────────
vx = user32.GetSystemMetrics(76); vy = user32.GetSystemMetrics(77)
vw = user32.GetSystemMetrics(78); vh = user32.GetSystemMetrics(79)

class MI(ctypes.Structure):
    _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),
                ('mouseData',ctypes.c_ulong),('dwFlags',ctypes.c_ulong),
                ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
class INP(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [('mi',MI)]
    _anonymous_ = ('_u',)
    _fields_ = [('type',ctypes.c_ulong),('_u',_U)]

def click_phys(px, py, label=''):
    nx = int((px - vx) * 65535 / vw)
    ny = int((py - vy) * 65535 / vh)
    def send(f):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=f
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000|0x4000); time.sleep(0.1)
    send(0x0002|0x8000|0x4000); time.sleep(0.05)
    send(0x0004|0x8000|0x4000)
    if label: print(f"  🖱  click {label} @ ({px},{py})")

def key_combo(*vkeys):
    """Press a key combination (all down then all up)."""
    for k in vkeys:
        ctypes.windll.user32.keybd_event(k, 0, 0, 0)
        time.sleep(0.02)
    time.sleep(0.05)
    for k in reversed(vkeys):
        ctypes.windll.user32.keybd_event(k, 0, 2, 0)
        time.sleep(0.02)

# ── hwnd discovery ─────────────────────────────────────────────────────────
def find_devtools_hwnd():
    candidates = []
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w,h = r.right-r.left, r.bottom-r.top
                if w>400 and h>400: candidates.append((hwnd, w*h))
        except: pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1]); return candidates[0][0]

# ── Canvas detection ───────────────────────────────────────────────────────
def find_canvas(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    ww, wh = r.right-r.left, r.bottom-r.top
    with mss.mss() as sct:
        mon = {'left':r.left,'top':r.top,'width':ww,'height':wh}
        img = sct.grab(mon)
        arr = np.array(img)  # BGRA
    B = arr[:,:,0].astype(int)  # Blue channel
    scan_x = min(300, ww//4)
    col = B[:, scan_x]
    cy_top = None
    for y in range(60, wh):
        if col[y] > 56: cy_top = y; break
    if cy_top is None: return None
    cy_bot = cy_top
    for y in range(cy_top, min(cy_top+700, wh)):
        if col[y] > 56: cy_bot = y
        elif y > cy_bot + 15: break
    mid_y = cy_top + (cy_bot - cy_top)//2
    row = B[mid_y, :]
    cx_left = 0
    for x in range(0, 400):
        if row[x] > 56: cx_left = x; break
    cx_right = cx_left
    for x in range(cx_left, min(800, ww-5)):
        if row[x] > 56: cx_right = x
        elif x > cx_right + 20: break
    cw, ch = cx_right - cx_left, cy_bot - cy_top
    if cw < 100 or ch < 100: return None
    return (r.left + cx_left, r.top + cy_top, cw, ch)

# ── Capture ────────────────────────────────────────────────────────────────
def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5); time.sleep(0.8)
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        mon = {'left':r.left,'top':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
        img = sct.grab(mon)
        arr = np.array(img)
        b = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        p = os.path.join(OUT_DIR, filename); pil.save(p)
    print(f"  📸 {filename} brightness={b:.1f}")
    return b

# ── Main ───────────────────────────────────────────────────────────────────
hwnd = find_devtools_hwnd()
if not hwnd: print("ERROR: no devtools"); sys.exit(1)
print(f"hwnd={hwnd}")

user32.ShowWindow(hwnd, 9); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
wl, wt = r.left, r.top
print(f"Window: ({wl},{wt}) {r.right-r.left}x{r.bottom-r.top}")

# ── Step 1: Reload via Ctrl+Shift+R ───────────────────────────────────────
print("\n[1/6] Reload game (Ctrl+Shift+R)")
# Click somewhere neutral to ensure DevTools has keyboard focus
click_phys(wl+350, wt+300, "focus game area")
time.sleep(0.5)
key_combo(0x11, 0x10, 0x52)  # Ctrl+Shift+R
print("  Sent Ctrl+Shift+R reload")
time.sleep(22)  # Wait for reload + intro animation

# Focus simulator area
click_phys(wl+350, wt+280, "focus simulator")
time.sleep(1.5)
b = capture(hwnd, "STORY-00321-01-menu.png")
if b < 10: print("ERROR: black screen"); sys.exit(1)
print(f"  Menu captured (brightness={b:.1f})")

# ── Detect canvas after reload ─────────────────────────────────────────────
canvas = find_canvas(hwnd)
if canvas:
    cx, cy, cw, ch = canvas
    print(f"  Canvas: abs({cx},{cy}) {cw}x{ch}")
else:
    # Fallback from visual inspection of full-window-menu.png
    cx = wl + 20; cy = wt + 95; cw = 690; ch = 330
    print(f"  Canvas fallback: ({cx},{cy}) {cw}x{ch}")

def sim_click(rx, ry, label=""):
    px = cx + int(cw * rx)
    py = cy + int(ch * ry)
    click_phys(px, py, label)
    time.sleep(0.8)

# ── Step 2: Navigate to shop (STORY-00320) ────────────────────────────────
print("\n[2/6] Navigate to shop (道具商店)")
# From console log: btn-shop center at canvas x=657, y=276 in ~720x400 game space
# Game renders 720x450 logically, canvas is cw x ch physical
# Button ratios from visual inspection of full-window-menu.png:
# 道具商店 button center ≈ image x=560, y=328 in 750x500 capture
# Canvas in that capture: x=20..710 (w=690), y=95..430 (h=335)
# ratio: rx=(560-20)/690=0.783, ry=(328-95)/335=0.695
sim_click(0.783, 0.695, "道具商店")
time.sleep(2)
b = capture(hwnd, "STORY-00320-01-shop.png")
print(f"  Shop captured (brightness={b:.1f})")

# ── Step 3: Back to menu ─────────────────────────────────────────────────
print("\n[3/6] Back to menu")
# Back button top-left of canvas area
sim_click(0.05, 0.12, "← 返回")
time.sleep(1.5)
b = capture(hwnd, "STORY-00320-02-menu-after-shop.png")
print(f"  Menu after shop (brightness={b:.1f})")

# ── Step 4: Level select → Level 1 game (STORY-00321) ────────────────────
print("\n[4/6] Level select → Level 1")
# 挑战关卡 button: rx=0.783, ry=0.455 (above shop button)
sim_click(0.783, 0.455, "挑战关卡")
time.sleep(2)
b = capture(hwnd, "STORY-00321-02-level-select.png")
print(f"  Level select (brightness={b:.1f})")

# Click Level 1 猎户座 (top-left card)
sim_click(0.08, 0.13, "Level 1 猎户座")
time.sleep(2)
# Skip intro overlay if present
sim_click(0.35, 0.50, "跳过 overlay")
time.sleep(2)
b = capture(hwnd, "STORY-00321-03-game.png")
print(f"  Game screen (brightness={b:.1f})")

# ── Step 5: Game playing - girl character visible ──────────────────────────
print("\n[5/6] Game playing (girl character)")
time.sleep(3)
b = capture(hwnd, "STORY-00321-04-game-playing.png")
print(f"  Game playing (brightness={b:.1f})")

# ── Step 6: Wait for fail screen (STORY-00322) ────────────────────────────
print("\n[6/6] Wait for fail/result screen (~140s)")
time.sleep(140)
b = capture(hwnd, "STORY-00322-01-fail.png")
print(f"  Fail screen (brightness={b:.1f})")

print("\nAll screenshots captured!")
print(f"Output: {OUT_DIR}/")
