"""
Close Code Analyse tab, switch back to explorer, find and click the compile/refresh button.
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

def key_press(vk):
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.05)
    user32.keybd_event(vk, 0, 0x0002, 0)
    time.sleep(0.1)

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

# Close the Code Analyse tab - click the X on it (approx x=607, y=116 in window)
close_tab_x = wx + 607
close_tab_y = wy + 116
print(f"Closing Code Analyse tab at ({close_tab_x},{close_tab_y})")
click_at(close_tab_x, close_tab_y, 0.5)

# Click the Explorer (file tree) icon to restore normal view - first icon in sidebar at x=29, y=121
explorer_x = wx + 29
explorer_y = wy + 121
print(f"Clicking Explorer icon at ({explorer_x},{explorer_y})")
click_at(explorer_x, explorer_y, 0.5)
capture_region(wx, wy, ww, wh, f'{OUT_DIR}/after-close-tab.png')
