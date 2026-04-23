"""
Capture full DevTools window to find simulator position.
"""
import mss
import mss.tools
import ctypes
import time

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

def get_window_rect(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.left, r.top, r.right - r.left, r.bottom - r.top

hwnd = 7015796
user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(0.5)

wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# Capture full window
with mss.mss() as sct:
    img = sct.grab({"top": wy, "left": wx, "width": ww, "height": wh})
    mss.tools.to_png(img.rgb, img.size, output='docs/virtual-user/sprint7-mini-flow/full-window.png')
    print(f"Full window saved: {ww}x{wh}")

# Also try capturing monitors info
with mss.mss() as sct:
    for i, mon in enumerate(sct.monitors):
        print(f"Monitor {i}: {mon}")
