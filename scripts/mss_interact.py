"""
Use mss + win32 to interact with DevTools and capture the game
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

class INPUT(ctypes.Structure):
    class _INPUT(ctypes.Union):
        class MOUSEINPUT(ctypes.Structure):
            _fields_ = [
                ("dx", ctypes.c_long), ("dy", ctypes.c_long),
                ("mouseData", ctypes.c_ulong), ("dwFlags", ctypes.c_ulong),
                ("time", ctypes.c_ulong), ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong))
            ]
        _fields_ = [("mi", MOUSEINPUT)]
    _fields_ = [("type", ctypes.c_ulong), ("_input", _INPUT)]

def get_window_rect(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.left, r.top, r.right - r.left, r.bottom - r.top

def bring_to_front(hwnd):
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(1.0)

def click_at(x, y):
    """Click at screen coordinates"""
    # Move mouse
    user32.SetCursorPos(x, y)
    time.sleep(0.1)
    # Click
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, x, y, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, x, y, 0, 0)
    time.sleep(0.1)

def capture_window(hwnd, out_path):
    x, y, w, h = get_window_rect(hwnd)
    if w <= 0 or h <= 0:
        print(f"Invalid window rect: ({x},{y}) {w}x{h}")
        return False
    with mss.mss() as sct:
        monitor = {"top": y, "left": x, "width": w, "height": h}
        img = sct.grab(monitor)
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"Saved {out_path} ({w}x{h})")
    return True

OUT_DIR = 'docs/qa/sprint2-mini-evidence'

# Get DevTools hwnd
hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

print(f"Using hwnd={hwnd}")
bring_to_front(hwnd)

x, y, w, h = get_window_rect(hwnd)
print(f"DevTools at ({x},{y}) size {w}x{h}")

# The simulator panel appears to be around x=580-1010, y=220-600 in the window
# Click in the center of the simulator area to start it
sim_center_x = x + 790  # approximate center of simulator panel
sim_center_y = y + 410
print(f"Clicking simulator at ({sim_center_x},{sim_center_y})")
click_at(sim_center_x, sim_center_y)
time.sleep(3)

capture_window(hwnd, f'{OUT_DIR}/mss-after-click.png')
