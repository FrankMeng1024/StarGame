Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QASwitch {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
}
'@
$HWND=[IntPtr]7015796
$PYTHONW="C:\Program Files\Python314\pythonw.exe"
$OUTDIR="C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"

function FocusDT {
    $fg=[QASwitch]::GetForegroundWindow(); $dummy=0
    $tid=[QASwitch]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QASwitch]::GetCurrentThreadId()
    [QASwitch]::AttachThreadInput($me,$tid,$true)
    [QASwitch]::BringWindowToTop($HWND); [QASwitch]::ShowWindow($HWND,9); [QASwitch]::SetForegroundWindow($HWND)
    [QASwitch]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}
function Shot { param([string]$n, [int]$l=305, [int]$t=680, [int]$w=535, [int]$h=400)
    $py="import mss,mss.tools,sys`nr={'top':$t,'left':$l,'width':$w,'height':$h}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_ts.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "SHOT: $n"
}

FocusDT
# Click the 'top' dropdown at logical (262, 545) - physical (393, 818)
Write-Host "Clicking top dropdown at logical (262, 545)..."
[QASwitch]::SetCursorPos(262, 545); Start-Sleep -Milliseconds 200
[QASwitch]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QASwitch]::mouse_event(4,0,0,0,0)
Start-Sleep -Milliseconds 800
Shot "CTX-dropdown-open.png" 200 650 640 400
