param([long]$hwnd = 10094084)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusHelper2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    public static void Focus(IntPtr hwnd) {
        ShowWindow(hwnd, 9); // SW_RESTORE
        BringWindowToTop(hwnd);
        SetForegroundWindow(hwnd);
        uint pid = 0;
        uint threadId = GetWindowThreadProcessId(hwnd, out pid);
        uint myThread = GetCurrentThreadId();
        AttachThreadInput(myThread, threadId, true);
        SetFocus(hwnd);
        AttachThreadInput(myThread, threadId, false);
    }
}
"@

$h = [IntPtr]::new($hwnd)
[FocusHelper2]::Focus($h)
Start-Sleep -Milliseconds 500
# Ctrl+R to refresh/recompile
[System.Windows.Forms.SendKeys]::SendWait("^r")
Write-Host "Sent Ctrl+R via SendKeys to hwnd=$hwnd"
