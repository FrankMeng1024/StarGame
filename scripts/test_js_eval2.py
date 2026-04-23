"""
Use WeChat DevTools console to execute JS by typing via ctypes SendInput keyboard.
Tests if we can navigate game via JS eval in console.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, subprocess
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

def send_key(vk, shift=False):
    """Send a single key via SendInput keyboard event."""
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]

    KEYEVENTF_KEYUP = 0x0002
    INPUT_KEYBOARD = 1

    if shift:
        inp = INP(type=INPUT_KEYBOARD); inp.ki.wVk = 0x10  # VK_SHIFT
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
        time.sleep(0.02)

    inp = INP(type=INPUT_KEYBOARD); inp.ki.wVk = vk
    ctypes.windll.user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INP))
    time.sleep(0.02)
    inp2 = INP(type=INPUT_KEYBOARD); inp2.ki.wVk = vk; inp2.ki.dwFlags = KEYEVENTF_KEYUP
    ctypes.windll.user32.SendInput(1, ctypes.byref(inp2), ctypes.sizeof(INP))
    time.sleep(0.02)

    if shift:
        inp3 = INP(type=INPUT_KEYBOARD); inp3.ki.wVk = 0x10; inp3.ki.dwFlags = KEYEVENTF_KEYUP
        ctypes.windll.user32.SendInput(1, ctypes.byref(inp3), ctypes.sizeof(INP))
        time.sleep(0.02)

def paste_text(text):
    """Copy text to clipboard via PowerShell, then Ctrl+V."""
    # Use PowerShell to set clipboard
    ps_cmd = f'Set-Clipboard -Value "{text}"'
    subprocess.run(['powershell', '-Command', ps_cmd], check=True, capture_output=True)
    time.sleep(0.2)
    # Ctrl+V
    send_key(0x11)  # VK_CONTROL down
    # Actually need to hold ctrl while pressing V - use a different approach
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    KEYEVENTF_KEYUP = 0x0002
    INPUT_KEYBOARD = 1

    # Press Ctrl
    ctrl_down = INP(type=INPUT_KEYBOARD); ctrl_down.ki.wVk = 0x11
    ctypes.windll.user32.SendInput(1, ctypes.byref(ctrl_down), ctypes.sizeof(INP))
    time.sleep(0.05)
    # Press V
    v_down = INP(type=INPUT_KEYBOARD); v_down.ki.wVk = 0x56
    ctypes.windll.user32.SendInput(1, ctypes.byref(v_down), ctypes.sizeof(INP))
    time.sleep(0.05)
    # Release V
    v_up = INP(type=INPUT_KEYBOARD); v_up.ki.wVk = 0x56; v_up.ki.dwFlags = KEYEVENTF_KEYUP
    ctypes.windll.user32.SendInput(1, ctypes.byref(v_up), ctypes.sizeof(INP))
    time.sleep(0.05)
    # Release Ctrl
    ctrl_up = INP(type=INPUT_KEYBOARD); ctrl_up.ki.wVk = 0x11; ctrl_up.ki.dwFlags = KEYEVENTF_KEYUP
    ctypes.windll.user32.SendInput(1, ctypes.byref(ctrl_up), ctypes.sizeof(INP))
    time.sleep(0.1)

def press_enter():
    class KI(ctypes.Structure):
        _fields_ = [('wVk', ctypes.c_ushort), ('wScan', ctypes.c_ushort),
                    ('dwFlags', ctypes.c_ulong), ('time', ctypes.c_ulong),
                    ('dwExtraInfo', ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('ki', KI)]
        _anonymous_ = ('u',); _fields_ = [('type', ctypes.c_ulong), ('u', U)]
    KEYEVENTF_KEYUP = 0x0002
    INPUT_KEYBOARD = 1

    down = INP(type=INPUT_KEYBOARD); down.ki.wVk = 0x0D
    ctypes.windll.user32.SendInput(1, ctypes.byref(down), ctypes.sizeof(INP))
    time.sleep(0.05)
    up = INP(type=INPUT_KEYBOARD); up.ki.wVk = 0x0D; up.ki.dwFlags = KEYEVENTF_KEYUP
    ctypes.windll.user32.SendInput(1, ctypes.byref(up), ctypes.sizeof(INP))

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

# Step 1: Ensure DEVTOOLS console is open
print("Step 1: Open DEVTOOLS console...")
si_mouse(1190, 995, "DEVTOOLS tab", d=1.0)
cap_full("jseval2-01-opened")

# Step 2: Click on console input prompt (the > area at bottom of DevTools panel)
# From screenshots, console input is at approximately y=855, in the DevTools panel (x~900)
print("Step 2: Click console input area (the > prompt)...")
si_mouse(950, 850, "console-prompt", d=0.5)
cap_full("jseval2-02-input-focused")

# Step 3: Type a simple JS command using clipboard
print("Step 3: Paste JS command...")
js_cmd = 'console.log("JSTEST: G=" + (typeof G) + " W=" + (typeof G !== "undefined" ? G.SCREEN_W : "undef"))'
paste_text(js_cmd)
time.sleep(0.3)
cap_full("jseval2-03-text-pasted")

# Step 4: Execute
print("Step 4: Press Enter to execute...")
press_enter()
time.sleep(1.0)
cap_full("jseval2-04-executed")

print("DONE")
