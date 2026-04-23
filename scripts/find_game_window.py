"""Find WeChat DevTools window and capture full screen"""
import ctypes
import ctypes.wintypes
import os
import sys
import time
import subprocess

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

def get_window_rect(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.left, r.top, r.right - r.left, r.bottom - r.top

def get_window_title(hwnd):
    buf = ctypes.create_unicode_buffer(256)
    user32.GetWindowTextW(hwnd, buf, 256)
    return buf.value

def get_pid(hwnd):
    pid = ctypes.c_ulong(0)
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return pid.value

# Get all wechatdevtools PIDs
result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq wechatdevtools.exe', '/FO', 'CSV'],
                       capture_output=True, text=True)
pids = set()
for line in result.stdout.splitlines():
    parts = line.strip('"').split('","')
    if len(parts) >= 2 and parts[0] == 'wechatdevtools.exe':
        try:
            pids.add(int(parts[1]))
        except:
            pass

print(f"wechatdevtools PIDs: {pids}")

# Enumerate ALL windows (not just visible) for these PIDs
found = []
def enum_callback(hwnd, lparam):
    pid = get_pid(hwnd)
    if pid in pids:
        x, y, w, h = get_window_rect(hwnd)
        visible = bool(user32.IsWindowVisible(hwnd))
        title = get_window_title(hwnd)
        # Only print sizeable windows
        if w > 200 and h > 200:
            found.append((hwnd, pid, title, x, y, w, h, visible))
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
cb = WNDENUMPROC(enum_callback)
user32.EnumWindows(cb, 0)

for hwnd, pid, title, x, y, w, h, visible in found:
    title_safe = title.encode('ascii', errors='replace').decode('ascii')
    print(f"HWND {hwnd} PID {pid} '{title_safe}' at ({x},{y}) {w}x{h} visible={visible}")
