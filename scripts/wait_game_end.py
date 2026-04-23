"""
Try clicking the ... menu button in the game to find back/exit option
The ... button appears at top-right of the game (inside phone chrome)
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

# Current state: game is running (timer was at 0:34 when last captured)
# The game canvas physical region: left=1468, top=160
# The game HUD shows timer in top-right and catch count in top-left
#
# Looking at the right-half screenshot (960 offset):
# The ... button appears at approximately x=707, y=200 in the right-half
# Physical: x=960+707=1667, y=200 → Logical: (1111, 133)
#
# Actually from the image, the "..." button (DevTools settings?) is at
# physical approximately x=1670, y=200 (in the right-half at x=710, y=200)

print("Current game state - capturing fresh")
capture_right('current-game-state.png', wait=0.3)

# Wait for timer to run out OR try the ... button
# The timer was at 0:34 → let's wait 35 seconds for it to expire
print("Waiting for game timer to expire (35 seconds)...")
for i in range(35):
    time.sleep(1)
    if i % 5 == 0:
        print(f"  {35-i}s remaining...")

bring_to_front()
time.sleep(1)
capture_game('STORY-00207-04-game-end.png', wait=0.3)
capture_right('game-end-right.png', wait=0.1)
print("Captured game end state")
