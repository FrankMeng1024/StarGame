param([int]$ProcId = 16228)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinUtils {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hwnd, out int lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hwnd, System.Text.StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    const int SW_RESTORE = 9;
    const int SW_SHOW = 5;
    const int SW_MAXIMIZE = 3;

    public static void BringToFront(IntPtr hwnd) {
        ShowWindow(hwnd, SW_RESTORE);
        SetForegroundWindow(hwnd);
    }
}
"@

$windows = @()
$callback = [WinUtils+EnumWindowsProc]{
    param($hwnd, $lParam)
    $procId = 0
    [WinUtils]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    if ($procId -eq $ProcId) {
        $sb = New-Object System.Text.StringBuilder 256
        [WinUtils]::GetWindowText($hwnd, $sb, 256) | Out-Null
        $rect = New-Object WinUtils+RECT
        [WinUtils]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        $w = $rect.Right - $rect.Left
        $h = $rect.Bottom - $rect.Top
        $visible = [WinUtils]::IsWindowVisible($hwnd)
        Write-Host "  HWND $hwnd title='$($sb.ToString())' size=${w}x${h} visible=$visible"
        if ($w -gt 200 -and $h -gt 200) {
            [WinUtils]::BringToFront($hwnd)
        }
    }
    return $true
}
[WinUtils]::EnumWindows($callback, [IntPtr]::Zero)
