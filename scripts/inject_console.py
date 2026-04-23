import ctypes, ctypes.wintypes, time, sys
sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
DEVTOOLS_HWND = 7015796

def click_logical(lx, ly):
    """Click at logical coordinates (auto-converts to physical via SetCursorPos)"""
    # SetCursorPos uses physical pixels on high-DPI
    px = int(lx * 1.5)
    py = int(ly * 1.5)
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(2, 0, 0, 0, 0)   # MOUSEEVENTF_LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(4, 0, 0, 0, 0)   # MOUSEEVENTF_LEFTUP
    time.sleep(0.1)

def type_to_console(command):
    """Type a command to DevTools console using clipboard paste"""
    import subprocess
    # Set clipboard
    subprocess.run(['powershell', '-command', f'Set-Clipboard -Value "{command}"'], 
                   capture_output=True)
    time.sleep(0.2)
    # Paste with Ctrl+V
    user32.keybd_event(0x11, 0, 0, 0)   # Ctrl down
    user32.keybd_event(0x56, 0, 0, 0)   # V down
    user32.keybd_event(0x56, 0, 2, 0)   # V up
    user32.keybd_event(0x11, 0, 2, 0)   # Ctrl up
    time.sleep(0.2)
    # Press Enter
    user32.keybd_event(0x0D, 0, 0, 0)   # Enter down
    user32.keybd_event(0x0D, 0, 2, 0)   # Enter up
    time.sleep(0.5)

# Bring DevTools to front first
user32.ShowWindow(DEVTOOLS_HWND, 9)
time.sleep(0.3)
user32.SetForegroundWindow(DEVTOOLS_HWND)
time.sleep(0.5)

cmd = sys.argv[1] if len(sys.argv) > 1 else "wx.__navigate('levelSelect')"

# Click on console input area - at bottom of DevTools 
# DevTools logical: left=1, bottom=800
# Console input bar is at approximately logical y=770, x=600
click_logical(600, 770)
time.sleep(0.3)

# Select all text first to replace
user32.keybd_event(0x11, 0, 0, 0)  # Ctrl
user32.keybd_event(0x41, 0, 0, 0)  # A
user32.keybd_event(0x41, 0, 2, 0)
user32.keybd_event(0x11, 0, 2, 0)
time.sleep(0.1)

type_to_console(cmd)
print(f"Injected: {cmd}")
