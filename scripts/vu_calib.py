"""
Calibrate simulator position and capture VU evidence screenshots.
DevTools visible at (1,0) 1278x800. Simulator panel on right side.
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
os.makedirs(OUT_DIR, exist_ok=True)

hwnd = 7015796
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# From the screenshot: simulator panel is roughly at window x=580-1010, y=220-610
# Center of simulator: ~x=795, y=415. DPI=150%, so these are already physical coords (mss uses physical)
# Window left=1 (physical), so sim physical coords:
sim_x = wx + 580
sim_y = wy + 220
sim_w = 425
sim_h = 390

print(f"Estimated simulator at ({sim_x},{sim_y}) {sim_w}x{sim_h}")
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/calib-sim-area.png')

# Also capture full window for reference
capture_region(wx, wy, ww, wh, f'{OUT_DIR}/calib-full-window.png')
print("Calibration screenshots saved. Check calib-sim-area.png to verify simulator bounds.")
