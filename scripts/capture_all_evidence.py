"""
Full evidence capture for Sprint 2-mini QA
Now that we know the correct coordinates, capture all game screens
"""
import mss
import mss.tools
import ctypes
import time
from PIL import Image

user32 = ctypes.windll.user32
OUT_DIR = 'docs/qa/sprint2-mini-evidence'
hwnd = 7015796

# Physical simulator region (confirmed working)
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

def capture_game(out_name, wait=0.3):
    """Capture game canvas only"""
    time.sleep(wait)
    with mss.mss() as sct:
        img = sct.grab(GAME_PHYS)
        out = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out)
    print(f"  Game: {out_name}")

def capture_full_right(out_name, wait=0.2):
    """Capture right half (simulator visible)"""
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

# Step 1: Game is currently running (level 1 - 白羊座)
# Capture game in progress
print("\n[1] Capture game play in progress")
capture_game('STORY-00207-01-game-play.png', wait=0.3)
capture_full_right('STORY-00207-00-game-full.png', wait=0.1)

# Wait a moment to show game in progress
time.sleep(2)
capture_game('STORY-00207-02-game-progress.png', wait=0.2)

# Step 2: Try clicking on a star to catch it
# Stars appear to be at around y=300-600 in the game canvas
# Game canvas physical: top=160, left=1468, width=412, height=960
# Star positions from screenshot (right-half crop):
# - Yellow star at approximately right-half x=500, y=290 -> physical x=960+500=1460, y=290
# - Actually wait, right-half starts at physical x=960
# - In the right-half crop, game appears at approximately x=385 to x=790
# - Stars: yellow at x~500, y~290 in right-half = physical(1460, 290)
# - Logical: (1460/1.5, 290/1.5) = (973, 193)
# But game canvas is at physical left=1468, so let's use canvas-relative coords
# Canvas physical left=1468, top=160
# In right-half (offset x=960): game at x=1468-960=508, so star at x~500 in right-half
# That's physical x=1460, y=290... approximately
# Let's just click the middle area of the game canvas where stars are
# Game canvas center: physical x=1468+206=1674, y=160+400=560
# Logical: (1674/1.5, 560/1.5) = (1116, 373)
print("\n[2] Clicking to catch a star")
click_logical(1116, 373, 0.5)
time.sleep(1)
capture_game('STORY-00207-03-catching.png', wait=0.2)

# Step 3: Navigate back to level select
# In the game, the "← 返回" button should be at top-left of phone
# From right-half crop: "← 返回" is at approximately x=430, y=170 in right-half
# Physical: x=960+430=1390, y=170 → Logical: (927, 113)
print("\n[3] Clicking back button to return to level select")
click_logical(927, 113, 1.0)
bring_to_front()
time.sleep(1)
capture_game('STORY-00206-02-back-to-levels.png', wait=0.3)
capture_full_right('STORY-00206-01-level-select.png', wait=0.1)

print("\nAll evidence captured!")
