"""
Navigate to Level 1, then IMMEDIATELY click top-left corner to trigger victory.
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
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL
            ).decode('utf-8', 'replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w, h = r.right-r.left, r.bottom-r.top
                if w > 400 and h > 400:
                    candidates.append((hwnd, w*h))
        except: pass
        return True
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    if not candidates: return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]

def find_canvas_bounds(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right-r.left; win_h = r.bottom-r.top
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":win_w,"height":win_h})
        arr = np.array(img)[:,:,:3][...,::-1]
    col = arr[:,min(150,win_w//9),:].mean(axis=1)
    cy_top = next((y for y in range(90,win_h) if col[y]<35), None)
    if cy_top is None: return (13,137,975,450)
    cy_bottom = next((y for y in range(cy_top+100,win_h) if col[y]>55), cy_top+450)-1
    cx,cy,cw,ch = 13, cy_top, int(win_w*0.772)-13, cy_bottom-cy_top
    return (cx,cy,cw,ch) if cw>=200 and ch>=100 else (13,137,975,450)

def capture(hwnd, filename):
    user32.ShowWindow(hwnd, 5); user32.SetForegroundWindow(hwnd); time.sleep(0.8)
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":r.right-r.left,"height":r.bottom-r.top})
        arr = np.array(img); b = float(arr.mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename); pil.save(path)
    print(f'  {filename} b={b:.1f} size={pil.size}')
    return b, path

def canvas_click(hwnd, canvas, rx, ry, label=''):
    r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
    phys_x = r.left+canvas[0]+int(canvas[2]*rx); phys_y = r.top+canvas[1]+int(canvas[3]*ry)
    lx = int(phys_x/SCALE); ly = int(phys_y/SCALE)
    user32.SetCursorPos(lx,ly); time.sleep(0.15)
    user32.mouse_event(0x0002,0,0,0,0); time.sleep(0.05); user32.mouse_event(0x0004,0,0,0,0)
    if label: print(f'  Click {label} @ log({lx},{ly})')

def click_logical(lx, ly, label=''):
    user32.SetCursorPos(int(lx),int(ly)); time.sleep(0.2)
    user32.mouse_event(0x0002,0,0,0,0); user32.mouse_event(0x0004,0,0,0,0)
    if label: print(f'  Click {label} @ log({lx},{ly})')

hwnd = find_devtools_hwnd()
r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f'hwnd={hwnd} window=({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')
user32.ShowWindow(hwnd,5); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

canvas = find_canvas_bounds(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
print(f'Canvas: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')

# Reload
user32.GetWindowRect(hwnd, ctypes.byref(r))
click_logical(r.left+921, r.top+70, 'reload')
print('Waiting 21s for intro...')
time.sleep(21)
canvas = find_canvas_bounds(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
print(f'Canvas after reload: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
capture(hwnd, 'flow-60-menu.png')

# Click 挑战关卡
canvas_click(hwnd, canvas, 0.775, 0.289, '挑战关卡')
time.sleep(2.5)
canvas = find_canvas_bounds(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
print(f'Canvas after level-select: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
capture(hwnd, 'flow-61-level-select.png')

# Click Level 1
canvas_click(hwnd, canvas, 0.130, 0.277, 'Level 1')
time.sleep(3.0)
canvas = find_canvas_bounds(hwnd)
if canvas[2]>=1100: canvas=(13,137,975,450)
print(f'Canvas after game: ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')
capture(hwnd, 'flow-62-game-start.png')

# IMMEDIATELY click top-left corner to trigger instant victory
print('Triggering instant victory...')
canvas_click(hwnd, canvas, 0.005, 0.010, 'CHEAT top-left')
time.sleep(0.5)
capture(hwnd, 'flow-63-victory-anim.png')
time.sleep(1.5)
capture(hwnd, 'flow-64-victory-anim2.png')
time.sleep(2.0)
capture(hwnd, 'flow-65-victory-screen.png')
time.sleep(2.0)
capture(hwnd, 'flow-66-victory-screen2.png')

print('Done - check flow-65/66 for victory')
