"""
Capture game screens using mss - game is now running
Navigate through screens and capture evidence
"""
import mss
import mss.tools
import ctypes
import ctypes.wintypes
import time
import sys
import os
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
    time.sleep(0.5)

def click_at(screen_x, screen_y):
    user32.SetCursorPos(screen_x, screen_y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.3)

def capture_full(hwnd, out_path):
    bring_to_front(hwnd)
    time.sleep(0.3)
    x, y, w, h = get_window_rect(hwnd)
    if w <= 0: return
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Full capture: {out_path} ({w}x{h})")
    return x, y, w, h

def capture_region(x, y, w, h, out_path):
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Region capture: {out_path} ({w}x{h})")

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# The screenshot shows simulator is on the right side
# Window is 1278x800 at (1,0) on primary monitor
# Simulator panel appears to start around x=965 in window coords (screen x=966)
# Simulator phone frame appears to be approximately from screen (970, 95) to (1260, 745)

# Based on the mss-mini-game-btn.png screenshot:
# The phone simulator frame is at roughly window x=965-1280, y=90-755
# That's screen coords x=966-1279, y=90-755 (since window is at 1,0)

# The actual game canvas inside the phone is smaller
# Let's capture the full window first to see current state
capture_full(hwnd, f'{OUT_DIR}/STORY-00206-00-levels.png')

# Now identify simulator region more precisely
# Simulator phone appears to be at window coords ~965-1255, 90-745
sim_screen_x = wx + 965
sim_screen_y = wy + 90
sim_w = 290
sim_h = 660

print(f"\nCapturing simulator area at ({sim_screen_x},{sim_screen_y}) {sim_w}x{sim_h}")
capture_region(sim_screen_x, sim_screen_y, sim_w, sim_h, f'{OUT_DIR}/STORY-00206-01-levels-sim.png')

print("\nCapture complete!")
