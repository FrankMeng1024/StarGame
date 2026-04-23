"""
sprint36_qa_quick.py — Quick QA screenshots for Sprint 36
Just: reload → menu → shop → back → levels → game
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

def _sendinput_phys(phys_x, phys_y):
    vx = user32.GetSystemMetrics(76); vy = user32.GetSystemMetrics(77)
    vw = user32.GetSystemMetrics(78); vh = user32.GetSystemMetrics(79)
    nx = int((phys_x - vx) * 65535 / vw)
    ny = int((phys_y - vy) * 65535 / vh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),
                    ('mouseData',ctypes.c_ulong),('dwFlags',ctypes.c_ulong),
                    ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_ = ('_u',)
        _fields_ = [('type',ctypes.c_ulong),('_u',_U)]
    def send(flags):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000|0x4000); time.sleep(0.08)
    send(0x0002|0x8000|0x4000); time.sleep(0.05)
    send(0x0004|0x8000|0x4000)

def click(px, py, label=""):
    print(f"  click @ ({px},{py}) {label}")
    _sendinput_phys(px, py); time.sleep(0.1)

def find_devtools_hwnd():
    candidates = []
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
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

def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5); time.sleep(0.8)
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        mon = {"left":r.left,"top":r.top,"width":r.right-r.left,"height":r.bottom-r.top}
        img = sct.grab(mon); arr = np.array(img)
        b = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        p = os.path.join(OUT_DIR, filename); pil.save(p)
    print(f"  📸 {filename} brightness={b:.1f}")
    return b

hwnd = find_devtools_hwnd()
if not hwnd: print("ERROR: no devtools"); sys.exit(1)
user32.ShowWindow(hwnd, 9); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

r2 = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r2))
wl, wt = r2.left, r2.top
print(f"Window: ({wl},{wt})")

SIM_L = wl + 5; SIM_T = wt + 88; SIM_W = 520; SIM_H = 300

def sim(rx, ry, lbl=""):
    px = SIM_L + int(SIM_W * rx)
    py = SIM_T + int(SIM_H * ry)
    click(px, py, lbl); time.sleep(0.8)

# ─── 1. Reload ──────────────────────────────────────────
print("[1] Reload")
click(wl+597, wt+37, "reload")
time.sleep(5)
capture(hwnd, "STORY-00321-01-menu.png")

# ─── 2. Shop ────────────────────────────────────────────
print("[2] Navigate to shop")
sim(0.750, 0.495, "道具商店")
time.sleep(2)
capture(hwnd, "STORY-00320-01-shop.png")

# ─── 3. Back to menu ────────────────────────────────────
print("[3] Back to menu")
# Back button in shop: safe_left+12, safe_top+10, width=88, height=38
# In landscape simulator ~520x300: back button near (5%x, 12%y)
sim(0.04, 0.14, "back from shop")
time.sleep(1.5)
capture(hwnd, "STORY-00320-02-menu-after-shop.png")

# ─── 4. Level select ────────────────────────────────────
print("[4] Level select")
sim(0.750, 0.299, "挑战关卡")
time.sleep(1.5)
capture(hwnd, "STORY-00321-02-levels.png")

# ─── 5. Start level 1 ───────────────────────────────────
print("[5] Start level 1")
sim(0.114, 0.147, "L1 猎户座")
time.sleep(2)
capture(hwnd, "STORY-00321-03-game.png")

# ─── 6. Game screenshot (girl character visible) ─────────
time.sleep(2)
capture(hwnd, "STORY-00321-04-game-playing.png")

print("Quick QA screenshots done.")
