"""
Capture full 1280x800 virtual screen.
"""
import mss
import mss.tools
import ctypes
import time

user32 = ctypes.windll.user32
hwnd = 7015796
user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(0.8)

with mss.mss() as sct:
    # Capture virtual screen (all monitors combined)
    mon = {"top": 0, "left": 0, "width": 1280, "height": 800}
    img = sct.grab(mon)
    mss.tools.to_png(img.rgb, img.size, output='docs/virtual-user/sprint7-mini-flow/screen-1280.png')
    print(f"Screen saved")
