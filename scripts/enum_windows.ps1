param([long]$hwnd = 10028548)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class WinEnum50 {
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc proc, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder sb, int max);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lp);
    public static List<string> results = new List<string>();
    public static bool Callback(IntPtr hwnd, IntPtr lp) {
        var sb = new System.Text.StringBuilder(256);
        GetClassName(hwnd, sb, 256);
        string cn = sb.ToString();
        if (cn.Contains("Chrome") || cn.Contains("Render") || cn.Contains("Widget")) {
            RECT r; GetWindowRect(hwnd, out r);
            int w = r.Right - r.Left; int h = r.Bottom - r.Top;
            results.Add(cn + " HWND=" + hwnd.ToInt64() + " " + w + "x" + h + " @" + r.Left + "," + r.Top + " vis=" + IsWindowVisible(hwnd));
        }
        return true;
    }
    public static void Enum(IntPtr parent) {
        results.Clear();
        EnumChildWindows(parent, Callback, IntPtr.Zero);
    }
}
"@
[WinEnum50]::Enum([IntPtr]::new($hwnd))
Write-Host "Results count: $([WinEnum50]::results.Count)"
foreach ($r in [WinEnum50]::results) { Write-Host $r }
