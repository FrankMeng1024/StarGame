"""
Navigate game by clicking with correct DPI-aware coordinates
The screen is 150% DPI, so physical pixels = logical * 1.5
SetCursorPos uses LOGICAL coords
mss captures PHYSICAL pixels
"""
import mss
import mss.tools
import ctypes
import ctypes.wintypes
import time
import sys
from PIL import Image

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
    time.sleep(0.4)

def click_logical(lx, ly, delay=0.4):
    """Click at logical screen coordinates (DPI-aware)"""
    user32.SetCursorPos(lx, ly)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
PHYS_SCALE = 1.5  # logical to physical

# Physical mss capture region for game canvas
# From successful captures: physical x=1468, y=160, w=412, h=960
GAME_PHYS = {"top": 160, "left": 1468, "width": 412, "height": 960}

def capture_game(out_name, wait=0.3):
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(GAME_PHYS)
        out = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"  Saved: {out_name}")

def capture_full(out_name, wait=0.2):
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(sct.monitors[1])
        out = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"  Full: {out_name}")

hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796
bring_to_front(hwnd)

# IMPORTANT: 150% DPI scaling
# Physical screen = 1920x1200 (or similar)
# Logical screen = 1280x800 (reported to apps)
# Physical point / 1.5 = logical point
# SetCursorPos takes LOGICAL coords
# mss grabs PHYSICAL pixels

# The simulator phone is at physical screen x=1468-1880 (from our captures)
# In LOGICAL: x = 1468/1.5 = 979, y = 160/1.5 = 107

# Level 1 (白羊座 with X icon unlocked) appears at physical ~(993, 177) in the full screen
# = logical (993/1.5, 177/1.5) = logical (662, 118)

# But WAIT - the full window screenshot was taken of the ENTIRE 1920x1200 physical screen
# The DevTools window occupies the full screen at physical (0,0) to (1920,1200)
# [it looked maximized in the screenshot]
# So the game at physical (993, 177) = logical (662, 118) on screen

print("Current state: level select shown")
print("Clicking level 1 (white Y-zone/Aries) at logical screen coords")

# Level 1 is at the TOP of the level grid
# From the screenshot, the phone occupies logical ~x=651-852, y=60-750
# Level 1 row 1, col 1 (the unlocked X icon) is at logical approximately (660, 120)
# But scroll up in level list - level 1 is at the very top

# Let me click there
level1_lx = 660  # logical screen x
level1_ly = 120  # logical screen y
print(f"Click level 1 at logical ({level1_lx}, {level1_ly})")
click_logical(level1_lx, level1_ly, 0.5)
bring_to_front(hwnd)
time.sleep(1.5)
capture_full('navigate-check.png')
capture_game('STORY-00207-01-game-after-click.png')
