"""
capture_intro_devfreeze.py — 通过修改源码 _DEV_FREEZE 常量截图
每次修改 intro.js → reload DevTools → 等待3s → 截图
"""
import sys, os, time, subprocess, ctypes, ctypes.wintypes, argparse, re

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try: ctypes.windll.user32.SetProcessDPIAware()
    except: pass

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import mss, numpy as np
    from PIL import Image
except ImportError as e:
    print(f"pip install mss pillow numpy"); sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--sprint', type=int, default=40)
parser.add_argument('--story', type=str, default='STORY-00329')
args = parser.parse_args()

OUT_DIR = f"docs/qa/sprint{args.sprint}-mini-evidence"
os.makedirs(OUT_DIR, exist_ok=True)
INTRO_JS = "miniprogram/js/screens/intro.js"
STORY = args.story

user32 = ctypes.windll.user32


def find_hwnd():
    cands = []
    def cb(hwnd, _):
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            out = subprocess.check_output(
                f'tasklist /FI "PID eq {pid.value}" /NH /FO CSV',
                shell=True, stderr=subprocess.DEVNULL
            ).decode('utf-8','replace')
            if 'wechatdevtools' in out.lower():
                r = ctypes.wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(r))
                w,h = r.right-r.left, r.bottom-r.top
                if w>400 and h>400: cands.append((hwnd, w*h))
        except: pass
        return True
    FT = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(FT(cb), 0)
    return sorted(cands, key=lambda x:-x[1])[0][0] if cands else None


def sendinput(px, py):
    vx=user32.GetSystemMetrics(76); vy=user32.GetSystemMetrics(77)
    vw=user32.GetSystemMetrics(78); vh=user32.GetSystemMetrics(79)
    nx=int((px-vx)*65535/vw); ny=int((py-vy)*65535/vh)
    class MI(ctypes.Structure):
        _fields_=[('dx',ctypes.c_long),('dy',ctypes.c_long),('mouseData',ctypes.c_ulong),
                  ('dwFlags',ctypes.c_ulong),('time',ctypes.c_ulong),
                  ('dwExtraInfo',ctypes.POINTER(ctypes.c_ulong))]
    class INPUT(ctypes.Structure):
        class _I(ctypes.Union): _fields_=[('mi',MI)]
        _anonymous_=('_input',); _fields_=[('type',ctypes.c_ulong),('_input',_I)]
    for fl in [0x8001|0x4000, 0x8002|0x4000, 0x8004|0x4000]:
        i=INPUT(type=0); i.mi.dx=nx; i.mi.dy=ny; i.mi.dwFlags=fl
        ctypes.windll.user32.SendInput(1,ctypes.byref(i),ctypes.sizeof(INPUT))
        time.sleep(0.06)


def set_freeze(val):
    """Edit intro.js to set _DEV_FREEZE = val"""
    with open(INTRO_JS, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(
        r'const _DEV_FREEZE = [\d.]+;',
        f'const _DEV_FREEZE = {val};',
        content
    )
    with open(INTRO_JS, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✎ _DEV_FREEZE = {val}")


def reload_devtools(hwnd):
    """Click the ↺ reload button at window-relative (484, 42)"""
    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left
    win_h = r.bottom - r.top
    sx = win_w / 1917.0
    # Reload button is at win-relative (484, 42)
    rx = r.left + int(484 * sx)
    ry = r.top + int(42 * (win_h/1200.0))
    sendinput(rx, ry)
    print(f"  ↺ Reload clicked ({rx},{ry})")


def capture_canvas(hwnd, filename, canvas_abs):
    user32.ShowWindow(hwnd, 5)
    time.sleep(0.5)
    cx, cy, cw, ch = canvas_abs
    with mss.mss() as sct:
        mon = {"left":cx,"top":cy,"width":cw,"height":ch}
        img = sct.grab(mon)
        arr = np.array(img)
        b = float(arr[:,:,:3].mean())
        pil = Image.fromarray(arr[:,:,:3][...,::-1])
        path = os.path.join(OUT_DIR, filename)
        pil.save(path)
    print(f"  📸 {filename}  b={b:.1f}")
    return b, path


def main():
    hwnd = find_hwnd()
    if not hwnd: print("ERROR: DevTools not found"); sys.exit(1)
    print(f"✓ hwnd={hwnd}")

    user32.ShowWindow(hwnd, 9)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.0)

    r = ctypes.wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    win_w = r.right - r.left; win_h = r.bottom - r.top
    sx = win_w/1917.0; sy = win_h/1200.0

    canvas_abs = (
        r.left + int(14*sx), r.top + int(137*sy),
        int(974*sx), int(290*sy)
    )
    print(f"✓ Canvas: {canvas_abs}")

    captures = [
        (2.0,  f"{STORY}-01-t2s.png",  "t=2s 流星雨"),
        (6.0,  f"{STORY}-02-t6s.png",  "t=6s 星座显现中"),
        (10.0, f"{STORY}-03-t10s.png", "t=10s 完整星座+标题"),
    ]

    for freeze_t, fname, label in captures:
        print(f"\n── {label} ──")
        set_freeze(freeze_t)
        reload_devtools(hwnd)
        time.sleep(3.5)   # Wait for DevTools to recompile and render

        b, path = capture_canvas(hwnd, fname, canvas_abs)
        if b < 3:
            print("  ⚠ Still dark, waiting 1s more...")
            time.sleep(1.0)
            b, path = capture_canvas(hwnd, fname, canvas_abs)
        print(f"  → {path}")

    # Restore: set freeze back to 0
    set_freeze(0)
    print(f"\n✓ _DEV_FREEZE restored to 0")
    print(f"✓ Screenshots in {OUT_DIR}/")


if __name__ == '__main__':
    main()
