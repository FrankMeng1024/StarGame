"""
find_hwnd.py — Find current wechatdevtools hwnd
"""
import sys
sys.stdout = open("find_hwnd_out.txt", "w", encoding="utf-8")
import ctypes, ctypes.wintypes, subprocess, time
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except: pass

user32 = ctypes.windll.user32
found = []

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
def cb(hwnd, _):
    if not user32.IsWindowVisible(hwnd): return True
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        out = subprocess.check_output(
            ['tasklist', '/FI', f'PID eq {pid.value}', '/NH', '/FO', 'CSV'],
            stderr=subprocess.DEVNULL, timeout=2).decode('utf-8','replace')
        if 'wechatdevtools' in out.lower():
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            w,h = r.right-r.left, r.bottom-r.top
            buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, buf, 256)
            print(f"hwnd={hwnd} pos=({r.left},{r.top}) size={w}x{h} title={buf.value!r}", flush=True)
            if w > 400 and h > 400: found.append((hwnd, w*h))
    except: pass
    return True

user32.EnumWindows(WNDENUMPROC(cb), 0)
if found:
    found.sort(key=lambda x: -x[1])
    print(f"BEST: hwnd={found[0][0]}", flush=True)
else:
    print("No hwnd found", flush=True)
sys.stdout.close()
