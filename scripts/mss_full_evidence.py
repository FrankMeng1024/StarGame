"""
Full evidence capture for Sprint 2-mini QA
Captures all required screens by navigating the game
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

def click_at(sx, sy, delay=0.4):
    user32.SetCursorPos(sx, sy)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
SCALE = 1.5  # device scale factor

# Physical pixel coordinates relative to window start (1,0)
# These are physical pixels (150% DPI, so multiply logical coords by 1.5)
# Simulator phone canvas area: physical x=1468-1880, y=160-1120 (inside phone frame)

def capture_sim(hwnd, out_name, wait=0.5):
    """Capture just the game canvas area (physical pixels)"""
    bring_to_front(hwnd)
    time.sleep(wait)
    wx, wy, ww, wh = get_window_rect(hwnd)
    # mss captures physical pixels; window reports logical coords
    # Physical window starts at wx*scale, but mss uses physical coords directly
    # Since wx=1, wy=0 in logical, physical = (1*1.5, 0) ≈ (1, 0) (mss uses physical)
    # mss coordinate system matches physical screen pixels
    # The window at logical (1,0) = physical (~1,0) on 150% display
    # But mss grabs at actual screen physical coordinates
    # Let me just grab at the known physical offset within the screen
    # From t01.png: simulator phone at physical x=1460-1892, y=100-1135 within the full capture
    # The full capture started at physical (0,0) [since mss.grab uses physical coords]
    # Wait - the window at logical (1,0) could be physical (2,0) at 150% but this varies
    # Let me just grab by known physical screen coords from the earlier capture that worked

    with mss.mss() as sct:
        # From mss-game-t01.png which captured the full window correctly at physical coords:
        # The window occupies physical x=0-1917, y=0-1200 (approximately full screen at 150%)
        # Game canvas is at physical x=1468, y=160 to 1880, 1120
        region = {"top": 160, "left": 1468, "width": 412, "height": 960}
        img = sct.grab(region)
        out_path = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_name}")
    return out_path

def capture_full_screen(out_name, wait=0.3):
    """Capture full primary monitor"""
    time.sleep(wait)
    with mss.mss() as sct:
        mon = sct.monitors[1]  # primary monitor
        img = sct.grab(mon)
        out_path = f'{OUT_DIR}/{out_name}'
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Full capture: {out_name}")

hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 7015796

# ---- STEP 0: Bring DevTools to front and ensure Mini Game Mode ----
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh} logical")

# Click Mini Game button to activate simulator
# Logical (908, 25) = physical approx (1362, 37) on the 150% DPI screen
# But in screen coords: if window at screen (1,0), then mini game button at screen (909, 25)
# mss uses screen physical coords, but mouse_event uses screen physical coords too
# Actually user32.SetCursorPos uses logical coords on HiDPI... let's check
# The window rect returns logical coords, and SetCursorPos also uses logical coords
# So we click at logical (wx+908, wy+25)
mini_game_x = wx + 908
mini_game_y = wy + 25
print(f"Clicking Mini Game at ({mini_game_x},{mini_game_y}) [logical]")
click_at(mini_game_x, mini_game_y, 0.3)

# Wait for window to expand and game to load
time.sleep(2)
bring_to_front(hwnd)

# Capture Level Select (current state - should show level grid)
print("\n[1] Level Select screen")
capture_sim(hwnd, 'STORY-00206-01-level-select.png')
capture_full_screen('STORY-00206-00-full.png')

# ---- STEP 1: Navigate to game by clicking level 1 ----
# Level 1 (白羊座/Aries) is at top-left of the grid
# In the game canvas (logical): approximately x=50, y=80 from canvas top-left
# Canvas logical position: window x ~ 975, y ~ 107 -> screen x ~ 975+wx, y ~ 107+wy
# Level 1 at canvas x=50, y=80 -> screen logical (975+50, 107+80) = (1025, 187)
# Wait - the window is at 1x scale but the game renders at logical coords inside
# Let me click where level 1 appears in the physical screen
# From our crop: simulator starts at physical x=1468 in the physical screen
# Level 1 in the level grid (first locked item, left col): ~physical x=1500, y=220
# But in logical/DPI-aware coords, that's x=1500/1.5=1000, y=220/1.5=147

# Let me try clicking the first level at logical screen coords
level1_logical_x = wx + 980 + 20   # ~20px into the game canvas from left edge
level1_logical_y = wy + 108 + 75   # ~75px down from canvas top
print(f"\n[2] Clicking level 1 at ({level1_logical_x},{level1_logical_y}) [logical]")
click_at(level1_logical_x, level1_logical_y, 1.5)
bring_to_front(hwnd)
time.sleep(1)
capture_sim(hwnd, 'STORY-00207-01-game-play.png')
capture_full_screen('STORY-00207-00-game-full.png')

# Capture after a moment (game in progress - nets swinging, stars falling)
time.sleep(3)
capture_sim(hwnd, 'STORY-00207-02-game-progress.png')

# ---- STEP 2: Navigate back to menu ----
# There should be a back/menu button in the game
# Try clicking top-left corner of the game canvas (usually has back button)
back_x = wx + 985
back_y = wy + 115
print(f"\n[3] Clicking back button at ({back_x},{back_y})")
click_at(back_x, back_y, 1.0)
bring_to_front(hwnd)
capture_sim(hwnd, 'STORY-00206-03-after-back.png')

print("\nAll captures done!")
