"""
Close the code analysis tab and switch to simulator view.
"""
import mss
import mss.tools
import ctypes
import time
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
    time.sleep(0.3)

def click_at(screen_x, screen_y, delay=0.5):
    user32.SetCursorPos(int(screen_x), int(screen_y))
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_full(hwnd, out_path):
    wx, wy, ww, wh = get_window_rect(hwnd)
    with mss.mss() as sct:
        img = sct.grab({"top": wy, "left": wx, "width": ww, "height": wh})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path}")
    return wx, wy, ww, wh

OUT_DIR = 'docs/virtual-user/sprint7-mini-flow'
hwnd = 7015796
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# The X button on the tab "代码依赖分析" is at approx x=607, y=114
# From screenshot the tab header shows: "代码依赖分析  X"
# The X is at the end of the tab text, approx window-relative x=605, y=114
x_btn_x = wx + 605
x_btn_y = wy + 114
print(f"Closing tab X at ({x_btn_x},{x_btn_y})")
click_at(x_btn_x, x_btn_y, 0.5)
capture_full(hwnd, f'{OUT_DIR}/step1-after-x.png')

# Now use the top-right layout button to show simulator
# The 3 layout icons are at top-right: approx x=1063, 1103, 1143, y=69
# Click the middle one (split view with simulator)
layout_split_x = wx + 1063
layout_split_y = wy + 69
print(f"Clicking split-layout button at ({layout_split_x},{layout_split_y})")
click_at(layout_split_x, layout_split_y, 0.5)
capture_full(hwnd, f'{OUT_DIR}/step2-after-layout.png')
