"""Take full screenshot to see current DevTools layout."""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass
user32 = ctypes.windll.user32
hwnd = 1312814
user32.ShowWindow(hwnd, 5)
time.sleep(0.3)
r = ctypes.wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
with mss.mss() as sct:
    m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
    img = sct.grab(m)
    pil = Image.fromarray(np.array(img)[:,:,:3][...,::-1])
    os.makedirs("docs/qa/sprint28-evidence", exist_ok=True)
    pil.save("docs/qa/sprint28-evidence/layout-now.png")
    print(f"win=({r.left},{r.top}) size={r.right-r.left}x{r.bottom-r.top}")
