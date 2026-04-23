param(
    [long]$mainHwnd = 10094084,
    [string]$outPath = "C:\ClaudeCodeProjects\StarGame\docs\virtual-user\sprint7-mini-flow\flow-95-enumall.png"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class WinEnum60 {
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc proc, IntPtr lp);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder sb, int max);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lp);
    public static List<string> results = new List<string>();
    static uint targetPid = 0;
    public static bool TopCallback(IntPtr hwnd, IntPtr lp) {
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == targetPid && IsWindowVisible(hwnd)) {
            var sb = new System.Text.StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            RECT r; GetWindowRect(hwnd, out r);
            int w = r.Right - r.Left; int h = r.Bottom - r.Top;
            results.Add("TOP " + sb.ToString() + " HWND=" + hwnd.ToInt64() + " " + w + "x" + h + " @" + r.Left + "," + r.Top);
            // Also enum children
            EnumChildWindows(hwnd, ChildCallback, IntPtr.Zero);
        }
        return true;
    }
    public static bool ChildCallback(IntPtr hwnd, IntPtr lp) {
        var sb = new System.Text.StringBuilder(256);
        GetClassName(hwnd, sb, 256);
        string cn = sb.ToString();
        RECT r; GetWindowRect(hwnd, out r);
        int w = r.Right - r.Left; int h = r.Bottom - r.Top;
        if (IsWindowVisible(hwnd) && w > 50 && h > 50)
            results.Add("  CHILD " + cn + " HWND=" + hwnd.ToInt64() + " " + w + "x" + h + " @" + r.Left + "," + r.Top);
        return true;
    }
    public static void EnumAll(uint pid) {
        results.Clear();
        targetPid = pid;
        EnumWindows(TopCallback, IntPtr.Zero);
    }
}
"@

# Get PIDs with visible windows
$procs = Get-Process wechatdevtools -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($p in $procs) {
    Write-Host "=== PID $($p.Id) title: $($p.MainWindowTitle) ==="
    [WinEnum60]::EnumAll([UInt32]$p.Id)
    foreach ($r in [WinEnum60]::results) { Write-Host $r }
}
