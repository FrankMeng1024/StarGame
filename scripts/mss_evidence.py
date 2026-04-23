"""
Capture game evidence screenshots - simulator is running!
Navigate through all screens and capture evidence
"""
import mss
import mss.tools
import ctypes
import ctypes.wintypes
import time
import sys
from PIL import Image

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
    time.sleep(0.3)

def click_at(screen_x, screen_y, delay=0.3):
    user32.SetCursorPos(screen_x, screen_y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_region(x, y, w, h, out_path):
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path} ({w}x{h})")

def capture_full(hwnd, out_path):
    x, y, w, h = get_window_rect(hwnd)
    if w <= 0: return 0, 0, 0, 0
    capture_region(x, y, w, h, out_path)
    return x, y, w, h

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# The simulator is at the right side of the window
# From mss-game-t01.png: simulator phone frame at approx window x=975-1275, y=90-755
# But window is now 1917x1200, so let's calculate simulator position
# The simulator appears at roughly 75% of the window width from left
sim_screen_x = wx + 970
sim_screen_y = wy + 90
sim_w = 295
sim_h = 660

print(f"\nCapturing simulator at ({sim_screen_x},{sim_screen_y}) {sim_w}x{sim_h}")

# Screenshot 1: Level Select screen (current state)
capture_region(sim_screen_x, sim_screen_y, sim_w, sim_h, f'{OUT_DIR}/STORY-00206-01-level-select.png')
# Also full window
capture_full(hwnd, f'{OUT_DIR}/STORY-00206-00-full.png')

# Click level 1 (白羊座) to start game
# Level 1 appears to be at approx window x=1000, y=185 -> screen (wx+1000, wy+185)
level1_x = sim_screen_x + 20  # Left col, first row
level1_y = sim_screen_y + 70  # Approximately level 1 position
print(f"\nClicking level 1 at ({level1_x},{level1_y})")
click_at(level1_x, level1_y, 1.0)
time.sleep(2)

# Capture game screen
capture_full(hwnd, f'{OUT_DIR}/STORY-00207-00-game-full.png')
capture_region(sim_screen_x, sim_screen_y, sim_w, sim_h, f'{OUT_DIR}/STORY-00207-01-game.png')

print("Done! Check the screenshots.")
