import ctypes, ctypes.wintypes, time, subprocess, sys, mss, mss.tools, os
sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
DEVTOOLS_HWND = 7015796
GAME_PHYS = {"top": 85, "left": 1255, "width": 660, "height": 820}

def focus_devtools():
    user32.ShowWindow(DEVTOOLS_HWND, 9)
    time.sleep(0.2)
    user32.SetForegroundWindow(DEVTOOLS_HWND)
    time.sleep(0.4)

def click_physical(px, py):
    user32.SetCursorPos(px, py)
    time.sleep(0.05)
    user32.mouse_event(2, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(4, 0, 0, 0, 0)
    time.sleep(0.1)

def inject_cmd(command):
    subprocess.run(['powershell', '-command', f'Set-Clipboard -Value \'{command}\''], 
                   capture_output=True)
    time.sleep(0.15)
    user32.keybd_event(0x11, 0, 0, 0)
    user32.keybd_event(0x56, 0, 0, 0)
    user32.keybd_event(0x56, 0, 2, 0)
    user32.keybd_event(0x11, 0, 2, 0)
    time.sleep(0.2)
    user32.keybd_event(0x0D, 0, 0, 0)
    user32.keybd_event(0x0D, 0, 2, 0)
    time.sleep(0.8)

def screenshot(outpath):
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with mss.mss() as sct:
        shot = sct.grab(GAME_PHYS)
        mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Shot: {outpath}")

command = sys.argv[1] if len(sys.argv) > 1 else "wx.__navigate('levelSelect')"
outpath = sys.argv[2] if len(sys.argv) > 2 else r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\nav-result.png'

# Focus DevTools, click console, inject command
focus_devtools()
# Console input is at the bottom of the DevTools panel
# DevTools logical bottom ~800, console input area ~770
# Physical = logical * 1.5: console at ~(900, 1155)
click_physical(900, 1155)
time.sleep(0.2)
user32.keybd_event(0x11, 0, 0, 0)
user32.keybd_event(0x41, 0, 0, 0)
user32.keybd_event(0x41, 0, 2, 0)
user32.keybd_event(0x11, 0, 2, 0)
time.sleep(0.1)
inject_cmd(command)

# Now screenshot
screenshot(outpath)
