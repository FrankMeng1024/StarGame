"""
From failure screen, click 选关 to go back to level select
Then capture level select properly

From game-end-right.png:
- 选关 button is at approximately x=672, y=713 in right-half
- Physical: x=960+672=1632, y=713 → Logical: (1088, 475)
"""
import mss
import mss.tools
import ctypes
import time
from PIL import Image

user32 = ctypes.windll.user32
OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = 7015796

GAME_PHYS = {"top": 160, "left": 1468, "width": 412, "height": 960}

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

def capture_game(out_name, wait=0.2):
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(GAME_PHYS)
        out = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"  Game: {out_name}")

def capture_right(out_name, wait=0.2):
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(sct.monitors[1])
    pil = Image.frombytes('RGB', img.size, img.rgb)
    right = pil.crop((960, 0, 1920, 1200))
    out = f'{OUT_DIR}/{out_name}'
    right.save(out)
    print(f"  Right: {out_name}")

bring_to_front()
time.sleep(0.5)

# The failure screen shows 选关 button
# From right-half crop, 选关 is at approximately:
# x=672, y=713 in right-half → physical(1632, 713) → logical(1088, 475)
print("Clicking 选关 (level select) button")
click_logical(1088, 475, 1.0)
bring_to_front()
time.sleep(1)

capture_game('STORY-00206-01-level-select-game.png', wait=0.3)
capture_right('STORY-00206-00-level-select-full.png', wait=0.1)
print("Level select captured!")

# Now navigate to game again - click level 1 again to get a fresh game screenshot
print("\nClicking level 1 again for fresh gameplay evidence")
click_logical(925, 173, 1.5)
bring_to_front()
time.sleep(1.5)

capture_game('STORY-00207-01-game-play-v2.png', wait=0.3)
capture_right('STORY-00207-00-game-full-v2.png', wait=0.1)
print("Gameplay captured!")
