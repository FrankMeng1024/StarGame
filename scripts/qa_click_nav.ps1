# Click-only navigation - bypass console, use UI buttons directly

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAAPI3 {
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
    $fg = [QAAPI3]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAAPI3]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAAPI3]::GetCurrentThreadId()
    [QAAPI3]::AttachThreadInput($myTid, $fgTid, $true)
    [QAAPI3]::BringWindowToTop($HWND)
    [QAAPI3]::ShowWindow($HWND, 9)
    [QAAPI3]::SetForegroundWindow($HWND) | Out-Null
    [QAAPI3]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 600
}

function Click-Phys {
    param([int]$px, [int]$py, [int]$waitMs=1000)
    Focus-DT
    [QAAPI3]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 150
    [QAAPI3]::mouse_event(2, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 80
    [QAAPI3]::mouse_event(4, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $waitMs
    Write-Host "Clicked: ($px,$py)"
}

function Click-Game {
    param([float]$fx, [float]$fy, [int]$waitMs=1000)
    $px = 1255 + [int](660 * $fx)
    $py = 85 + [int](820 * $fy)
    Click-Phys $px $py $waitMs
}

# First: capture full DevTools window to re-calibrate console coords
$MSS_FULL = @"
import mss, mss.tools, sys
r = {'top':0,'left':0,'width':1920,'height':1200}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
"@
$MSS_FULL | Set-Content "C:\ClaudeCodeProjects\StarGame\scripts\_mss_full.py" -Encoding utf8

Focus-DT
Start-Sleep -Milliseconds 400
& python "C:\ClaudeCodeProjects\StarGame\scripts\_mss_full.py" (Join-Path $OUTDIR "FULL-devtools-current.png") 2>&1 | Out-Null
Write-Host "Captured full DevTools window"

# Now try to click "选关" button on fail screen
# From screenshot: button center at ~57% x, ~76% y of game area
# Physical: x=1255+660*0.57=1632, y=85+820*0.76=708
Write-Host "Clicking 选关 button..."
Click-Game 0.57 0.76 2000
Take-Shot "CLICK-01-after-xuan-guan.png"

# Now on level select - capture it
Take-Shot "CLICK-02-level-select.png"
