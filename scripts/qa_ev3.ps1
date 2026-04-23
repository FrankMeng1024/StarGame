# Sprint 3-mini QA - Fixed sleep syntax + console-only navigation

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAEV3 {
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

function FocusDT {
    $fg=[QAEV3]::GetForegroundWindow(); $dummy=0
    $tid=[QAEV3]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAEV3]::GetCurrentThreadId()
    [QAEV3]::AttachThreadInput($me,$tid,$true)
    [QAEV3]::BringWindowToTop($HWND); [QAEV3]::ShowWindow($HWND,9); [QAEV3]::SetForegroundWindow($HWND)
    [QAEV3]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function Cmd {
    param([string]$c)
    FocusDT
    Set-Clipboard -Value $c
    Start-Sleep -Milliseconds 150
    [QAEV3]::SetCursorPos(320, 808); Start-Sleep -Milliseconds 150
    [QAEV3]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 50; [QAEV3]::mouse_event(4,0,0,0,0)
    Start-Sleep -Milliseconds 400
    [QAEV3]::keybd_event(0x11,0,0,0); [QAEV3]::keybd_event(0x41,0,0,0)
    Start-Sleep -Milliseconds 80
    [QAEV3]::keybd_event(0x41,0,2,0); [QAEV3]::keybd_event(0x11,0,2,0)
    Start-Sleep -Milliseconds 80
    [QAEV3]::keybd_event(0x11,0,0,0); [QAEV3]::keybd_event(0x56,0,0,0)
    Start-Sleep -Milliseconds 80
    [QAEV3]::keybd_event(0x56,0,2,0); [QAEV3]::keybd_event(0x11,0,2,0)
    Start-Sleep -Milliseconds 300
    [QAEV3]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QAEV3]::keybd_event(0x0D,0,2,0)
    Start-Sleep -Milliseconds 1800
    Write-Host "  CMD: $c"
    # Wait for navigation to complete
    Start-Sleep -Milliseconds 600
}

Write-Host "=== Sprint 3-mini QA Evidence v3 ==="

# 0. Baseline
Write-Host "[0] Baseline fail screen"
FocusDT; Shot "EV3-00-fail-screen.png"

# 1. Navigate to menu
Write-Host "[1] Navigate to menu"
Cmd "wx.__navigate('menu')"
FocusDT; Shot "EV3-01-main-menu.png"

# 2. Navigate to levels
Write-Host "[2] Navigate to levels"
Cmd "wx.__navigate('levels')"
FocusDT; Shot "EV3-02-level-select.png"

# 3. Navigate to game
Write-Host "[3] Navigate to game"
Cmd "wx.__navigate('game')"
FocusDT; Shot "EV3-03-game.png"

# 4. Clear hint and re-enter game (hint should show)
Write-Host "[4] Clear hint + re-enter"
Cmd "wx.removeStorageSync('__hintSeen')"
Cmd "wx.__navigate('game')"
FocusDT; Shot "EV3-04-game-hint.png"
Start-Sleep -Milliseconds 1500
FocusDT; Shot "EV3-05-hint-visible.png"
Write-Host "  Waiting 4s..."
Start-Sleep -Milliseconds 4000
FocusDT; Shot "EV3-06-hint-faded.png"

# 5. Gameplay screenshots
Write-Host "[5] Gameplay"
FocusDT; Shot "EV3-07-gameplay.png"
Start-Sleep -Milliseconds 2000
FocusDT; Shot "EV3-08-gameplay-2s.png"

# 6. NAV regression: game -> levels -> menu -> game
Write-Host "[6] NAV regression"
Cmd "wx.__navigate('levels')"
FocusDT; Shot "EV3-09-levels-nav.png"

Cmd "wx.__navigate('menu')"
FocusDT; Shot "EV3-10-menu-nav.png"

Cmd "wx.__navigate('game')"
FocusDT; Shot "EV3-11-game-nav.png"

Write-Host "=== Done. Evidence in $OUTDIR ==="
