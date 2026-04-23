"""
Use WeChat DevTools console to navigate via JS eval instead of touch simulation.
Types JavaScript into the DEVTOOLS console to call navigation functions directly.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
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

def type_text(text):
    """Type text using keybd_event for each character."""
    import win32api, win32con
    for ch in text:
        vk = win32api.VkKeyScan(ch) & 0xFF
        win32api.keybd_event(vk, 0, 0, 0)
        time.sleep(0.02)
        win32api.keybd_event(vk, 0, win32con.KEYEVENTF_KEYUP, 0)
        time.sleep(0.02)

def press_enter():
    import win32api, win32con
    win32api.keybd_event(0x0D, 0, 0, 0)  # VK_RETURN
    time.sleep(0.05)
    win32api.keybd_event(0x0D, 0, win32con.KEYEVENTF_KEYUP, 0)

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

# Step 1: Open DEVTOOLS console
print("Step 1: Open DEVTOOLS console...")
si(1190, 995, "DEVTOOLS tab", d=1.0)
cap_full("jseval-01-console-open")

# Step 2: Click on the console input area
# The console input (>) is at the bottom of the DevTools console
# From screenshots, the ">" prompt is at approximately y=855 (absolute)
# and x somewhere in the middle of the DevTools panel
print("Step 2: Click console input...")
si(950, 855, "console-input", d=0.5)
cap_full("jseval-02-console-focused")

# Step 3: Type a JS command to check game state
print("Step 3: Type JS to check navigation...")
try:
    import win32clipboard
    # Use clipboard paste for reliable text input
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardText('console.log("JS_EVAL_TEST: G=" + typeof G + " G.SCREEN_W=" + (typeof G !== "undefined" ? G.SCREEN_W : "N/A"))')
    win32clipboard.CloseClipboard()

    import win32con, win32api
    # Ctrl+V to paste
    win32api.keybd_event(0x11, 0, 0, 0)  # VK_CONTROL down
    time.sleep(0.05)
    win32api.keybd_event(0x56, 0, 0, 0)  # V down
    time.sleep(0.05)
    win32api.keybd_event(0x56, 0, win32con.KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)
    win32api.keybd_event(0x11, 0, win32con.KEYEVENTF_KEYUP, 0)
    time.sleep(0.3)
    cap_full("jseval-03-text-typed")

    # Press Enter to execute
    press_enter()
    time.sleep(0.5)
    cap_full("jseval-04-after-enter")

    print("JS eval done!")
except ImportError:
    print("win32 not available, trying pyperclip...")
    try:
        import subprocess
        subprocess.run(['clip'], input='console.log("test")', text=True, check=True)
    except:
        print("ERROR: Cannot type into console")

print("DONE")
