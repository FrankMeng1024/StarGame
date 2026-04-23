"""
find_buttons.py — Pixel-scan the WeChat DevTools window to find game canvas + button positions.
"""
import ctypes, ctypes.wintypes, mss, subprocess, time, os
import numpy as np
from PIL import Image
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except:
    pass

user32 = ctypes.windll.user32

found = []
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(
            f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
            shell=True, stderr=subprocess.DEVNULL
        ).decode('utf-8', 'replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w, h = r.right - r.left, r.bottom - r.top
            if w > 400 and h > 400:
                found.append((hwnd, w, h, r.left, r.top))
    except:
        pass
    return True

user32.EnumWindows(WNDENUMPROC(cb), 0)
if not found:
    print("NOT FOUND", flush=True)
    sys.exit(1)

hwnd, ww, wh, wl, wt = found[0]
print(f"hwnd={hwnd} pos=({wl},{wt}) size={ww}x{wh}", flush=True)

user32.ShowWindow(hwnd, 9)
user32.SetForegroundWindow(hwnd)
time.sleep(1.5)

# Grab full window
with mss.mss() as sct:
    region = {'left': wl, 'top': wt, 'width': ww, 'height': wh}
    img = sct.grab(region)
    arr = np.array(img)[:, :, :3][..., ::-1]  # RGB

print(f"Array shape: {arr.shape}", flush=True)

R = arr[:, :, 0].astype(int)
G = arr[:, :, 1].astype(int)
B = arr[:, :, 2].astype(int)

# Find game canvas: dark blue-purple background (game sky)
# Game background: R<80, G<80, B<120 but not completely black (DevTools chrome)
# More specific: typical game sky blue R≈10-30, G≈10-40, B≈50-100
dark_game = (R < 100) & (G < 100) & (B > 40) & ((R + G + B) > 30)
rows_game = np.where(dark_game.any(axis=1))[0]
cols_game = np.where(dark_game.any(axis=0))[0]
if len(rows_game) > 0 and len(cols_game) > 0:
    cy_top = rows_game[0]
    cy_bot = rows_game[-1]
    cx_left = cols_game[0]
    cx_right = cols_game[-1]
    print(f"Game canvas (window-relative): ({cx_left},{cy_top}) to ({cx_right},{cy_bot})", flush=True)
    print(f"Canvas size: {cx_right - cx_left}x{cy_bot - cy_top}", flush=True)

# Find purple/violet buttons: the menu buttons are purple gradient
# Typical button color: R≈100-200, G≈50-150, B≈200-255
purple_btn = (R > 60) & (G > 30) & (B > 100) & (B > R + 20)
rows_btn = np.where(purple_btn.any(axis=1))[0]
cols_btn = np.where(purple_btn.any(axis=0))[0]

if len(rows_btn) > 0:
    print(f"Button-colored rows range: {rows_btn[0]}..{rows_btn[-1]}", flush=True)
    # Group into bands
    bands = []
    start = rows_btn[0]
    prev = rows_btn[0]
    for r2 in rows_btn[1:]:
        if r2 > prev + 5:
            bands.append((start, prev, (start + prev) // 2))
            start = r2
        prev = r2
    bands.append((start, prev, (start + prev) // 2))
    print(f"Button bands (start, end, center_y): {bands}", flush=True)

    # For each band, find center X
    for start_r, end_r, center_r in bands:
        row_slice = purple_btn[start_r:end_r + 1, :]
        col_hits = np.where(row_slice.any(axis=0))[0]
        if len(col_hits) > 0:
            center_x = (col_hits[0] + col_hits[-1]) // 2
            print(f"  Band y={start_r}-{end_r} center=({center_x},{center_r})", flush=True)

# Sample some pixels at expected button locations from the screenshot
# From the screenshot, 挑战关卡 button looks to be at ~(560, 196) window-relative
for label, px, py in [
    ("挑战关卡_guess", 560, 196),
    ("星座图鉴_guess", 560, 228),
    ("道具商店_guess", 560, 260),
    ("game_sky_center", 250, 260),
]:
    if 0 <= py < wh and 0 <= px < ww:
        r, g, b = arr[py, px]
        print(f"Sample {label} ({px},{py}): R={r} G={g} B={b}", flush=True)

print("Done.", flush=True)
