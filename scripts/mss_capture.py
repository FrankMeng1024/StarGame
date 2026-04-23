"""
Use mss (DXGI Desktop Duplication) to capture WeChat DevTools simulator
mss uses the correct GPU-aware screen capture API
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
    SW_RESTORE = 9
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(1.5)

hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796
out = sys.argv[2] if len(sys.argv) > 2 else 'docs/qa/sprint2-mini-evidence/mss-capture.png'

print(f"Capturing hwnd={hwnd}")
x, y, w, h = get_window_rect(hwnd)
print(f"Window at ({x},{y}) size {w}x{h}")

bring_to_front(hwnd)
time.sleep(2)

# Re-get rect after bring to front
x, y, w, h = get_window_rect(hwnd)
print(f"After bring-to-front: ({x},{y}) size {w}x{h}")

with mss.mss() as sct:
    # Capture the window area
    monitor = {"top": y, "left": x, "width": w, "height": h}
    print(f"Capturing monitor region: {monitor}")
    img = sct.grab(monitor)
    mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"Saved to {out} ({img.size[0]}x{img.size[1]})")
