"""
Find all Chrome_RenderWidgetHostHWND children of DevTools window.
Post click directly to the simulator canvas HWND.
"""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
HWND = 1312814
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"screen={sw}x{sh}, hwnd={HWND}")

# Enumerate all child windows with class Chrome_RenderWidgetHostHWND
children = []
def enum_child(child, _):
    buf = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(child, buf, 256)
    if buf.value == 'Chrome_RenderWidgetHostHWND':
        r = ctypes.wintypes.RECT()
        user32.GetWindowRect(child, ctypes.byref(r))
        visible = user32.IsWindowVisible(child)
        w = r.right - r.left
        h = r.bottom - r.top
        # Get window title/text
        title_buf = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(child, title_buf, 256)
        children.append({
            'hwnd': child,
            'rect': (r.left, r.top, r.right, r.bottom),
            'size': (w, h),
            'visible': visible,
            'title': title_buf.value
        })
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumChildWindows(HWND, WNDENUMPROC(enum_child), 0)

print(f"\nFound {len(children)} Chrome_RenderWidgetHostHWND children:")
for i, c in enumerate(children):
    r = c['rect']
    print(f"  [{i}] hwnd={c['hwnd']} pos=({r[0]},{r[1]})-({r[2]},{r[3]}) size={c['size'][0]}x{c['size'][1]} visible={c['visible']} title='{c['title']}'")

# The game simulator should be the one at the left side of the screen
# (within the simulator panel x=0..720)
# The DevTools panels (terminal, etc.) are on the right side (x>720)
sim_candidates = [c for c in children if c['rect'][0] < 400 and c['size'][0] > 200]
print(f"\nSimulator-side candidates (x<400): {len(sim_candidates)}")
for c in sim_candidates:
    r = c['rect']
    print(f"  hwnd={c['hwnd']} pos=({r[0]},{r[1]}) size={c['size'][0]}x{c['size'][1]}")

# Also find the largest one (likely the game canvas)
if children:
    largest = max(children, key=lambda c: c['size'][0] * c['size'][1])
    print(f"\nLargest: hwnd={largest['hwnd']} size={largest['size']}")
