"""
Navigate to Level 1 game, then click top-left area to trigger instant victory.
Uses canvas_click with rx=0.07, ry=0.07 → maps to ~CSS (27, 27) which is < 60.
"""
import sys, os, time, subprocess
import ctypes, ctypes.wintypes
import mss, numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
user32 = ctypes.windll.user32
SCALE = 1.0
OUT_DIR = r'C:\ClaudeCodeProjects\StarGame\docs\virtual-user\sprint29-mini-flow'
os.makedirs(OUT_DIR, exist_ok=True)

def find_devtools_hwnd():
    candidates = []
    def callback(hwnd, _):
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
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]

def find_canvas(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w,win_h = r.right-r.left, r.bottom-r.top
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":win_w,"height":win_h})
        arr = np.array(img)[:,:,:3][...,::-1]
    col = arr[:,min(150,win_w//9),:].mean(axis=1)
    cy_top = next((y for y in range(90,win_h) if col[y]<35), None)
    if cy_top is None: return (13,137,975,450)
    cy_bottom = next((y for y in range(cy_top+100,win_h) if col[y]>55), cy_top+450)-1
    cx,cy,cw,ch = 13, cy_top, int(win_w*0.772)-13, cy_bottom-cy_top
    return (cx,cy,cw,ch) if cw>=200 and ch>=100 else (13,137,975,450)

def capture(hwnd, fn):
    user32.ShowWindow(hwnd,5); user32.SetForegroundWindow(hwnd); time.sleep(0.8)
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":r.right-r.left,"height":r.bottom-r.top})
        arr = np.array(img); b = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        pil.save(os.path.join(OUT_DIR,fn))
    print(f'  {fn} b={b:.1f} size={pil.size}')
    return b

def canvas_click(hwnd, canvas, rx, ry, label=''):
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    phys_x = r.left+canvas[0]+int(canvas[2]*rx)
    phys_y = r.top+canvas[1]+int(canvas[3]*ry)
    lx,ly = int(phys_x/SCALE), int(phys_y/SCALE)
    user32.SetCursorPos(lx,ly); time.sleep(0.15)
    user32.mouse_event(0x0002,0,0,0,0); time.sleep(0.05); user32.mouse_event(0x0004,0,0,0,0)
    if label: print(f'  Click {label} @ ratio({rx:.3f},{ry:.3f}) log({lx},{ly})')

def click_log(lx, ly, label=''):
    user32.SetCursorPos(int(lx),int(ly)); time.sleep(0.2)
    user32.mouse_event(0x0002,0,0,0,0); user32.mouse_event(0x0004,0,0,0,0)
    if label: print(f'  Click {label} @ log({lx},{ly})')

hwnd = find_devtools_hwnd()
r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f'hwnd={hwnd} window=({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')
user32.ShowWindow(hwnd,5); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

# Reload + wait for intro
click_log(r.left+921, r.top+70, 'reload')
print('Waiting 21s...')
time.sleep(21)
canvas = find_canvas(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
print(f'Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
capture(hwnd, 'flow-70-menu.png')

# 挑战关卡
canvas_click(hwnd, canvas, 0.775, 0.289, '挑战关卡')
time.sleep(2.5)
canvas = find_canvas(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
capture(hwnd, 'flow-71-level-select.png')

# Level 1
canvas_click(hwnd, canvas, 0.130, 0.277, 'Level 1')
time.sleep(3.5)  # wait for game to fully start
canvas = find_canvas(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
capture(hwnd, 'flow-72-game-start.png')

# Click top-left area of canvas → game CSS coords (27, 27) → tx<60 ✓
# canvas[2]=975, CSS width=390, scale=975/390=2.5
# Click at display pixel 75 from canvas left → CSS x = 75/2.5 = 30 < 60 ✓
# rx = 75/975 = 0.077
print('Triggering instant victory via cheat click...')
canvas_click(hwnd, canvas, 0.077, 0.077, 'CHEAT victory trigger')
time.sleep(0.3)
capture(hwnd, 'flow-73-after-cheat.png')
time.sleep(2.0)
capture(hwnd, 'flow-74-victory-anim.png')
time.sleep(2.0)
capture(hwnd, 'flow-75-victory-screen.png')
time.sleep(2.0)
capture(hwnd, 'flow-76-victory-screen2.png')

print('Done!')
