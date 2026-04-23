"""
Navigate to Level 1 game, then click top-left area to trigger instant victory.
Uses hardcoded canvas fallback like mss_navigate.py.
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

CANVAS_FALLBACK = (13, 137, 975, 450)

def find_canvas(hwnd):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w,win_h = r.right-r.left, r.bottom-r.top
    with mss.mss() as sct:
        img = sct.grab({"left":r.left,"top":r.top,"width":win_w,"height":win_h})
        arr = np.array(img)[:,:,:3][...,::-1]
    col = arr[:,min(150,win_w//9),:].mean(axis=1)
    cy_top = next((y for y in range(90,win_h) if col[y]<35), None)
    if cy_top is None: return CANVAS_FALLBACK
    cy_bottom = next((y for y in range(cy_top+100,win_h) if col[y]>55), cy_top+450)-1
    cx,cy,cw,ch = 13, cy_top, int(win_w*0.772)-13, cy_bottom-cy_top
    # Validate: must be a reasonable canvas size
    if cw>=200 and ch>=200 and cw<1100:
        return (cx,cy,cw,ch)
    return CANVAS_FALLBACK

def capture(hwnd, fn):
    user32.ShowWindow(hwnd,5); user32.SetForegroundWindow(hwnd); time.sleep(1.0)
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
    print(f'  Click {label} @ ratio({rx:.3f},{ry:.3f}) log({lx},{ly})')

def click_log(lx, ly, label=''):
    user32.SetCursorPos(int(lx),int(ly)); time.sleep(0.2)
    user32.mouse_event(0x0002,0,0,0,0); user32.mouse_event(0x0004,0,0,0,0)
    print(f'  Click {label} @ log({lx},{ly})')

hwnd = find_devtools_hwnd()
r = ctypes.wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f'hwnd={hwnd} window=({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}')
user32.ShowWindow(hwnd,5); user32.SetForegroundWindow(hwnd); time.sleep(1.5)

# Force canvas to fallback
canvas = CANVAS_FALLBACK
print(f'Canvas (forced fallback): ({canvas[0]},{canvas[1]}) {canvas[2]}x{canvas[3]}')

# Reload + wait
user32.GetWindowRect(hwnd, ctypes.byref(r))
click_log(r.left+921, r.top+70, 'reload')
print('Waiting 21s for intro...')
time.sleep(21)
capture(hwnd, 'flow-80-menu.png')

# 挑战关卡 — from mss_navigate.py: rx=0.775, ry=0.289
canvas_click(hwnd, canvas, 0.775, 0.289, '挑战关卡')
time.sleep(3.0)

# After 挑战关卡, window may have gone fullscreen. Re-detect.
new_canvas = find_canvas(hwnd)
print(f'Canvas after 挑战关卡: ({new_canvas[0]},{new_canvas[1]}) {new_canvas[2]}x{new_canvas[3]}')
if new_canvas[2] < 1100 and new_canvas[3] >= 200:
    canvas = new_canvas
else:
    canvas = CANVAS_FALLBACK
capture(hwnd, 'flow-81-level-select.png')

# Level 1 — rx=0.130, ry=0.277
canvas_click(hwnd, canvas, 0.130, 0.277, 'Level 1')
time.sleep(3.5)

new_canvas = find_canvas(hwnd)
print(f'Canvas after Level 1: ({new_canvas[0]},{new_canvas[1]}) {new_canvas[2]}x{new_canvas[3]}')
if new_canvas[2] < 1100 and new_canvas[3] >= 200:
    canvas = new_canvas
else:
    canvas = CANVAS_FALLBACK
capture(hwnd, 'flow-82-game.png')

# Verify we're in game by checking score display (HUD visible)
# Now click top-left corner of canvas. 
# canvas[2]=975, iPhone CSS width=390, scale=975/390=2.5
# rx=0.077 → display x = 75 px → CSS x = 75/2.5 = 30 → tx=30 < 60 ✓
# ry=0.077 → display y = 34 px → CSS y = 34/2.5 = 13.6 → ty=14 < 60 ✓
print('Triggering victory cheat...')
for attempt in range(3):
    canvas_click(hwnd, canvas, 0.077, 0.077, f'CHEAT attempt {attempt+1}')
    time.sleep(0.5)

capture(hwnd, 'flow-83-after-cheat.png')
time.sleep(2.0)
capture(hwnd, 'flow-84-victory1.png')
time.sleep(2.0)
capture(hwnd, 'flow-85-victory2.png')
time.sleep(2.0)
capture(hwnd, 'flow-86-victory3.png')

print('Done!')
