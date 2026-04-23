"""
Test PostMessage/SendMessage to Chrome_RenderWidgetHostHWND.
Bypasses focus issue — posts directly to the renderer child window.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
HWND = 1312814
CANVAS_HWND = 1378318  # The Chrome_RenderWidgetHostHWND (full 1920x1200)

WM_LBUTTONDOWN = 0x0201
WM_LBUTTONUP   = 0x0202
WM_MOUSEMOVE   = 0x0200
MK_LBUTTON     = 0x0001

def make_lparam(x, y):
    """Pack x,y into LPARAM for WM_LBUTTONDOWN etc."""
    return (y << 16) | (x & 0xFFFF)

def post_click(cx, cy, label=""):
    """Post click to Chrome_RenderWidgetHostHWND using client coords."""
    lp = make_lparam(cx, cy)
    # Move first
    user32.PostMessageW(CANVAS_HWND, WM_MOUSEMOVE, 0, lp)
    time.sleep(0.05)
    # Down + Up
    user32.PostMessageW(CANVAS_HWND, WM_LBUTTONDOWN, MK_LBUTTON, lp)
    time.sleep(0.08)
    user32.PostMessageW(CANVAS_HWND, WM_LBUTTONUP, 0, lp)
    if label:
        print(f"  PostMessage click {label} @ ({cx},{cy})")

def cap(name):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(HWND, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint30-evidence", exist_ok=True)
        path = f"docs/qa/sprint30-evidence/{name}.png"
        pil.save(path)
        print(f"  Screenshot: {path} brightness={arr.mean():.1f}")
    return path

print(f"HWND={HWND}, Canvas_HWND={CANVAS_HWND}")
print("Current state: level_select")

# Bring DevTools to front
user32.ShowWindow(HWND, 5)
user32.SetForegroundWindow(HWND)
time.sleep(1.0)

# Click ← 返回 at (95, 120) using PostMessage
print("\nTest 1: PostMessage to ← 返回 at (95, 120)...")
post_click(95, 120, "← 返回")
time.sleep(2.5)
cap("postmsg-back-click")
