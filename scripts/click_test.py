"""Click test using known hwnd=1312814."""
import ctypes, ctypes.wintypes, sys, mss, numpy as np, time, os, argparse
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

parser = argparse.ArgumentParser()
parser.add_argument('--hwnd', type=int, default=1312814)
parser.add_argument('--x', type=int, required=True)
parser.add_argument('--y', type=int, required=True)
parser.add_argument('--name', type=str, default='click-test')
parser.add_argument('--wait', type=float, default=2.0)
args = parser.parse_args()

user32 = ctypes.windll.user32
hwnd = args.hwnd
sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)
print(f"screen={sw}x{sh}, hwnd={hwnd}")

def si(px, py, label=""):
    nx = int(px * 65535 / sw)
    ny = int(py * 65535 / sh)
    class MI(ctypes.Structure):
        _fields_ = [('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                    ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INP(ctypes.Structure):
        class U(ctypes.Union):
            _fields_ = [('mi',MI)]
        _anonymous_=('u',); _fields_=[('type',ctypes.c_ulong),('u',U)]
    def send(flags):
        i = INP(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=flags
        ctypes.windll.user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INP))
    send(0x0001|0x8000)
    time.sleep(0.08)
    send(0x0002|0x8000)
    time.sleep(0.05)
    send(0x0004|0x8000)
    if label:
        print(f"  Clicked {label} @ ({px},{py})")

def cap(name):
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    with mss.mss() as sct:
        m = {"left": r.left, "top": r.top, "width": r.right-r.left, "height": r.bottom-r.top}
        img = sct.grab(m)
        arr = np.array(img)
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        os.makedirs("docs/qa/sprint30-evidence", exist_ok=True)
        path = f"docs/qa/sprint30-evidence/{name}.png"
        pil.save(path)
        print(f"  Screenshot: {path} ({pil.width}x{pil.height}) brightness={arr.mean():.1f}")
    return path

# Bring DevTools to front
user32.ShowWindow(hwnd, 5)
user32.SetForegroundWindow(hwnd)
time.sleep(1.0)

# Click at specified position
si(args.x, args.y, f"({args.x},{args.y})")
time.sleep(args.wait)
cap(args.name)
print("DONE")
