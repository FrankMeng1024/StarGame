"""
Dismiss command palette, then click console input > and paste JS.
The DevTools panel is at the BOTTOM-RIGHT of the 1920x1200 screen.
Console > input is at approximately (750, 820) absolute.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, subprocess, tempfile
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
hwnd = 1312814

def si_mouse(px, py, label="", d=0.3):
    nx = int(px * 65535 / sw); ny = int(py * 65535 / sh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_=('u',); _fields_=[('type',ctypes.c_ulong),('u',U)]
    def send(f):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=f
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000); time.sleep(0.08); send(0x0002|0x8000); time.sleep(0.05); send(0x0004|0x8000)
    time.sleep(d)
    if label: print(f"  click ({px},{py}) -> {label}")

def send_key_combo(*vk_flags):
    """Send key combo. Each element is (vk, flags) where flags=0=down, 2=up."""
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    KB = 1
    for vk, flags in vk_flags:
        inp = INP(type=KB); inp.ki.wVk = vk; inp.ki.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
        time.sleep(0.04)

def press_escape():
    send_key_combo((0x1B, 0), (0x1B, 2))  # VK_ESCAPE

def ctrl_v():
    send_key_combo((0x11, 0), (0x56, 0), (0x56, 2), (0x11, 2))

def press_enter():
    send_key_combo((0x0D, 0), (0x0D, 2))

def set_clipboard(text):
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    tmp.write(text)
    tmp.close()
    ps_cmd = f'Get-Content -Path "{tmp.name}" -Raw | Set-Clipboard'
    result = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True)
    os.unlink(tmp.name)
    if result.returncode != 0:
        print(f"  clipboard error: {result.stderr}")
        return False
    return True

def cap_full(name):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.4)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

def cap_console(name):
    """Crop just the console input area."""
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        # DevTools console panel: right half, bottom portion
        # x: 730..1390 (660px wide), y: 790..870 (80px - just the input area)
        m = {"left": r.left+730, "top": r.top+790, "width": 660, "height": 80}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
        path = f"docs/qa/sprint28-evidence/{name}.png"
        pil.save(path)
        print(f"  saved {name}.png")

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Step 1: Press Escape to dismiss command palette if open
print("Step 1: Dismiss command palette (Escape)...")
press_escape()
time.sleep(0.3)
cap_full("input-01-after-esc")

# Step 2: Click the Console tab to make sure console is active
print("Step 2: Click DEVTOOLS then Console tab...")
si_mouse(1190, 995, "DEVTOOLS tab", d=0.8)
cap_full("input-02-devtools")

# Step 3: Click specifically on the Console sub-tab (inside the DevTools panel)
# From screenshot: Console tab is in the sub-tab bar at approximately y=754, x=806
si_mouse(806, 754, "Console sub-tab", d=0.5)
cap_full("input-03-console-tab")

# Step 4: Now click the console INPUT line
# The > prompt appears at the bottom row of the console
# From screenshot, the console output area shows the log at y≈798
# The > input cursor line should be at y≈820
# The console panel x starts at ~730+12=742
print("Step 4: Click console > input line...")
si_mouse(760, 820, "console-input-line", d=0.5)
cap_console("input-04-input-focused")
cap_full("input-04b-full")

# Step 5: Paste and execute simple JS
print("Step 5: Paste JS command...")
js = 'typeof G + " W=" + (G ? G.SCREEN_W : "undef")'
if set_clipboard(js):
    ctrl_v()
    time.sleep(0.3)
    cap_console("input-05-pasted")
    press_enter()
    time.sleep(0.5)
    cap_full("input-06-result")
    print("  Executed!")

print("DONE")
