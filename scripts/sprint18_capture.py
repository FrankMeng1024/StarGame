"""
Sprint 18-mini QA evidence capture
Captures full DevTools window + attempts to identify simulator region
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
    user32.ShowWindow(hwnd, 9)   # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(0.5)

def capture_region(x, y, w, h, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with mss.mss() as sct:
        img = sct.grab({"top": y, "left": x, "width": w, "height": h})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path} ({w}x{h})")

OUT_DIR = 'docs/qa/sprint18-mini-evidence'
HWND = 5245916  # wechatdevtools main window

bring_to_front(HWND)
time.sleep(1.0)

wx, wy, ww, wh = get_window_rect(HWND)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# Capture full window first
capture_region(wx, wy, ww, wh, f'{OUT_DIR}/devtools-full.png')

# The game simulator in WeChat DevTools landscape mode is typically on the right panel.
# In 微信开发者工具, the simulator is usually a fixed-size panel.
# For a landscape mini-game at 667x375, the simulator fits within the right panel.
# Try common offsets: simulator typically at ~60-70% from left, with toolbar at top.

# Attempt: simulator at rightish area of DevTools
# Standard layout: left panel (file tree) ~200px, middle (code) ~600px, right (sim) ~400px
# The sim panel itself starts at roughly ww * 0.70 from left
for frac in [0.70, 0.75, 0.80, 0.65]:
    sim_x = wx + int(ww * frac)
    sim_y = wy + 40  # below toolbar
    sim_w = min(ww - int(ww * frac), 720)
    sim_h = wh - 40
    if sim_w > 100:
        capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/devtools-sim-frac{int(frac*100)}.png')

print("Done. Check devtools-full.png to identify simulator position.")
