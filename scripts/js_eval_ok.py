"""
Correct JS eval approach:
- Use SW_RESTORE (9) once at start
- Console > input is at (760, 818) absolute
- DEVTOOLS tab is at (1190, 722+7=729... wait, let me re-check)

From restored-window.png analysis:
- DevTools tab bar y≈722: 'BUILD 15 | DEVTOOLS | PROBLEMS...'
- Console sub-tab y≈754
- Console log text y≈798
- '>' input y≈818
- '⊗ 0' status bar y≈853

DEVTOOLS tab x position: 'BUILD' at x≈760, 'DEVTOOLS' at x≈866
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

def si(px, py, label="", d=0.3):
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
        _fields_ = [('wVk',ctypes.c_ushort),('wScan',ctypes.c_ushort),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),
                    ('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki',KI)]
        _anonymous_=('u',); _fields_=[('type',ctypes.c_ulong),('u',U)]
    inp = INP(type=1); inp.ki.wVk=vk; inp.ki.dwFlags=flags
    ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
    time.sleep(0.04)

def ctrl_v():
    send_key(0x11); send_key(0x56); send_key(0x56,2); send_key(0x11,2)

def press_enter():
    send_key(0x0D); send_key(0x0D,2)

def set_clipboard(text):
    tmp = tempfile.NamedTemporaryFile(mode='w',suffix='.txt',delete=False,encoding='utf-8')
    tmp.write(text); tmp.close()
    r = subprocess.run(['powershell','-Command',
                        f'Get-Content -Path "{tmp.name}" -Raw | Set-Clipboard'],
                      capture_output=True, text=True)
    os.unlink(tmp.name)
    return r.returncode == 0

def cap(name):
    """Capture without calling ShowWindow to avoid minimize side-effect."""
    time.sleep(0.3)
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {'left':r.left,'top':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs('docs/qa/sprint28-evidence',exist_ok=True)
        path = f'docs/qa/sprint28-evidence/{name}.png'
        pil.save(path)
        print(f'  saved {name}.png')

# Restore window ONCE at start
user32.ShowWindow(hwnd, 9)   # SW_RESTORE
time.sleep(0.5)
user32.SetForegroundWindow(hwnd)
time.sleep(0.5)

# Confirmed coordinates from restored-window.png (1920x1200 screen, window at 0,0):
# DEVTOOLS tab: x≈866, y≈722  (but dims screenshots used 1190,995 — let me check both)
# From the screenshot: 'BUILD'=x760 'DEVTOOLS'=x866 based on tab bar
# But previously confirmed DEVTOOLS tab works at (1190, 995)...
# Wait - previous script used hwnd=1312814 and different layout
# Let me use (866, 729) for DEVTOOLS tab

print("Step 1: Click DEVTOOLS tab...")
# From restored-window.png: DevTools tab bar row is at y≈722, DEVTOOLS text at x≈866
si(866, 729, "DEVTOOLS-tab", d=0.8)
cap("jsok-01-devtools")

print("Step 2: Click Console sub-tab...")
# Console sub-tab at y≈754, x≈806
si(806, 754, "Console-subtab", d=0.5)
cap("jsok-02-console")

print("Step 3: Click the > input line at (760, 818)...")
si(760, 818, "console->-input", d=0.5)
cap("jsok-03-input")

print("Step 4: Paste JS and execute...")
js = 'typeof G + " W=" + (G ? G.SCREEN_W : "undef")'
if set_clipboard(js):
    ctrl_v()
    time.sleep(0.3)
    cap("jsok-04-pasted")
    press_enter()
    time.sleep(1.0)
    cap("jsok-05-result")
    print("  Executed!")

print("DONE")
