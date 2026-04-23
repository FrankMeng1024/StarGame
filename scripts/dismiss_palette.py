"""
Dismiss the command palette overlay by pressing Escape multiple times,
then verify the console is usable.
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

def send_key(vk, flags=0):
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    inp = INP(type=1); inp.ki.wVk = vk; inp.ki.dwFlags = flags
    ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
    time.sleep(0.04)

def press_escape():
    send_key(0x1B, 0); send_key(0x1B, 2)

def set_clipboard(text):
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    tmp.write(text)
    tmp.close()
    ps_cmd = f'Get-Content -Path "{tmp.name}" -Raw | Set-Clipboard'
    result = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True)
    os.unlink(tmp.name)
    return result.returncode == 0

def ctrl_v():
    send_key(0x11, 0); send_key(0x56, 0); send_key(0x56, 2); send_key(0x11, 2)

def press_enter():
    send_key(0x0D, 0); send_key(0x0D, 2)

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

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Step 1: Click SOMEWHERE in the DevTools panel first (not the game side)
# to give DevTools keyboard focus
print("Step 1: Give DevTools keyboard focus by clicking in its area...")
# Click in the console output area (the gray DevTools area, not command palette)
# DevTools panel: x=730..1920, console output: y=760..815
si_mouse(1000, 798, "devtools-console-output", d=0.5)
cap_full("escape-01-before")

# Step 2: Press Escape multiple times to dismiss any overlay
print("Step 2: Press Escape 3x to dismiss overlays...")
for i in range(3):
    press_escape()
    time.sleep(0.2)
cap_full("escape-02-after-esc")

# Step 3: Click console > input
print("Step 3: Click console > input...")
si_mouse(760, 818, "console-input->", d=0.3)
cap_full("escape-03-input-click")

# Step 4: Type and execute
print("Step 4: Paste and execute JS...")
js = 'typeof G + " " + (G ? G.SCREEN_W : "?")'
if set_clipboard(js):
    ctrl_v()
    time.sleep(0.3)
    cap_full("escape-04-pasted")
    press_enter()
    time.sleep(0.8)
    cap_full("escape-05-result")

print("DONE")
