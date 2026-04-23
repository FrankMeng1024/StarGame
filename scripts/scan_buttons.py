"""
scan_buttons.py — Sample pixels at expected button locations in current window.
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

# From mss_navigate.py comments (1918x1200 with right panel open):
# Canvas: (14, 138, 974, 434) = left=14, top=138, w=974, h=434
# 挑战关卡 ratio(0.750, 0.299) → physical(745, 268)
# Let's sample around those coordinates

candidates = [
    # mss_navigate.py calibrated positions
    ("挑战关卡_orig", 745, 268),
    ("星座图鉴_orig", 745, 315),
    ("道具商店_orig", 745, 353),
    # Try wider x range to find the buttons
    ("btn_x600_y250", 600, 250),
    ("btn_x650_y250", 650, 250),
    ("btn_x700_y250", 700, 250),
    ("btn_x750_y250", 750, 250),
    ("btn_x800_y250", 800, 250),
    ("btn_x500_y268", 500, 268),
    # Try narrower canvas (right panel closed = full width simulator)
    ("btn_x400_y200", 400, 200),
    ("btn_x300_y268", 300, 268),
    # From full-devtools.png (1918x1200 version) — button appeared near center
    ("center_y268", ww//2, 268),
    ("canvas_doc_center", 14 + 974//2, 138 + 434//2),
]

for label, px, py in candidates:
    if 0 <= py < wh and 0 <= px < ww:
        r, g, b = arr[py, px]
        # Purple button: high B, moderate R, low G
        is_button = b > 120 and r > 60 and g < 150
        marker = " ← BUTTON?" if is_button else ""
        print(f"  {label} ({px},{py}): R={r} G={g} B={b}{marker}", flush=True)

# Save annotated screenshot
pil = Image.fromarray(arr)
# Draw markers at expected button locations
from PIL import ImageDraw
draw = ImageDraw.Draw(pil)
for label, px, py in candidates:
    if 0 <= py < wh and 0 <= px < ww:
        draw.ellipse([px-5, py-5, px+5, py+5], outline=(255,0,0), width=2)
        draw.text((px+7, py-7), label, fill=(255,255,0))

os.makedirs("docs/qa/sprint32-evidence", exist_ok=True)
pil.save("docs/qa/sprint32-evidence/button-scan.png")
print("Saved button-scan.png", flush=True)
print("Done.", flush=True)
