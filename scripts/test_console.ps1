Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QAConsole {
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

function FocusDT {
    $fg=[QAConsole]::GetForegroundWindow(); $dummy=0
    $tid=[QAConsole]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAConsole]::GetCurrentThreadId()
    [QAConsole]::AttachThreadInput($me,$tid,$true)
    [QAConsole]::BringWindowToTop($HWND); [QAConsole]::ShowWindow($HWND,9); [QAConsole]::SetForegroundWindow($HWND)
    [QAConsole]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function Shot-Region {
    param([string]$name, [int]$left, [int]$top, [int]$width, [int]$height)
    $script = "import mss,mss.tools,sys`nr={'top':$top,'left':$left,'width':$width,'height':$height}`nwith mss.mss() as sct:`n    shot=sct.grab(r)`n    mss.tools.to_png(shot.rgb,shot.size,output=sys.argv[1])"
    $pyfile = Join-Path $OUTDIR "_tmp_shot.py"
    $script | Set-Content $pyfile -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$pyfile`"","`"$(Join-Path $OUTDIR $name)`"" -WindowStyle Hidden -PassThru
    $p.WaitForExit(5000) | Out-Null
    Write-Host "Shot: $name"
}

FocusDT

# Send wx.__navigate('levels')
Set-Clipboard -Value "wx.__navigate('levels')"
Start-Sleep -Milliseconds 150
[QAConsole]::SetCursorPos(320, 968); Start-Sleep -Milliseconds 200
[QAConsole]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QAConsole]::mouse_event(4,0,0,0,0)
Start-Sleep -Milliseconds 400
[QAConsole]::keybd_event(0x11,0,0,0); [QAConsole]::keybd_event(0x41,0,0,0); Start-Sleep -Milliseconds 80
[QAConsole]::keybd_event(0x41,0,2,0); [QAConsole]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 80
[QAConsole]::keybd_event(0x11,0,0,0); [QAConsole]::keybd_event(0x56,0,0,0); Start-Sleep -Milliseconds 80
[QAConsole]::keybd_event(0x56,0,2,0); [QAConsole]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 300
[QAConsole]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QAConsole]::keybd_event(0x0D,0,2,0)
Start-Sleep -Milliseconds 2000

Write-Host "Command sent. Taking console screenshot..."
FocusDT
# Console area: y=750 to y=1050 approx, x=305-840
Shot-Region "CONSOLE-after-nav.png" 305 750 535 280
# Game area
Shot-Region "GAME-after-nav.png" 1340 140 410 880
