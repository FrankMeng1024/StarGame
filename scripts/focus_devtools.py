import ctypes, ctypes.wintypes, sys, time
sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32

HWND = 7015796

# Show and bring to foreground
user32.ShowWindow(HWND, 9)   # SW_RESTORE
time.sleep(0.3)
user32.SetForegroundWindow(HWND)
time.sleep(0.5)

# Get rect
rect = ctypes.wintypes.RECT()
user32.GetWindowRect(HWND, ctypes.byref(rect))
print(f"DevTools rect: left={rect.left} top={rect.top} right={rect.right} bottom={rect.bottom}")
