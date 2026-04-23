Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QANav {
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
$HWND=[IntPtr]7015796
$PYTHONW="C:\Program Files\Python314\pythonw.exe"
$OUTDIR="C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"
$CON_X=333; $CON_Y=742
$GL_P=1340; $GT_P=140; $GW_P=410; $GH_P=880

function FocusDT {
    $fg=[QANav]::GetForegroundWindow(); $dummy=0
    $tid=[QANav]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QANav]::GetCurrentThreadId()
    [QANav]::AttachThreadInput($me,$tid,$true)
    [QANav]::BringWindowToTop($HWND); [QANav]::ShowWindow($HWND,9); [QANav]::SetForegroundWindow($HWND)
    [QANav]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}
function TypeCmd { param([string]$c)
    FocusDT
    Set-Clipboard -Value $c
    [QANav]::SetCursorPos($CON_X, $CON_Y); Start-Sleep -Milliseconds 200
    [QANav]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QANav]::mouse_event(4,0,0,0,0)
    Start-Sleep -Milliseconds 400
    [QANav]::keybd_event(0x11,0,0,0); [QANav]::keybd_event(0x41,0,0,0); Start-Sleep -Milliseconds 80
    [QANav]::keybd_event(0x41,0,2,0); [QANav]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 80
    [QANav]::keybd_event(0x11,0,0,0); [QANav]::keybd_event(0x56,0,0,0); Start-Sleep -Milliseconds 80
    [QANav]::keybd_event(0x56,0,2,0); [QANav]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 300
    [QANav]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QANav]::keybd_event(0x0D,0,2,0)
    Start-Sleep -Milliseconds 1800
    Write-Host "  CMD: $c"
    FocusDT; Start-Sleep -Milliseconds 400
}
function Shot { param([string]$n, [int]$l=$GL_P, [int]$t=$GT_P, [int]$w=$GW_P, [int]$h=$GH_P)
    $py="import mss,mss.tools,sys`nr={'top':$t,'left':$l,'width':$w,'height':$h}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_ts.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "  SHOT: $n"
}

Write-Host "=== QA Sprint 3-mini Evidence Collection ==="

# Test navigate
Write-Host "[1] Navigate to levels"
TypeCmd "wx.__navigate('levels')"
Shot "FINAL-01-levels.png"
Shot "FINAL-01-console.png" 305 1000 535 200

Write-Host "[2] Navigate to menu"
TypeCmd "wx.__navigate('menu')"
Shot "FINAL-02-menu.png"
Shot "FINAL-02-console.png" 305 1000 535 200

Write-Host "[3] Navigate to game + clear hint"
TypeCmd "wx.removeStorageSync('__hintSeen')"
TypeCmd "wx.__navigate('game')"
Shot "FINAL-03-game.png"
FocusDT; Start-Sleep -Milliseconds 800
Shot "FINAL-04-hint.png"
Write-Host "  Wait 4s for hint fade..."
Start-Sleep -Milliseconds 4000
FocusDT
Shot "FINAL-05-hint-faded.png"

Write-Host "[4] Gameplay screenshots"
FocusDT
Shot "FINAL-06-gameplay.png"
Start-Sleep -Milliseconds 2000
FocusDT
Shot "FINAL-07-gameplay2.png"

Write-Host "[5] NAV regression: game->levels->menu->game"
TypeCmd "wx.__navigate('levels')"
Shot "FINAL-08-nav-levels.png"
TypeCmd "wx.__navigate('menu')"
Shot "FINAL-09-nav-menu.png"
TypeCmd "wx.__navigate('game')"
Shot "FINAL-10-nav-game.png"

Write-Host "=== Done ==="
