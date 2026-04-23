"""
Capture entire primary monitor to find the game.
"""
import mss
import mss.tools
import ctypes
import time

user32 = ctypes.windll.user32

hwnd = 7015796
user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Capture full primary monitor
with mss.mss() as sct:
    mon = sct.monitors[1]  # primary
    print(f"Primary monitor: {mon}")
    img = sct.grab(mon)
    mss.tools.to_png(img.rgb, img.size, output='docs/virtual-user/sprint7-mini-flow/primary-monitor.png')
    print(f"Primary monitor saved: {mon['width']}x{mon['height']}")
