"""
Find and capture the simulator panel - click layout buttons to show simulator
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
    bring_to_front(hwnd)
    time.sleep(0.3)
    x, y, w, h = get_window_rect(hwnd)
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path}")
    return x, y, w, h

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# The layout with Mini Game Mode:
# The simulator view button is at the top right - single panel icon
# In Mini Game Mode, there's a layout switch button at approx window x=1100, y=69
# Let me click the right-most layout button (simulator only) which is at ~(1148, 69)
layout_sim_btn_x = wx + 1148
layout_sim_btn_y = wy + 69
print(f"Clicking simulator-only layout at ({layout_sim_btn_x},{layout_sim_btn_y})")
click_at(layout_sim_btn_x, layout_sim_btn_y)
time.sleep(1)
wx, wy, ww, wh = capture_full(hwnd, f'{OUT_DIR}/mss-layout-sim-only.png')

# Also try the middle layout button
layout_mid_btn_x = wx + 1107
print(f"Clicking middle layout at ({layout_mid_btn_x},{layout_sim_btn_y})")
click_at(layout_mid_btn_x, layout_sim_btn_y)
time.sleep(1)
capture_full(hwnd, f'{OUT_DIR}/mss-layout-mid.png')
