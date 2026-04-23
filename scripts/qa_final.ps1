# FINAL QA Runner - calibrated coordinates
# Game: left=1340, top=140, width=410, height=880
# Console >: approximately (320, 808) physical

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAFINAL {
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
$PYTHONW = "C:\Program Files\Python314\pythonw.exe"
# Game region (physical pixels)
$GL = 1340; $GT = 140; $GW = 410; $GH = 880

# Update mss script with calibrated coords
@"
import mss, mss.tools, sys
r = {'top':140,'left':1340,'width':410,'height':880}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
"@ | Set-Content "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py" -Encoding utf8

function Focus-DT {
    $fg = [QAFINAL]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAFINAL]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAFINAL]::GetCurrentThreadId()
    [QAFINAL]::AttachThreadInput($myTid, $fgTid, $true)
    [QAFINAL]::BringWindowToTop($HWND)
    [QAFINAL]::ShowWindow($HWND, 9)
    [QAFINAL]::SetForegroundWindow($HWND) | Out-Null
    [QAFINAL]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 500
}

function Take-Shot {
    param([string]$filename)
    $path = Join-Path $OUTDIR $filename
    $proc = Start-Process -FilePath $PYTHONW -ArgumentList "`"C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py`"","`"$path`"" -WindowStyle Hidden -PassThru
    $proc.WaitForExit(5000) | Out-Null
    Write-Host "Shot: $filename"
}

function Send-Cmd {
    param([string]$cmd)
    Focus-DT
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 200
    # Console input > at physical (320, 808)
    [QAFINAL]::SetCursorPos(320, 808)
    Start-Sleep -Milliseconds 150
    [QAFINAL]::mouse_event(2, 0, 0, 0, 0); Start-Sleep -Milliseconds 80; [QAFINAL]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 400
    # Ctrl+A, Ctrl+V, Enter
    [QAFINAL]::keybd_event(0x11, 0, 0, 0); [QAFINAL]::keybd_event(0x41, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAFINAL]::keybd_event(0x41, 0, 2, 0); [QAFINAL]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 100
    [QAFINAL]::keybd_event(0x11, 0, 0, 0); [QAFINAL]::keybd_event(0x56, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAFINAL]::keybd_event(0x56, 0, 2, 0); [QAFINAL]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 300
    [QAFINAL]::keybd_event(0x0D, 0, 0, 0); Start-Sleep -Milliseconds 80; [QAFINAL]::keybd_event(0x0D, 0, 2, 0)
    Start-Sleep -Milliseconds 2000
    Write-Host "Cmd: $cmd"
}

function Click-Game {
    # Click at fractional position within game canvas
    param([float]$fx, [float]$fy, [int]$waitMs=1500)
    Focus-DT
    $px = $GL + [int]($GW * $fx)
    $py = $GT + [int]($GH * $fy)
    [QAFINAL]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 150
    [QAFINAL]::mouse_event(2, 0, 0, 0, 0); Start-Sleep -Milliseconds 80; [QAFINAL]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $waitMs
    Write-Host "Game click: ${px},${py} (${fx},${fy})"
}

Write-Host "=== Sprint 3-mini QA Runner ==="

# STEP 0: Clear hint storage so tutorial will show
Send-Cmd "wx.removeStorageSync('__hintSeen')"
Take-Shot "QA-FINAL-00-after-clear.png"

# STEP 1: Click "选关" on fail screen to navigate to level select
# 选关 button: ~72% x, ~63% y in game area
Write-Host "`n--- Navigating: click 选关 on fail screen ---"
Click-Game 0.72 0.63 2000
Take-Shot "QA-FINAL-01-level-select.png"

# STEP 2: Navigate to main menu via console
Write-Host "`n--- Navigate to main menu ---"
Send-Cmd "wx.__navigate('menu')"
Take-Shot "QA-FINAL-02-main-menu.png"

# STEP 3: Navigate to levels via console
Write-Host "`n--- Navigate to levels ---"
Send-Cmd "wx.__navigate('levels')"
Take-Shot "QA-FINAL-03-levels-from-console.png"

# STEP 4: Click Level 1 card to enter game
# Level select grid: first card (猎户座)
# In 410x880 canvas, level cards start at ~y=15% after header
# 5-column grid, col1 center at ~10% x, row1 center at ~25% y
Write-Host "`n--- Click Level 1 card ---"
Click-Game 0.10 0.25 2500
Take-Shot "QA-FINAL-04-after-level1-click.png"

# STEP 5: Check for tutorial hint (should appear since we cleared __hintSeen)
Write-Host "`n--- Checking tutorial hint ---"
Take-Shot "QA-FINAL-05-hint-check.png"
# Wait for hint to fade (3 seconds)
Write-Host "Waiting 3.5s for hint to fade..."
Start-Sleep -Milliseconds 3500
Take-Shot "QA-FINAL-06-hint-faded.png"

# STEP 6: Gameplay with debris visible
Write-Host "`n--- Gameplay screenshots ---"
Take-Shot "QA-FINAL-07-gameplay.png"
Start-Sleep -Milliseconds 2000
Take-Shot "QA-FINAL-08-gameplay-2s.png"

# STEP 7: Tap to fire net (physics test)
Write-Host "`n--- Tap to fire net ---"
Click-Game 0.5 0.4 800
Take-Shot "QA-FINAL-09-net-fired.png"

# STEP 8: Navigate back to level select (NAV regression)
Write-Host "`n--- NAV regression: game -> levels ---"
Send-Cmd "wx.__navigate('levels')"
Take-Shot "QA-FINAL-10-nav-levels.png"

# STEP 9: Navigate to menu (NAV regression)
Write-Host "`n--- NAV regression: levels -> menu ---"
Send-Cmd "wx.__navigate('menu')"
Take-Shot "QA-FINAL-11-nav-menu.png"

# STEP 10: Navigate back to game
Write-Host "`n--- NAV regression: menu -> game ---"
Send-Cmd "wx.__navigate('game')"
Take-Shot "QA-FINAL-12-nav-game.png"

Write-Host "`n=== QA Runner Complete. Evidence in: $OUTDIR ==="
