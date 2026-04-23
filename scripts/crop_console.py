"""
Crop just the DevTools console area to see exact position of the > input.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
hwnd = 1312814

user32.ShowWindow(hwnd, 5)
time.sleep(0.3)
r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))

# Capture the entire bottom DevTools panel region
# DevTools panel appears to start around y=700 in window coords
# Let's capture from window y=680 to y=870 across full width
with mss.mss() as sct:
    m = {"left": r.left + 730, "top": r.top + 680, "width": 660, "height": 200}
    img = sct.grab(m)
    pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
    os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
    pil.save("docs/qa/sprint28-evidence/console-region-crop.png")
    print(f"  saved console-region-crop.png  win_offset=({r.left},{r.top})")
    print(f"  crop: abs({r.left+730},{r.top+680}) size=660x200")
