"""
find_reload_btn.py — Scan toolbar pixels to find the ↺ reload button position
"""
import ctypes, ctypes.wintypes, time, sys, subprocess, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass
import mss, numpy as np
from PIL import Image

user32 = ctypes.windll.user32
found = []
def cb(hwnd, _):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
            shell=True, stderr=subprocess.DEVNULL).decode('utf-8','replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            if w>400 and h>400: found.append((hwnd, w*h))
    except: pass
    return True
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(WNDENUMPROC(cb), 0)
found.sort(key=lambda x: -x[1])
hwnd = found[0][0]
user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print(f"Window: ({r.left},{r.top}) {r.right-r.left}x{r.bottom-r.top}", flush=True)

# Capture toolbar area: rows 20-70 (both rows of DevTools header)
with mss.mss() as sct:
    region = {"left": r.left, "top": r.top+20, "width": 750, "height": 50}
    img = sct.grab(region)
    arr = np.array(img)[:,:,:3][...,::-1]  # RGB
    # Save full toolbar strip
    Image.fromarray(arr).save("docs/qa/sprint56-mini-evidence/toolbar-strip.png")
    print(f"toolbar strip: {arr.shape[1]}x{arr.shape[0]}", flush=True)

    # The ↺ icon is a gray circular arrow on dark background
    # Look for pixels that are in the "icon button" brightness range: ~160-220 gray
    # Row 2 is at y=26-52 from window top → y=6-32 in our crop (which starts at y+20)
    # Scan for local brightness peaks in that row range
    row2 = arr[6:32, :, :]  # rows 6-32 of crop = rows 26-52 of window

    # Compute per-column mean brightness in row2
    col_brightness = row2.mean(axis=(0,2))  # shape: (750,)

    # Find columns where brightness is above baseline (icon pixels are brighter than dark bg)
    baseline = col_brightness[:200].mean()  # left side baseline (Compilation text area)
    print(f"baseline brightness (left 200px): {baseline:.1f}", flush=True)

    # Print brightness at key x positions
    for x in [484, 550, 600, 650, 668, 680, 690, 700]:
        if x < 750:
            print(f"  x={x}: brightness={col_brightness[x]:.1f}", flush=True)

    # Find top-3 brightness peaks in x=450..750
    region_bright = col_brightness[450:750]
    top_idxs = np.argsort(region_bright)[-5:][::-1]
    for i in top_idxs:
        print(f"  peak at x={450+i}: brightness={region_bright[i]:.1f}", flush=True)
