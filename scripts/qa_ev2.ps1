# Sprint 3-mini QA - No-deadlock version
# Key: FocusDT only called for console commands. Shots taken immediately after operations.
# mss captures correct screen region regardless of foreground window when DevTools already visible.

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAEV2 {
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
$MSS = "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py"
$GL=1340; $GT=140; $GW=410; $GH=880

function Shot {
    param([string]$name)
    $path = Join-Path $OUTDIR $name
    $p = Start-Process $PYTHONW -ArgumentList "`"$MSS`"","`"$path`"" -WindowStyle Hidden -PassThru
    $p.WaitForExit(5000) | Out-Null
    Write-Host "  SHOT: $name"
}

# Safe focus: use AttachThreadInput only before console commands, not after clicks
function FocusDT {
    $fg=[QAEV2]::GetForegroundWindow(); $dummy=0
    $tid=[QAEV2]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAEV2]::GetCurrentThreadId()
    [QAEV2]::AttachThreadInput($me,$tid,$true)
    [QAEV2]::BringWindowToTop($HWND); [QAEV2]::ShowWindow($HWND,9); [QAEV2]::SetForegroundWindow($HWND)
    [QAEV2]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function Console-Nav {
    param([string]$cmd)
    FocusDT
    Set-Clipboard -Value $cmd
    Start-Sleep 150
    [QAEV2]::SetCursorPos(320, 808); Start-Sleep 150
    [QAEV2]::mouse_event(2,0,0,0,0); Start-Sleep 50; [QAEV2]::mouse_event(4,0,0,0,0)
    Start-Sleep 400
    [QAEV2]::keybd_event(0x11,0,0,0); [QAEV2]::keybd_event(0x41,0,0,0); Start-Sleep 80
    [QAEV2]::keybd_event(0x41,0,2,0); [QAEV2]::keybd_event(0x11,0,2,0); Start-Sleep 80
    [QAEV2]::keybd_event(0x11,0,0,0); [QAEV2]::keybd_event(0x56,0,0,0); Start-Sleep 80
    [QAEV2]::keybd_event(0x56,0,2,0); [QAEV2]::keybd_event(0x11,0,2,0); Start-Sleep 300
    [QAEV2]::keybd_event(0x0D,0,0,0); Start-Sleep 80; [QAEV2]::keybd_event(0x0D,0,2,0)
    Start-Sleep 2000
    Write-Host "  CMD: $cmd"
}

function Click-Canvas {
    param([float]$fx, [float]$fy, [int]$waitMs=2000)
    # NO FocusDT before/after click - avoids deadlock
    # DevTools should already be in front from previous FocusDT
    $px=$GL+[int]($GW*$fx); $py=$GT+[int]($GH*$fy)
    [QAEV2]::SetCursorPos($px,$py); Start-Sleep 150
    [QAEV2]::mouse_event(2,0,0,0,0); Start-Sleep 80; [QAEV2]::mouse_event(4,0,0,0,0)
    Start-Sleep $waitMs
    Write-Host "  CLICK: $px,$py"
}

Write-Host "=== Sprint 3-mini QA ==="

# ---- Step 0: Baseline ----
Write-Host "[0] Baseline - fail screen"
FocusDT
Shot "EV-00-fail-screen.png"

# ---- Step 1: Click 选关 on fail screen ----
Write-Host "[1] Click 选关 (72% x, 63% y)"
# FocusDT called above, DevTools is in front
Click-Canvas 0.72 0.63 2000
Shot "EV-01-after-xuan-guan.png"

# ---- Step 2: Navigate via console ----
Write-Host "[2] Console: main menu"
Console-Nav "wx.__navigate('menu')"
Shot "EV-02-main-menu.png"

Write-Host "[3] Console: levels"
Console-Nav "wx.__navigate('levels')"
Shot "EV-03-level-select.png"

# ---- Step 3: Enter game ----
Write-Host "[4] Console: clear hint + game"
Console-Nav "wx.removeStorageSync('__hintSeen')"
Console-Nav "wx.__navigate('game')"
Shot "EV-04-game-start.png"
Start-Sleep 500
Shot "EV-05-hint-check.png"
Write-Host "  Waiting 4s for hint fade..."
Start-Sleep 4000
FocusDT
Shot "EV-06-hint-faded.png"

# ---- Step 4: Gameplay ----
Write-Host "[5] Gameplay screenshots"
FocusDT
Shot "EV-07-gameplay.png"
Start-Sleep 2000
FocusDT
Shot "EV-08-gameplay-2s.png"

# ---- Step 5: Fire net ----
Write-Host "[6] Fire net"
FocusDT
Click-Canvas 0.5 0.4 1000
Shot "EV-09-net.png"

# ---- Step 6: NAV regression ----
Write-Host "[7] NAV: game->levels->menu->game"
Console-Nav "wx.__navigate('levels')"
Shot "EV-10-levels.png"
Console-Nav "wx.__navigate('menu')"
Shot "EV-11-menu.png"
Console-Nav "wx.__navigate('game')"
Shot "EV-12-game-final.png"

Write-Host "=== QA Done ==="
