param([int]$ProcId = 16228)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinRestore {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public static void Restore(IntPtr hwnd) {
        if (IsIconic(hwnd)) {
            ShowWindow(hwnd, 9); // SW_RESTORE
        } else {
            ShowWindow(hwnd, 5); // SW_SHOW
        }
        SetForegroundWindow(hwnd);
    }
}
"@

$proc = Get-Process -Id $ProcId -ErrorAction Stop

# Try HWND 5245916 which is the main DevTools window
$hwnd = [IntPtr]5245916
[WinRestore]::Restore($hwnd)
Write-Host "Restored HWND 5245916"

Start-Sleep -Milliseconds 1500
