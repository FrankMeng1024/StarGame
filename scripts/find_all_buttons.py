"""
find_all_buttons.py — Vertical scan at x=745 to find all menu buttons.
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

with mss.mss() as sct:
    region = {'left': wl, 'top': wt, 'width': ww, 'height': wh}
    img = sct.grab(region)
    arr = np.array(img)[:, :, :3][..., ::-1]  # RGB

print(f"Array shape: {arr.shape}", flush=True)

# Vertical scan at x=745 (known button column) from y=200 to y=450
print("\nVertical scan at x=745 (y=200..450):", flush=True)
scan_x = 745
button_rows = []
for y in range(200, 450):
    r, g, b = arr[y, scan_x]
    if b > 120 and r > 50:
        button_rows.append(y)
        print(f"  y={y}: R={r} G={g} B={b} ← purple", flush=True)

# Group button rows into bands
if button_rows:
    bands = []
    start = button_rows[0]
    prev = button_rows[0]
    for row in button_rows[1:]:
        if row > prev + 3:
            bands.append((start, prev))
            start = row
        prev = row
    bands.append((start, prev))
    print(f"\nButton bands: {bands}", flush=True)
    for band_start, band_end in bands:
        center_y = (band_start + band_end) // 2
        print(f"  Band y={band_start}..{band_end} center_y={center_y}", flush=True)
        # Now find center x for this band
        band_pixel_cols = []
        for y in range(band_start, band_end + 1):
            for x in range(600, 900):
                r, g, b = arr[y, x]
                if b > 120 and r > 50:
                    band_pixel_cols.append(x)
        if band_pixel_cols:
            min_x = min(band_pixel_cols)
            max_x = max(band_pixel_cols)
            center_x = (min_x + max_x) // 2
            print(f"    x range: {min_x}..{max_x} center_x={center_x}", flush=True)

            # Compute canvas ratios (canvas = 14, 138, 974, 434)
            cx_abs, cy_abs = 14, 138
            cw, ch = 974, 434
            rx = (center_x - cx_abs) / cw
            ry = (center_y - cy_abs) / ch
            print(f"    Canvas ratio: ({rx:.3f}, {ry:.3f})", flush=True)

# Also scan at x=500..900 for y=268 (挑战关卡 row) to find full button width
print("\nHorizontal scan at y=268 (挑战关卡 row), x=500..950:", flush=True)
for x in range(500, 950, 5):
    r, g, b = arr[268, x]
    if b > 120 and r > 50:
        print(f"  x={x}: R={r} G={g} B={b} ← button", flush=True)

print("\nDone.", flush=True)
