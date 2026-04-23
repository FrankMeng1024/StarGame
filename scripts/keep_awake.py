"""keep_awake.py — 每595秒移动鼠标1px阻止屏保，不干扰正常操作"""
import ctypes, time, ctypes.wintypes

user32 = ctypes.windll.user32

class POINT(ctypes.Structure):
    _fields_ = [('x', ctypes.c_long), ('y', ctypes.c_long)]

print("防屏保已启动 (每595秒触发一次)")
while True:
    time.sleep(595)
    p = POINT()
    user32.GetCursorPos(ctypes.byref(p))
    user32.SetCursorPos(p.x + 1, p.y)
    time.sleep(0.1)
    user32.SetCursorPos(p.x, p.y)
    print(f"  触发防屏保 @ ({p.x},{p.y})")
