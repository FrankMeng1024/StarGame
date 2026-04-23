"""
Click BUILD button to compile and run the mini game.
Then wait for simulator to load and take screenshots.
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
    time.sleep(0.5)

def click_at(screen_x, screen_y, delay=0.8):
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
hwnd = 7015796
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# Click BUILD tab at bottom (from screenshot: BUILD tab at approx x=474, y=767 in window coords)
build_tab_x = wx + 474
build_tab_y = wy + 767
print(f"Clicking BUILD tab at ({build_tab_x},{build_tab_y})")
click_at(build_tab_x, build_tab_y, 1.0)
capture_region(wx, wy, ww, wh, f'{OUT_DIR}/after-build-click.png')

# Now click the compile/build button. In WeChat DevTools the top toolbar has a compile button.
# The toolbar area is at the top, approx y=25 in window coords.
# "编译" button is usually in the toolbar. Let's try clicking around x=500, y=25 area.
# Actually use Ctrl+Shift+B or just click the build icon
# From the layout: toolbar icons are at y≈25, compile is 4th-5th icon
compile_x = wx + 255  # approximate toolbar compile button
compile_y = wy + 122  # row of icons below menu bar
print(f"Clicking compile icon at ({compile_x},{compile_y})")
click_at(compile_x, compile_y, 3.0)  # wait 3s for compile
capture_region(wx, wy, ww, wh, f'{OUT_DIR}/after-compile.png')

# Check if simulator loaded
print("Checking simulator area...")
sim_x = wx + 580
sim_y = wy + 100
sim_w = 430
sim_h = 620
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/sim-after-compile.png')
