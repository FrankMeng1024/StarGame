Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QAConsole2 {
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
    $fg=[QAConsole2]::GetForegroundWindow(); $dummy=0
    $tid=[QAConsole2]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAConsole2]::GetCurrentThreadId()
    [QAConsole2]::AttachThreadInput($me,$tid,$true)
    [QAConsole2]::BringWindowToTop($HWND); [QAConsole2]::ShowWindow($HWND,9); [QAConsole2]::SetForegroundWindow($HWND)
    [QAConsole2]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function ShotGame { param([string]$n)
    $py = "import mss,mss.tools,sys`nr={'top':140,'left':1340,'width':410,'height':880}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f = "$OUTDIR\_tmp.py"; $py | Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "Shot: $n"
}

function ShotConsole { param([string]$n)
    $py = "import mss,mss.tools,sys`nr={'top':1060,'left':305,'width':535,'height':140}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f = "$OUTDIR\_tmp2.py"; $py | Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "ConShot: $n"
}

FocusDT
Write-Host "Sending wx.__navigate('levels') to console at (500, 1113)..."
Set-Clipboard -Value "wx.__navigate('levels')"
Start-Sleep -Milliseconds 150
# Console > is at physical (445-500, 1113)
[QAConsole2]::SetCursorPos(500, 1113); Start-Sleep -Milliseconds 200
[QAConsole2]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QAConsole2]::mouse_event(4,0,0,0,0)
Start-Sleep -Milliseconds 400
# Ctrl+A Ctrl+V Enter
[QAConsole2]::keybd_event(0x11,0,0,0); [QAConsole2]::keybd_event(0x41,0,0,0); Start-Sleep -Milliseconds 80
[QAConsole2]::keybd_event(0x41,0,2,0); [QAConsole2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 80
[QAConsole2]::keybd_event(0x11,0,0,0); [QAConsole2]::keybd_event(0x56,0,0,0); Start-Sleep -Milliseconds 80
[QAConsole2]::keybd_event(0x56,0,2,0); [QAConsole2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 300
[QAConsole2]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QAConsole2]::keybd_event(0x0D,0,2,0)
Start-Sleep -Milliseconds 2000

FocusDT
ShotConsole "CONSOLE-test-nav.png"
ShotGame "GAME-test-nav.png"
