"""
Trigger Mini Game mode then capture immediately before window loses focus
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
    time.sleep(0.5)

def click_at(screen_x, screen_y, delay=0.3):
    user32.SetCursorPos(screen_x, screen_y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_full(hwnd, out_path):
    x, y, w, h = get_window_rect(hwnd)
    if w <= 0: return 0, 0, 0, 0
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path} ({w}x{h}) @({x},{y})")
    return x, y, w, h

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

# Step 1: bring to front
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# Step 2: Click Mini Game button at top bar ~(908, 25) to activate simulator
mini_game_btn_x = wx + 908
mini_game_btn_y = wy + 25
print(f"Clicking Mini Game button at ({mini_game_btn_x},{mini_game_btn_y})")
click_at(mini_game_btn_x, mini_game_btn_y, 0.1)

# Step 3: IMMEDIATELY capture - before anything changes
time.sleep(0.5)

# Capture multiple times to get different states
for i in range(5):
    time.sleep(0.5)
    out = f'{OUT_DIR}/mss-game-t{i:02d}.png'
    wx2, wy2, ww2, wh2 = capture_full(hwnd, out)
    if ww2 != ww:
        print(f"  Window changed size: {ww}x{wh} -> {ww2}x{wh2} at ({wx2},{wy2})")
        wx, wy, ww, wh = wx2, wy2, ww2, wh2

print("Done!")
