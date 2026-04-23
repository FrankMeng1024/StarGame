"""
Use correct console coordinates: > input is at approximately (1010, 1115).
Test JS eval via paste+enter in DevTools console.
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
    r = subprocess.run(['powershell','-Command',f'Get-Content -Path "{tmp.name}" -Raw | Set-Clipboard'],
                      capture_output=True, text=True)
    os.unlink(tmp.name)
    return r.returncode == 0

def cap(name, region=None):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.3)
    rec = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rec))
    with mss.mss() as sct:
        if region:
            lx,ly,lw,lh = region
            m = {'left':rec.left+lx,'top':rec.top+ly,'width':lw,'height':lh}
        else:
            m = {'left':rec.left,'top':rec.top,'width':rec.right-rec.left,'height':rec.bottom-rec.top}
        img = sct.grab(m)
        pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
        os.makedirs('docs/qa/sprint28-evidence',exist_ok=True)
        path = f'docs/qa/sprint28-evidence/{name}.png'
        pil.save(path)
        print(f'  saved {name}.png')

user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Correct coordinates (verified from full-right-bottom.png crop analysis):
# DevTools tab bar: y=970, DevTools tab x≈1190
# Console sub-tab: y≈1000, x≈806
# Console > input: y≈1115, x≈1010
# Status bar (⊗ 0): y≈1165

print("Step 1: Click DEVTOOLS tab (1190, 970)...")
si(1190, 970, "DEVTOOLS-tab", d=0.8)
cap("js4-01-devtools", region=(730,700,700,500))

print("Step 2: Click Console sub-tab (1006, 1000)...")
si(1006, 1000, "Console-sub-tab", d=0.5)
cap("js4-02-console-tab", region=(730,700,700,500))

print("Step 3: Click console > input (1010, 1115)...")
si(1010, 1115, "console->-input", d=0.5)
cap("js4-03-input-clicked", region=(730,700,700,500))

print("Step 4: Paste and execute JS...")
js = 'typeof G + " W=" + (G ? G.SCREEN_W : "undef")'
if set_clipboard(js):
    ctrl_v()
    time.sleep(0.3)
    cap("js4-04-pasted", region=(730,700,700,500))
    press_enter()
    time.sleep(0.8)
    cap("js4-05-result", region=(730,700,700,500))
    print("  Executed!")

print("DONE")
