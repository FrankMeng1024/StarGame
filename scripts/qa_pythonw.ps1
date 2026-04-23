# QA Screenshot using pythonw (no console window, no focus steal)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAAPI5 {
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
$MSS_SCRIPT = "C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py"

# mss script (physical coords)
@"
import mss, mss.tools, sys
r = {'top':85,'left':1255,'width':660,'height':820}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
"@ | Set-Content $MSS_SCRIPT -Encoding utf8

# mss full screen script
@"
import mss, mss.tools, sys
r = {'top':0,'left':0,'width':1920,'height':1200}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
"@ | Set-Content "C:\ClaudeCodeProjects\StarGame\scripts\_mss_full.py" -Encoding utf8

function Take-Shot {
    param([string]$filename, [switch]$Full)
    $path = Join-Path $OUTDIR $filename
    if ($Full) {
        $script = "C:\ClaudeCodeProjects\StarGame\scripts\_mss_full.py"
    } else {
        $script = $MSS_SCRIPT
    }
    # Use Start-Process with pythonw (no window) and Wait
    $proc = Start-Process -FilePath $PYTHONW -ArgumentList "`"$script`" `"$path`"" -WindowStyle Hidden -PassThru
    $proc.WaitForExit(5000) | Out-Null
    Write-Host "Shot: $filename"
}

function Focus-DT {
    $fg = [QAAPI5]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAAPI5]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAAPI5]::GetCurrentThreadId()
    [QAAPI5]::AttachThreadInput($myTid, $fgTid, $true)
    [QAAPI5]::BringWindowToTop($HWND)
    [QAAPI5]::ShowWindow($HWND, 9)
    [QAAPI5]::SetForegroundWindow($HWND) | Out-Null
    [QAAPI5]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 600
    $got = [QAAPI5]::GetForegroundWindow()
    Write-Host "Focus: fg=$got (want $HWND)"
}

function Send-Cmd {
    param([string]$cmd)
    Focus-DT
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 200
    [QAAPI5]::SetCursorPos(314, 805)
    Start-Sleep -Milliseconds 150
    [QAAPI5]::mouse_event(2, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI5]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 400
    [QAAPI5]::keybd_event(0x11, 0, 0, 0); [QAAPI5]::keybd_event(0x41, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI5]::keybd_event(0x41, 0, 2, 0); [QAAPI5]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 100
    [QAAPI5]::keybd_event(0x11, 0, 0, 0); [QAAPI5]::keybd_event(0x56, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI5]::keybd_event(0x56, 0, 2, 0); [QAAPI5]::keybd_event(0x11, 0, 2, 0)
    Start-Sleep -Milliseconds 300
    [QAAPI5]::keybd_event(0x0D, 0, 0, 0); Start-Sleep -Milliseconds 80; [QAAPI5]::keybd_event(0x0D, 0, 2, 0)
    Start-Sleep -Milliseconds 2000
    Write-Host "Cmd: $cmd"
}

function Click-Game {
    param([float]$fx, [float]$fy, [int]$waitMs=1000)
    Focus-DT
    $px = 1255 + [int](660 * $fx)
    $py = 85 + [int](820 * $fy)
    [QAAPI5]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 150
    [QAAPI5]::mouse_event(2, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI5]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $waitMs
    Write-Host "Game click: $px,$py"
}

Write-Host "=== QA with pythonw ==="

# First: calibration - take full screen with DevTools focused
Focus-DT
Start-Sleep -Milliseconds 200
Take-Shot "CALIB-pw-full.png" -Full
Take-Shot "CALIB-pw-game.png"

Write-Host "Calibration done. Check screenshots."
