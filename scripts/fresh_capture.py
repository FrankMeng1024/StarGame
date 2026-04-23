"""
Fresh full screen capture to find current simulator position
"""
import mss
import mss.tools
import ctypes
import time

user32 = ctypes.windll.user32

OUT_DIR = 'docs/qa/sprint2-mini-evidence'

hwnd = 7015796
user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
user32.BringWindowToTop(hwnd)
time.sleep(0.5)

with mss.mss() as sct:
    mon = sct.monitors[1]  # primary monitor
    print(f"Monitor: {mon}")
    img = sct.grab(mon)
    mss.tools.to_png(img.rgb, img.size, output=f'{OUT_DIR}/fresh-full.png')
    print(f"Saved fresh-full.png: {img.size}")
