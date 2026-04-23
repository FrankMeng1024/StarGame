"""
Click level 1 with correct coordinates derived from fresh-full.png analysis
Physical coordinates from right-half crop:
- Right half starts at physical x=960
- Level 1 center in right half: approximately x=428, y=260
- Physical screen: x=960+428=1388, y=260
- Logical (DPI 150%): x=1388/1.5=925, y=260/1.5=173
"""
import mss
import mss.tools
import ctypes
import time
import sys

user32 = ctypes.windll.user32
OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = 7015796

def bring_to_front():
    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(0.4)

def click_logical(lx, ly, delay=0.5):
    user32.SetCursorPos(lx, ly)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_full(out_name, wait=0.3):
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(sct.monitors[1])
        out = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"  Saved: {out_name}")

bring_to_front()
time.sleep(0.5)

# Level 1 at logical (925, 173)
# derived from: physical x=1388, y=260; /1.5 = logical 925, 173
print("Clicking Level 1 at logical (925, 173)")
click_logical(925, 173, 1.5)

bring_to_front()
time.sleep(1)
capture_full('after-click-level1.png')

# Also take the right-half crop for analysis
from PIL import Image
img = Image.open(f'{OUT_DIR}/after-click-level1.png')
right = img.crop((960, 0, 1920, 1200))
right.save(f'{OUT_DIR}/after-click-right.png')
print("Saved right half crop")
