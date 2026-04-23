"""
Try clicking the DevTools layout buttons and simulator to get game running
"""
import mss
import mss.tools
import ctypes
import ctypes.wintypes
import time
import sys

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

def get_window_rect(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.left, r.top, r.right - r.left, r.bottom - r.top

def bring_to_front(hwnd):
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(0.8)

def click_at(screen_x, screen_y):
    user32.SetCursorPos(screen_x, screen_y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP
    time.sleep(0.2)

def capture(hwnd, out_path):
    bring_to_front(hwnd)
    x, y, w, h = get_window_rect(hwnd)
    if w <= 0: return
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"Saved {out_path}")

hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796
OUT_DIR = 'docs/qa/sprint2-mini-evidence'

bring_to_front(hwnd)
x, y, w, h = get_window_rect(hwnd)
print(f"DevTools at ({x},{y}) {w}x{h}")

# The layout button at top-right: three icons at ~(1065,69), (1107,69), (1148,69)
# Click the first one (simulator view layout button)
layout_btn_x = x + 1065
layout_btn_y = y + 69
print(f"Clicking layout button 1 at ({layout_btn_x},{layout_btn_y})")
click_at(layout_btn_x, layout_btn_y)
time.sleep(2)
capture(hwnd, f'{OUT_DIR}/mss-layout1.png')

time.sleep(1)

# Click layout button 2 (maybe it shows simulator panel)
layout_btn2_x = x + 1107
print(f"Clicking layout button 2 at ({layout_btn2_x},{layout_btn_y})")
click_at(layout_btn2_x, layout_btn_y)
time.sleep(2)
capture(hwnd, f'{OUT_DIR}/mss-layout2.png')

time.sleep(1)

# Try clicking "Mini Game ..." dropdown
mini_game_x = x + 908
mini_game_y = y + 25
print(f"Clicking Mini Game button at ({mini_game_x},{mini_game_y})")
click_at(mini_game_x, mini_game_y)
time.sleep(1)
capture(hwnd, f'{OUT_DIR}/mss-mini-game-btn.png')
