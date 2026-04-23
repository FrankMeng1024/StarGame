Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class QA7 {
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
$fg=[QA7]::GetForegroundWindow()
$dummy=0
$fgTid=[QA7]::GetWindowThreadProcessId($fg,[ref]$dummy)
$myTid=[QA7]::GetCurrentThreadId()
[QA7]::AttachThreadInput($myTid,$fgTid,$true)
[QA7]::BringWindowToTop($HWND)
[QA7]::ShowWindow($HWND,9)
[QA7]::SetForegroundWindow($HWND)
[QA7]::AttachThreadInput($myTid,$fgTid,$false)
Start-Sleep -Milliseconds 400
$proc=Start-Process -FilePath 'C:\Program Files\Python314\pythonw.exe' -ArgumentList "C:\ClaudeCodeProjects\StarGame\scripts\_mss_multi.py","C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\placeholder.png" -WindowStyle Hidden -PassThru
$proc.WaitForExit(8000)
Write-Host "done"
