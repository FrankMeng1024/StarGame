# Full QA interaction script - runs all tests, takes screenshots using Python mss
# Screenshot after each action before terminal regains focus

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
public class QAAPI {
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
$GAME_PHYS = @{Left=1255; Top=85; Width=660; Height=820}
$OUTDIR = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"

# Python mss screenshot via inline script
$MSS_PY = @"
import mss, mss.tools, sys
r = {'top':85,'left':1255,'width':660,'height':820}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
print('saved')
"@
$MSS_PY | Set-Content "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py" -Encoding utf8

function Take-Shot {
    param([string]$filename)
    $path = Join-Path $OUTDIR $filename
    # Run mss from python - it doesn't steal focus (no window)
    & python "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py" $path 2>&1 | Out-Null
    Write-Host "Shot: $filename"
}

function Focus-DT {
    $fg = [QAAPI]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAAPI]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAAPI]::GetCurrentThreadId()
    [QAAPI]::AttachThreadInput($myTid, $fgTid, $true)
    [QAAPI]::BringWindowToTop($HWND)
    [QAAPI]::ShowWindow($HWND, 9)
    [QAAPI]::SetForegroundWindow($HWND) | Out-Null
    [QAAPI]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 600
    $got = [QAAPI]::GetForegroundWindow()
    Write-Host "Focus: $($got -eq $HWND)"
}

function Send-Cmd {
    param([string]$cmd)
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 200
    # Click console input bar (physical 314, 805)
    [QAAPI]::SetCursorPos(314, 805)
    Start-Sleep -Milliseconds 100
    [QAAPI]::mouse_event(2, 0, 0, 0, 0); [QAAPI]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 300
    [QAAPI]::keybd_event(0x11, 0, 0, 0); [QAAPI]::keybd_event(0x41, 0, 0, 0) # Ctrl+A
    Start-Sleep -Milliseconds 50
    [QAAPI]::keybd_event(0x41, 0, 2, 0); [QAAPI]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 100
    [QAAPI]::keybd_event(0x11, 0, 0, 0); [QAAPI]::keybd_event(0x56, 0, 0, 0) # Ctrl+V
    Start-Sleep -Milliseconds 50
    [QAAPI]::keybd_event(0x56, 0, 2, 0); [QAAPI]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 300
    [QAAPI]::keybd_event(0x0D, 0, 0, 0); [QAAPI]::keybd_event(0x0D, 0, 2, 0) # Enter
    Start-Sleep -Milliseconds 1500
    Write-Host "Cmd: $cmd"
}

function Click-At {
    param([int]$px, [int]$py, [int]$waitMs=1500)
    [QAAPI]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 100
    [QAAPI]::mouse_event(2, 0, 0, 0, 0); [QAAPI]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $waitMs
    Write-Host "Click: $px,$py"
}

Write-Host "=== QA Runner Start ==="

# Initial setup: clear hint storage, take baseline
Focus-DT
Send-Cmd "wx.removeStorageSync('__hintSeen')"
Take-Shot "SETUP-00-baseline.png"

# --- TEST-01: Level select icon fix (STORY-00215) ---
Write-Host "`n--- TEST-01: Level select ---"
Focus-DT
Send-Cmd "wx.__navigate('levelSelect')"
Start-Sleep -Milliseconds 500
Take-Shot "STORY-00215-01-level-select.png"

# --- TEST-02: Tutorial hint (STORY-00213) ---
Write-Host "`n--- TEST-02: Tutorial hint ---"
# Tap level 1 to enter game - level 1 card position
# In devtools screenshot (full 1920px), level 1 card was at roughly x=1005, y=185 (physical)
# The simulator game area left=1337 (based on phone frame), level cards within simulator
# For clicking INSIDE the game/simulator:
# Physical simulator inner area: x=1337..1905 (width=568), y=170..740 (height=570)
# Level 1 is in top-left of the 5-column grid
# Approximate: column 1 center at (1337 + 568*0.1) = 1394, row 1 center at (170 + 570*0.15) = 256
# But better: use the devtools-full.png coordinates - level 1 card center was approx x=1005, y=185 in that screenshot
# devtools-full.png is 1920x1200 showing DevTools at physical (1,0,1919,1200)
# Level 1 card in that image: visible at physical x≈1005, y≈185
Click-At 1005 185
# Quick shot to catch hint
Take-Shot "STORY-00213-01-hint-visible.png"
Write-Host "Waiting 4s for hint to disappear..."
Start-Sleep -Milliseconds 4000
Take-Shot "STORY-00213-02-hint-gone.png"

# --- TEST-03: Debris glow (STORY-00216) ---
Write-Host "`n--- TEST-03: Debris glow (capture gameplay) ---"
# Already in game. Take shot of gameplay showing debris
Take-Shot "STORY-00216-01-debris-glow.png"
# Take additional shot 2s later to show game running
Start-Sleep -Milliseconds 2000
Take-Shot "STORY-00216-02-debris-gameplay.png"

# --- TEST-04: Physics dt-based (STORY-00214) - navigate to game, observe net ---
Write-Host "`n--- TEST-04: Net physics (screenshot in-game) ---"
Take-Shot "STORY-00214-01-gameplay.png"
# Tap to fire net
$gameLeft = 1255; $gameTop = 85; $gameW = 660; $gameH = 820
$tapX = $gameLeft + [int]($gameW * 0.5)
$tapY = $gameTop + [int]($gameH * 0.5)
Click-At $tapX $tapY 500
Take-Shot "STORY-00214-02-net-fired.png"

# --- TEST-05: Victory screen (STORY-00212) ---
# Can't reach easily without winning, capture current state
Write-Host "`n--- TEST-05: Fail/game state capture (STORY-00212 untestable, capture state) ---"
Take-Shot "STORY-00212-00-state.png"

# --- NAV-01: Level select → game → back ---
Write-Host "`n--- NAV-01: Navigate level select ---"
Focus-DT
Send-Cmd "wx.__navigate('levelSelect')"
Start-Sleep -Milliseconds 800
Take-Shot "NAV-01-level-select.png"

# --- NAV-02: Navigate to game screen ---
Write-Host "`n--- NAV-02: Navigate game ---"
Focus-DT
Send-Cmd "wx.__navigate('game', {levelIndex: 0})"
Start-Sleep -Milliseconds 800
Take-Shot "NAV-02-game.png"

# --- NAV-03: Navigate to main menu ---
Write-Host "`n--- NAV-03: Navigate main menu ---"
Focus-DT
Send-Cmd "wx.__navigate('mainMenu')"
Start-Sleep -Milliseconds 800
Take-Shot "NAV-03-main-menu.png"

# --- Final: level select again for complete coverage ---
Write-Host "`n--- FINAL: Level select re-check ---"
Focus-DT
Send-Cmd "wx.__navigate('levelSelect')"
Start-Sleep -Milliseconds 800
Take-Shot "FINAL-level-select-recheck.png"

Write-Host "`n=== QA Runner Complete ==="
Write-Host "Evidence in: $OUTDIR"
