# capture_qa.ps1 — PrintWindow screenshot of WeChat DevTools simulator
# Usage: powershell -ExecutionPolicy Bypass -File capture_qa.ps1 -outputPath "path\to\shot.png"
# Captures Chrome_RenderWidgetHostHWND (the simulator canvas) using PrintWindow API

param(
    [Parameter(Mandatory=$true)]
    [string]$outputPath
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class PrintWindowCapture {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint nFlags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hwnd);

    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public static List<IntPtr> FindWindowsByClass(IntPtr parent, string className) {
        var results = new List<IntPtr>();
        EnumChildWindows(parent, (hwnd, lp) => {
            var sb = new System.Text.StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            if (sb.ToString() == className) results.Add(hwnd);
            return true;
        }, IntPtr.Zero);
        return results;
    }

    public static bool Capture(IntPtr hwnd, string path) {
        RECT r;
        if (!GetWindowRect(hwnd, out r)) return false;
        int w = r.Right - r.Left;
        int h = r.Bottom - r.Top;
        if (w <= 0 || h <= 0) return false;
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp)) {
            IntPtr hdc = g.GetHdc();
            bool ok = PrintWindow(hwnd, hdc, 2); // PW_RENDERFULLCONTENT
            g.ReleaseHdc(hdc);
            if (!ok) return false;
            bmp.Save(path, ImageFormat.Png);
            return true;
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing"

# Find all Chrome_RenderWidgetHostHWND windows across all processes
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Text;

public class WinEnum {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumWndProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    public delegate bool EnumWndProc(IntPtr hwnd, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }

    public static List<IntPtr> FindAll(string className) {
        var list = new List<IntPtr>();
        EnumWindows((hw, lp) => {
            EnumChildWindows(hw, (ch, lp2) => {
                var sb = new StringBuilder(256);
                GetClassName(ch, sb, 256);
                if (sb.ToString() == className) {
                    RECT rect;
                    if (GetWindowRect(ch, out rect)) {
                        int w = rect.R - rect.L;
                        int h = rect.B - rect.T;
                        if (w > 100 && h > 100) list.Add(ch);
                    }
                }
                return true;
            }, IntPtr.Zero);
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$handles = [WinEnum]::FindAll("Chrome_RenderWidgetHostHWND")

if ($handles.Count -eq 0) {
    Write-Host "ERROR: No Chrome_RenderWidgetHostHWND found. Is WeChat DevTools running with a project open?"
    exit 1
}

# Use the last handle (usually the simulator viewport, not the DevTools UI)
$hwnd = $handles[$handles.Count - 1]
Write-Host "Found $($handles.Count) Chrome_RenderWidgetHostHWND handles. Using last: 0x$($hwnd.ToInt64().ToString('X'))"

# Ensure output directory exists
$dir = [System.IO.Path]::GetDirectoryName($outputPath)
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

$ok = [PrintWindowCapture]::Capture($hwnd, $outputPath)
if ($ok) {
    Write-Host "Screenshot saved: $outputPath"
    exit 0
} else {
    Write-Host "ERROR: PrintWindow failed for handle 0x$($hwnd.ToInt64().ToString('X'))"
    exit 1
}
