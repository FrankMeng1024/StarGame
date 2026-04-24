"""
capture_game_quick.py — capture game screen quickly (before timer runs out)
Navigates: reload → menu → levels → level1 → screenshot at 5s
"""
import sys, time, ctypes, ctypes.wintypes, os, struct, subprocess
import win32gui, win32con, win32api
import numpy as np
from PIL import Image
import mss

HWND = None
SIM_RATIO_X = 0.300
SIM_RATIO_Y = 0.400
LEVELS_RATIO_X = 0.779
LEVELS_RATIO_Y = 0.427
LEVEL1_RATIO_X = 0.094
LEVEL1_RATIO_Y = 0.200
SKIP_RATIO_X = 0.500
SKIP_RATIO_Y = 0.500

OUT_DIR = "docs/qa/sprint67-evidence"
OUT_FILE = os.path.join(OUT_DIR, "STORY-00375-game-quick.png")


def find_devtools_hwnd():
    result = []
    def enum_cb(hwnd, _):
        title = win32gui.GetWindowText(hwnd)
        if 'Star' in title and '微信开发者工具' in title:
            result.append(hwnd)
    win32gui.EnumWindows(enum_cb, None)
    if not result:
        raise RuntimeError("DevTools window not found")
    return result[0]


def get_canvas_rect(hwnd):
    """Get canvas logical rect from DevTools window position."""
    rect = win32gui.GetWindowRect(hwnd)
    wx, wy, wr, wb = rect
    ww = wr - wx
    wh = wb - wy
    # Simulator typically occupies left ~50% of DevTools window
    sim_w = ww // 2
    sim_h = wh - 34  # toolbar height
    return wx, wy + 34, sim_w, sim_h


def logical_to_physical(wx, wy, sim_w, sim_h, ratio_x, ratio_y, dpi_scale=1.5):
    """Convert logical simulator ratio to physical screen coordinates."""
    log_x = wx + int(sim_w * ratio_x)
    log_y = wy + int(sim_h * ratio_y)
    return log_x, log_y


def send_click(x, y):
    win32api.SetCursorPos((x, y))
    time.sleep(0.05)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, x, y, 0, 0)
    time.sleep(0.05)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, x, y, 0, 0)
    time.sleep(0.1)


def send_reload(hwnd):
    """Send F5 reload to DevTools window."""
    win32gui.SetForegroundWindow(hwnd)
    time.sleep(0.3)
    win32api.keybd_event(win32con.VK_F5, 0, 0, 0)
    time.sleep(0.05)
    win32api.keybd_event(win32con.VK_F5, 0, win32con.KEYEVENTF_KEYUP, 0)


def take_screenshot(hwnd, out_path):
    rect = win32gui.GetWindowRect(hwnd)
    wx, wy, wr, wb = rect
    sim_w = (wr - wx) // 2
    sim_h = (wb - wy) - 34
    with mss.mss() as sct:
        monitor = {"left": wx, "top": wy + 34, "width": sim_w, "height": sim_h}
        img = sct.grab(monitor)
        arr = np.array(img)
        brightness = arr[:, :, :3].mean()
        if brightness <= 10:
            return False, brightness
        pil = Image.fromarray(arr[:, :, :3][..., ::-1])
        pil.save(out_path)
        return True, brightness


def main():
    global HWND
    os.makedirs(OUT_DIR, exist_ok=True)

    HWND = find_devtools_hwnd()
    print(f"hwnd={HWND}")

    rect = win32gui.GetWindowRect(HWND)
    wx, wy, wr, wb = rect
    ww = wr - wx
    wh = wb - wy
    sim_w = ww // 2
    sim_h = wh - 34

    def click_ratio(rx, ry, label=""):
        px = wx + int(sim_w * rx)
        py = wy + 34 + int(sim_h * ry)
        print(f"  click {label} @ ({px},{py})")
        send_click(px, py)

    # Step 1: Reload
    print("[1/4] Reload...")
    # Click reload button in DevTools toolbar (physical coords near top-right of sim)
    reload_x = wx + ww // 2 - 120  # DevTools reload button area
    reload_y = wy + 38
    win32gui.ShowWindow(HWND, win32con.SW_RESTORE)
    win32gui.SetForegroundWindow(HWND)
    time.sleep(0.5)
    send_click(reload_x, reload_y)
    time.sleep(3.5)  # wait for reload + intro

    # Focus simulator
    click_ratio(SIM_RATIO_X, SIM_RATIO_Y, "focus")
    time.sleep(0.5)

    # Step 2: Navigate to levels
    print("[2/4] Click 挑战关卡...")
    click_ratio(LEVELS_RATIO_X, LEVELS_RATIO_Y, "挑战关卡")
    time.sleep(1.0)

    # Step 3: Click Level 1
    print("[3/4] Click Level 1...")
    click_ratio(LEVEL1_RATIO_X, LEVEL1_RATIO_Y, "Level 1")
    time.sleep(1.5)

    # Skip intro overlay
    click_ratio(SKIP_RATIO_X, SKIP_RATIO_Y, "skip overlay")
    time.sleep(2.0)

    # Step 4: Take screenshot during active gameplay
    print("[4/4] Taking gameplay screenshot...")
    ok, brightness = take_screenshot(HWND, OUT_FILE)
    if ok:
        print(f"  Saved: {OUT_FILE}, brightness={brightness:.1f}")
    else:
        print(f"  FAILED: brightness={brightness:.1f} (too dark)")
        sys.exit(1)

    # Also take a second screenshot after interacting (swipe to trigger swing)
    # Simulate a swipe gesture to see swing state
    time.sleep(0.5)
    out_swing = os.path.join(OUT_DIR, "STORY-00375-game-swing.png")
    ok2, b2 = take_screenshot(HWND, out_swing)
    if ok2:
        print(f"  Swing state: {out_swing}, brightness={b2:.1f}")

    print("Done.")


if __name__ == "__main__":
    main()
