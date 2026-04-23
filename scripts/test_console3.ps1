Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QATest2 {
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

function FocusDT {
    $fg=[QATest2]::GetForegroundWindow(); $dummy=0
    $tid=[QATest2]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QATest2]::GetCurrentThreadId()
    [QATest2]::AttachThreadInput($me,$tid,$true)
    [QATest2]::BringWindowToTop($HWND); [QATest2]::ShowWindow($HWND,9); [QATest2]::SetForegroundWindow($HWND)
    [QATest2]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function ShotConsole { param([string]$n)
    $py="import mss,mss.tools,sys`nr={'top':1000,'left':305,'width':535,'height':200}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_tc.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "ConShot: $n"
}

FocusDT

# Test 1: simple numeric expression to verify input works
Set-Clipboard -Value "1+1"
[QATest2]::SetCursorPos($CON_X, $CON_Y); Start-Sleep -Milliseconds 200
[QATest2]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QATest2]::mouse_event(4,0,0,0,0)
Start-Sleep -Milliseconds 400
[QATest2]::keybd_event(0x11,0,0,0); [QATest2]::keybd_event(0x41,0,0,0); Start-Sleep -Milliseconds 80
[QATest2]::keybd_event(0x41,0,2,0); [QATest2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 80
[QATest2]::keybd_event(0x11,0,0,0); [QATest2]::keybd_event(0x56,0,0,0); Start-Sleep -Milliseconds 80
[QATest2]::keybd_event(0x56,0,2,0); [QATest2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 300
[QATest2]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QATest2]::keybd_event(0x0D,0,2,0)
Start-Sleep -Milliseconds 1500

FocusDT
ShotConsole "CONSOLE-test-1plus1.png"
Write-Host "Done - check if '2' appears in console"
