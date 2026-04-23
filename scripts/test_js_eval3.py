"""
Use WeChat DevTools console to execute JS navigation.
Writes JS to a temp file, then uses PowerShell to set clipboard from file.
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

def set_clipboard(text):
    """Set clipboard via PowerShell using a temp file to avoid quote issues."""
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    tmp.write(text)
    tmp.close()
    # Use Get-Content to read from file into clipboard
    ps_cmd = f'Get-Content -Path "{tmp.name}" -Raw | Set-Clipboard'
    result = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True)
    os.unlink(tmp.name)
    if result.returncode != 0:
        print(f"  clipboard error: {result.stderr}")
        return False
    return True

def ctrl_v():
    """Ctrl+V paste via SendInput."""
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    KEY_UP = 0x0002; KB = 1
    for vk, flags in [(0x11,0),(0x56,0),(0x56,KEY_UP),(0x11,KEY_UP)]:
        inp = INP(type=KB); inp.ki.wVk = vk; inp.ki.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
        time.sleep(0.04)

def press_enter():
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    KEY_UP = 0x0002; KB = 1
    for vk, flags in [(0x0D,0),(0x0D,KEY_UP)]:
        inp = INP(type=KB); inp.ki.wVk = vk; inp.ki.dwFlags = flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
        time.sleep(0.05)

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

# Step 1: Ensure DEVTOOLS console is open and click on the console input (> prompt)
print("Step 1: Open DEVTOOLS console...")
si_mouse(1190, 995, "DEVTOOLS tab", d=1.0)
cap_full("jseval3-01-opened")

# The console input ">" prompt is at the very bottom of the console panel
# From screenshots, the DevTools console occupies y=700..870 in the window
# The "> " prompt should be at approximately y=852, x=755 (start of input line)
print("Step 2: Click the console input prompt '>'...")
si_mouse(850, 852, "console-input-prompt", d=0.5)
cap_full("jseval3-02-input-clicked")

# Test 1: Simple G check
print("Step 3: JS eval - check G global...")
js1 = 'typeof G + " W=" + (G && G.SCREEN_W)'
if set_clipboard(js1):
    ctrl_v()
    time.sleep(0.3)
    cap_full("jseval3-03-text-pasted")
    press_enter()
    time.sleep(0.8)
    cap_full("jseval3-04-result")
    print("  JS eval sent!")

print("DONE")
