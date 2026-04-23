"""
Full VU evidence capture - game is running in simulator.
From screenshot: simulator is at right side, approx x=965-1260, y=95-735 in screen coords.
Window is now showing at different position due to DPI scaling.
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

def click_at(screen_x, screen_y, delay=1.0):
    user32.SetCursorPos(int(screen_x), int(screen_y))
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(delay)

def capture_region(x, y, w, h, out_path):
    with mss.mss() as sct:
        img = sct.grab({"top": int(y), "left": int(x), "width": int(w), "height": int(h)})
        mss.tools.to_png(img.rgb, img.size, output=out_path)
    print(f"  Saved: {out_path}")

def capture_full(hwnd, out_path):
    wx, wy, ww, wh = get_window_rect(hwnd)
    capture_region(wx, wy, ww, wh, out_path)
    return wx, wy, ww, wh

OUT_DIR = 'docs/virtual-user/sprint7-mini-flow'
hwnd = 7015796
bring_to_front(hwnd)
wx, wy, ww, wh = get_window_rect(hwnd)
print(f"DevTools at ({wx},{wy}) {ww}x{wh}")

# From last screenshot (1392x866 effective size with DPI):
# Simulator phone frame right side, approx physical screen coords:
# Simulator area: x=965 to 1260, y=95 to 740 (physical pixels)
sim_x = 965
sim_y = 95
sim_w = 295
sim_h = 645

print(f"Simulator at ({sim_x},{sim_y}) {sim_w}x{sim_h}")

# --- flow-01: Level select (current state) ---
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-01-level-select.png')
print("flow-01: Level select captured")

# --- Navigate to main menu first ---
# The level select has a "返回" button or we need to click 主菜单
# From game.js: levels screen shows star constellation icon. Back button is at top-left.
# Actually let's first check: is there a "← 返回" button at top-left of levels screen?
# Based on code: levels.js has a back button at top-left (x=12, y=14 in game coords)
# Game canvas is ~311x695 logical, so back button physical approx:
# sim_x + (12/311)*295 ≈ sim_x + 11
back_btn_x = sim_x + 14
back_btn_y = sim_y + 35
print(f"Clicking back to menu at ({back_btn_x},{back_btn_y})")
click_at(back_btn_x, back_btn_y, 1.5)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-02-menu.png')
print("flow-02: Main menu captured")

# --- Verify menu then go back to levels ---
# Tap [挑战关卡] button - middle of screen, around y=45%
challenge_btn_x = sim_x + sim_w // 2
challenge_btn_y = sim_y + int(sim_h * 0.46)
print(f"Tapping 挑战关卡 at ({challenge_btn_x},{challenge_btn_y})")
click_at(challenge_btn_x, challenge_btn_y, 1.5)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-03-levels-again.png')
print("flow-03: Level select from menu captured")

# --- Tap level 1 (猎户座) to start game ---
# Level 1 is top-left of grid. From prior Sprint 2 evidence: level1 at logical (925,173) = physical relative to sim
# Grid starts around y=13% of sim height, x=6% of sim width
level1_x = sim_x + int(sim_w * 0.08)
level1_y = sim_y + int(sim_h * 0.13)
print(f"Tapping level 1 at ({level1_x},{level1_y})")
click_at(level1_x, level1_y, 2.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-04-game-screen.png')
print("flow-04: Game screen captured")

# Wait for game to fully load and show net+stars
time.sleep(1.5)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-05-game-loaded.png')
print("flow-05: Game loaded captured")

# --- Tap to fire net ---
net_tap_x = sim_x + sim_w // 2
net_tap_y = sim_y + int(sim_h * 0.4)
print(f"Tapping to fire net at ({net_tap_x},{net_tap_y})")
click_at(net_tap_x, net_tap_y, 1.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-06-net-fired.png')
print("flow-06: Net fired captured")

# --- Check HUD: timer going red ---
time.sleep(3.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-07-gameplay.png')
print("flow-07: Gameplay captured")

# Go back from game (click back button in HUD or let fail screen appear)
# Actually navigate back via back button at top-left of game HUD
game_back_x = sim_x + 15
game_back_y = sim_y + 35
print(f"Clicking game back/menu at ({game_back_x},{game_back_y})")
click_at(game_back_x, game_back_y, 1.0)
capture_region(sim_x, sim_y, sim_w, sim_h, f'{OUT_DIR}/flow-08-after-game-back.png')
print("flow-08: After game back captured")

print("\nPhase 1 done. Check screenshots.")
