"""
nav_gallery.py — Navigate to gallery screen and take screenshot
"""
import ctypes, ctypes.wintypes as wt, time, mss, numpy as np, subprocess, os, sys
from PIL import Image

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32

# Find hwnd
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
found = []
def cb(hwnd, _):
    if not user32.IsWindowVisible(hwnd): return True
    pid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        proc = subprocess.run(['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
            capture_output=True, text=True, timeout=2, encoding='utf-8', errors='ignore')
        if 'wechatdevtools' in proc.stdout.lower():
            tb = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, tb, 256)
            if tb.value: found.append((hwnd, tb.value))
    except: pass
    return True

user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found:
    print('[FAIL] DevTools not found')
    sys.exit(1)

hwnd = found[0][0]
print(f'hwnd={hwnd}')

# Bring to front
user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(2.0)

# Get window rect
r = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
wx, wy = r.left, r.top
print(f'window origin: ({wx},{wy})')

MOUSEEVENTF_ABSOLUTE = 0x8000
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
KEYEVENTF_KEYUP = 0x0002

class MI(ctypes.Structure):
    _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
               ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
class KI(ctypes.Structure):
    _fields_ = [('wVk',ctypes.c_ushort),('wScan',ctypes.c_ushort),('dwFlags',ctypes.c_ulong),
               ('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
class IU(ctypes.Union):
    _fields_ = [('mi',MI),('ki',KI)]
class INPUT(ctypes.Structure):
    _anonymous_ = ('_u',)
    _fields_ = [('type',ctypes.c_ulong),('_u',IU)]

def click_phys(px, py):
    nx = int(px * 65535 // 1920)
    ny = int(py * 65535 // 1200)
    inp = (INPUT*3)()
    for i,(f,dx,dy) in enumerate([
        (MOUSEEVENTF_MOVE|MOUSEEVENTF_ABSOLUTE, nx, ny),
        (MOUSEEVENTF_LEFTDOWN|MOUSEEVENTF_ABSOLUTE, nx, ny),
        (MOUSEEVENTF_LEFTUP|MOUSEEVENTF_ABSOLUTE, nx, ny)
    ]):
        inp[i].type=0; inp[i].mi.dwFlags=f; inp[i].mi.dx=dx; inp[i].mi.dy=dy
    user32.SendInput(3, inp, ctypes.sizeof(INPUT))

def key(vk, up=False):
    inp = INPUT(); inp.type=1; inp.ki.wVk=vk
    if up: inp.ki.dwFlags=KEYEVENTF_KEYUP
    user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

# Step 1: Reload simulator
abs_reload_x = wx + 484
abs_reload_y = wy + 42
print(f'Clicking reload at ({abs_reload_x},{abs_reload_y})')
click_phys(abs_reload_x, abs_reload_y)
time.sleep(3.5)

# Step 2: Skip intro by clicking center of simulator
# Simulator canvas: win(14,137) 975x290
sim_center_x = wx + 14 + 975//2
sim_center_y = wy + 137 + 290//2
print(f'Clicking intro skip at ({sim_center_x},{sim_center_y})')
click_phys(sim_center_x, sim_center_y)
time.sleep(0.5)
click_phys(sim_center_x, sim_center_y)
time.sleep(1.5)

# Screenshot current state
with mss.mss() as sct:
    monitor = {'left':wx, 'top':wy, 'width':r.right-r.left, 'height':r.bottom-r.top}
    img = sct.grab(monitor)
    arr = np.array(img)[:,:,:3]
    os.makedirs('docs/qa/sprint46-evidence', exist_ok=True)
    Image.fromarray(arr).save('docs/qa/sprint46-evidence/nav-state1.png')
    print(f'After reload brightness={arr.mean():.1f}')

# Step 3: Click console input and type wx.__navigate('gallery')
# Console input at physical (wx+960+, wy+807)
console_x = wx + 1060
console_y = wy + 807
print(f'Clicking console at ({console_x},{console_y})')
click_phys(console_x, console_y)
time.sleep(0.5)

# Use clipboard to paste command
import subprocess as sp
cmd = "wx.__navigate('gallery')"
sp.run(['powershell', '-command', f'Set-Clipboard -Value "{cmd}"'],
       capture_output=True)
time.sleep(0.3)

# Ctrl+A, Ctrl+V, Enter
key(0x11); key(0x41); key(0x41,True); key(0x11,True); time.sleep(0.1)
key(0x11); key(0x56); key(0x56,True); key(0x11,True); time.sleep(0.3)
key(0x0D); key(0x0D,True)
time.sleep(1.5)

# Screenshot final state
with mss.mss() as sct:
    monitor = {'left':wx, 'top':wy, 'width':r.right-r.left, 'height':r.bottom-r.top}
    img = sct.grab(monitor)
    arr = np.array(img)[:,:,:3]
    Image.fromarray(arr).save('docs/qa/sprint46-evidence/STORY-00349-01-gallery-list.png')
    print(f'Gallery brightness={arr.mean():.1f}')

print('Done')
