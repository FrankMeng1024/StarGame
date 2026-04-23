Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QAB {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
'@
$HWND=[IntPtr]7015796
$fg=[QAB]::GetForegroundWindow(); $dummy=0
$fgTid=[QAB]::GetWindowThreadProcessId($fg,[ref]$dummy)
$myTid=[QAB]::GetCurrentThreadId()
[QAB]::AttachThreadInput($myTid,$fgTid,$true)
[QAB]::BringWindowToTop($HWND); [QAB]::ShowWindow($HWND,9); [QAB]::SetForegroundWindow($HWND)
[QAB]::AttachThreadInput($myTid,$fgTid,$false)
Start-Sleep -Milliseconds 500
$fgAfter=[QAB]::GetForegroundWindow()
Write-Host "FG after focus: $fgAfter (want $HWND) match=$($fgAfter -eq $HWND)"
# Take screenshot immediately without any other action
$proc=Start-Process -FilePath 'C:\Program Files\Python314\pythonw.exe' -ArgumentList 'C:\ClaudeCodeProjects\StarGame\scripts\_mss_shot.py','C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\TEST-immediate.png' -WindowStyle Hidden -PassThru
$proc.WaitForExit(5000)
$fgAfterShot=[QAB]::GetForegroundWindow()
Write-Host "FG after shot: $fgAfterShot match=$($fgAfterShot -eq $HWND)"
Write-Host done
