Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QA6 {
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
$fg=[QA6]::GetForegroundWindow()
$dummy=0
$fgTid=[QA6]::GetWindowThreadProcessId($fg,[ref]$dummy)
$myTid=[QA6]::GetCurrentThreadId()
[QA6]::AttachThreadInput($myTid,$fgTid,$true)
[QA6]::BringWindowToTop($HWND)
[QA6]::ShowWindow($HWND,9)
[QA6]::SetForegroundWindow($HWND)
[QA6]::AttachThreadInput($myTid,$fgTid,$false)
Start-Sleep -Milliseconds 400
$proc=Start-Process -FilePath 'C:\Program Files\Python314\pythonw.exe' -ArgumentList "C:\ClaudeCodeProjects\StarGame\scripts\_mss_recalib.py","C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\CALIB-new.png" -WindowStyle Hidden -PassThru
$proc.WaitForExit(5000)
Write-Host "done"
