# Sprint 3-mini QA Evidence Collection - Final Version
# Game region: left=1340, top=140, width=410, height=880
# Console input: physical x=320, y=808

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAEV {
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
    Write-Host "  >> Shot: $name"
}

function FocusDT {
    $fg=[QAEV]::GetForegroundWindow(); $dummy=0
    $tid=[QAEV]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAEV]::GetCurrentThreadId()
    [QAEV]::AttachThreadInput($me,$tid,$true)
    [QAEV]::BringWindowToTop($HWND); [QAEV]::ShowWindow($HWND,9); [QAEV]::SetForegroundWindow($HWND)
    [QAEV]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function NavConsole {
    param([string]$cmd)
    FocusDT
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 150
    # Click console prompt at (320, 808)
    [QAEV]::SetCursorPos(320, 808)
    Start-Sleep -Milliseconds 150
    [QAEV]::mouse_event(2,0,0,0,0); Start-Sleep 50; [QAEV]::mouse_event(4,0,0,0,0)
    Start-Sleep -Milliseconds 400
    # Ctrl+A Ctrl+V Enter
    [QAEV]::keybd_event(0x11,0,0,0); [QAEV]::keybd_event(0x41,0,0,0)
    Start-Sleep 80
    [QAEV]::keybd_event(0x41,0,2,0); [QAEV]::keybd_event(0x11,0,2,0)
    Start-Sleep 80
    [QAEV]::keybd_event(0x11,0,0,0); [QAEV]::keybd_event(0x56,0,0,0)
    Start-Sleep 80
    [QAEV]::keybd_event(0x56,0,2,0); [QAEV]::keybd_event(0x11,0,2,0)
    Start-Sleep 300
    [QAEV]::keybd_event(0x0D,0,0,0); Start-Sleep 80; [QAEV]::keybd_event(0x0D,0,2,0)
    Start-Sleep -Milliseconds 1500
    Write-Host "  >> Console: $cmd"
    # Re-focus DevTools after console input (typing may have shifted focus)
    FocusDT
    Start-Sleep -Milliseconds 800
}

function ClickGame {
    param([float]$fx, [float]$fy)
    FocusDT
    $px=$GL+[int]($GW*$fx); $py=$GT+[int]($GH*$fy)
    [QAEV]::SetCursorPos($px,$py); Start-Sleep 150
    [QAEV]::mouse_event(2,0,0,0,0); Start-Sleep 80; [QAEV]::mouse_event(4,0,0,0,0)
    Start-Sleep -Milliseconds 1500
    Write-Host "  >> Click: $px,$py"
    FocusDT
    Start-Sleep 500
}

Write-Host "=== Sprint 3-mini QA Evidence ==="

# --- Baseline: current fail screen state ---
Write-Host "`n[BASELINE] Fail screen"
FocusDT
Shot "EV-00-fail-screen.png"

# --- TEST: Click 选关 button (72% x, 63% y of game area) ---
Write-Host "`n[NAV] Click 选关 -> level select"
ClickGame 0.72 0.63
Shot "EV-01-after-xuan-guan.png"

# --- TEST: Navigate via console ---
Write-Host "`n[NAV] Console -> main menu"
NavConsole "wx.__navigate('menu')"
Shot "EV-02-main-menu.png"

# --- TEST: Level select via console ---
Write-Host "`n[NAV] Console -> levels"
NavConsole "wx.__navigate('levels')"
Shot "EV-03-level-select-console.png"

# --- TEST: Clear hint + navigate to game ---
Write-Host "`n[SETUP] Clear hint storage"
NavConsole "wx.removeStorageSync('__hintSeen')"
Shot "EV-04-hint-cleared.png"

Write-Host "`n[NAV] Console -> game"
NavConsole "wx.__navigate('game')"
Shot "EV-05-game-entered.png"
# Hint should appear (cleared above)
Write-Host "  Capturing hint..."
Shot "EV-06-hint-visible.png"
Write-Host "  Waiting 3.5s..."
Start-Sleep -Milliseconds 3500
FocusDT
Shot "EV-07-hint-faded.png"

# --- GAMEPLAY screenshots ---
Write-Host "`n[GAMEPLAY] Debris and stars"
FocusDT
Shot "EV-08-gameplay-debris.png"
Start-Sleep 2000
FocusDT
Shot "EV-09-gameplay-2s.png"

# --- Net fire ---
Write-Host "`n[PHYSICS] Tap to fire net"
ClickGame 0.5 0.4
Shot "EV-10-net-fired.png"

# --- NAV REGRESSION ---
Write-Host "`n[NAV-REG] game -> levels -> menu -> game"
NavConsole "wx.__navigate('levels')"
Shot "EV-11-nav-levels.png"

NavConsole "wx.__navigate('menu')"
Shot "EV-12-nav-menu.png"

NavConsole "wx.__navigate('game')"
Shot "EV-13-nav-game-final.png"

Write-Host "`n=== Done ==="
