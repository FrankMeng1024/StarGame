"""
Virtual User screenshot capture for mini branch acceptance review.
Captures game simulator screenshots using mss (DXGI screen capture).
"""
import mss
import mss.tools
import ctypes
import ctypes.wintypes
import time
import sys
import os

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

def click_at(screen_x, screen_y, delay=0.5):
    user32.SetCursorPos(int(screen_x), int(screen_y))
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_region(x, y, w, h, out_path):
    with mss.mss() as sct:
        img = sct.grab({"top": int(y), "left": int(x), "width": int(w), "height": int(h)})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path}")

OUT_DIR = 'docs/virtual-user/sprint7-mini-flow'
os.makedirs(OUT_DIR, exist_ok=True)

hwnd = 7015796
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# DPI scaling: 150% -> logical coords = physical / 1.5
# Simulator panel: from Sprint 2-mini evidence at approx window-relative x=970, y=90, 295x660
# These are physical pixels
sim_x = wx + 970
sim_y = wy + 90
sim_w = 300
sim_h = 660

print(f"Simulator at ({sim_x},{sim_y}) {sim_w}x{sim_h}")

# flow-01: Main menu (current state)
time.sleep(1.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-01-menu.png')
print("flow-01: Main menu captured")

# Click [挑战关卡] button - approximately in center-left of screen
# Menu has two buttons; [挑战关卡] is roughly at y=45% of sim height, center x
btn_challenge_x = sim_x + sim_w * 0.5
btn_challenge_y = sim_y + sim_h * 0.45
click_at(btn_challenge_x, btn_challenge_y, 1.5)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-02-level-select.png')
print("flow-02: Level select captured")

# Click level 1 (should be in top-left area of the grid)
# Grid starts below header; level 1 is first cell
level1_x = sim_x + sim_w * 0.12
level1_y = sim_y + sim_h * 0.14
click_at(level1_x, level1_y, 2.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-03-game-start.png')
print("flow-03: Game screen captured")

# Wait a bit for animations, then capture game mid-play
time.sleep(2.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-04-game-midplay.png')
print("flow-04: Game mid-play captured")

# Tap to fire net
click_at(sim_x + sim_w * 0.5, sim_y + sim_h * 0.4, 1.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-05-net-fired.png')
print("flow-05: Net fired captured")

print("\nBasic screenshots done. Navigate to shop and gallery manually for more screenshots.")
print("Next: go back to main menu manually, then run flow-06+ captures")
