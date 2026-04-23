# Navigate game screens and capture QA evidence
# Correct nav keys: 'menu', 'levels', 'game'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAAPI2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
}
'@

$HWND = [IntPtr]7015796
$OUTDIR = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"

$MSS_PY = @"
import mss, mss.tools, sys
r = {'top':85,'left':1255,'width':660,'height':820}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
"@
$MSS_PY | Set-Content "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py" -Encoding utf8

function Take-Shot {
    param([string]$filename)
    $path = Join-Path $OUTDIR $filename
    & python "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py" $path 2>&1 | Out-Null
    Write-Host "Shot: $filename"
}

function Focus-DT {
    $fg = [QAAPI2]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAAPI2]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAAPI2]::GetCurrentThreadId()
    [QAAPI2]::AttachThreadInput($myTid, $fgTid, $true)
    [QAAPI2]::BringWindowToTop($HWND)
    [QAAPI2]::ShowWindow($HWND, 9)
    [QAAPI2]::SetForegroundWindow($HWND) | Out-Null
    [QAAPI2]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 600
}

function Send-Cmd {
    param([string]$cmd)
    Focus-DT
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 200
    # Click console input at physical (314, 805)
    [QAAPI2]::SetCursorPos(314, 805)
    Start-Sleep -Milliseconds 150
    [QAAPI2]::mouse_event(2, 0, 0, 0, 0); [QAAPI2]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 400
    # Ctrl+A to select all, Ctrl+V to paste
    [QAAPI2]::keybd_event(0x11, 0, 0, 0); [QAAPI2]::keybd_event(0x41, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI2]::keybd_event(0x41, 0, 2, 0); [QAAPI2]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 100
    [QAAPI2]::keybd_event(0x11, 0, 0, 0); [QAAPI2]::keybd_event(0x56, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI2]::keybd_event(0x56, 0, 2, 0); [QAAPI2]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 300
    [QAAPI2]::keybd_event(0x0D, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI2]::keybd_event(0x0D, 0, 2, 0)
    Start-Sleep -Milliseconds 1800
    Write-Host "Cmd sent: $cmd"
}

function Click-Game {
    # Click inside game canvas at relative fractions (0-1)
    param([float]$fx, [float]$fy, [int]$waitMs=1500)
    $px = 1255 + [int](660 * $fx)
    $py = 85 + [int](820 * $fy)
    [QAAPI2]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 100
    [QAAPI2]::mouse_event(2, 0, 0, 0, 0); [QAAPI2]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $waitMs
    Write-Host "Game click: ($px,$py) = ${fx}x${fy}"
}

Write-Host "=== QA Navigate Script ==="

# Step 0: Clear hint storage
Send-Cmd "wx.removeStorageSync('__hintSeen')"
Take-Shot "QA-00-after-clear-hint.png"

# Step 1: Navigate to levels screen
Send-Cmd "wx.__navigate('levels')"
Start-Sleep -Milliseconds 500
Take-Shot "QA-01-levels-screen.png"

# Step 2: Navigate to main menu
Send-Cmd "wx.__navigate('menu')"
Start-Sleep -Milliseconds 500
Take-Shot "QA-02-main-menu.png"

# Step 3: Navigate back to levels, then click level 1 card
# Level select has 5-col grid. Level 1 is first card.
# Game area is 660x820 physical. Level cards start after title header (~y=15% from top).
# Row 1 center at ~y=22%. Column 1 center at ~x=15%.
Send-Cmd "wx.__navigate('levels')"
Start-Sleep -Milliseconds 800
Take-Shot "QA-03-levels-before-click.png"
# Level 1 card: first card in grid, approx 15% x, 22% y
Click-Game 0.15 0.22 2000
Take-Shot "QA-04-after-level1-click.png"

# Step 4: After entering game, take hint screenshot immediately (hint should show after __hintSeen cleared)
# Hint should appear after canvas is ready
Take-Shot "QA-05-hint-check.png"
Start-Sleep -Milliseconds 3500
Take-Shot "QA-06-hint-faded.png"

# Step 5: Capture gameplay showing debris glow and stars
Take-Shot "QA-07-gameplay-debris-stars.png"
Start-Sleep -Milliseconds 2000
Take-Shot "QA-08-gameplay-2s-later.png"

# Step 6: Tap game to fire net
Click-Game 0.5 0.5 800
Take-Shot "QA-09-net-fired.png"

# Step 7: Navigate to levels (NAV regression)
Send-Cmd "wx.__navigate('levels')"
Start-Sleep -Milliseconds 600
Take-Shot "QA-10-nav-levels.png"

# Step 8: Navigate to menu (NAV regression)
Send-Cmd "wx.__navigate('menu')"
Start-Sleep -Milliseconds 600
Take-Shot "QA-11-nav-menu.png"

# Step 9: Navigate to game directly
Send-Cmd "wx.__navigate('game')"
Start-Sleep -Milliseconds 600
Take-Shot "QA-12-nav-game.png"

Write-Host "`n=== Done ==="
