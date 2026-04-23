param([string]$OutPath, [int]$ProcId = 16228)

Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class ScreenCapV3 {
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwnd, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hwnd, out int lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    public static List<IntPtr> FindAllWindowsForPid(int pid) {
        var list = new List<IntPtr>();
        EnumWindows((hwnd, lParam) => {
            int procId;
            GetWindowThreadProcessId(hwnd, out procId);
            if (procId == pid) list.Add(hwnd);
            return true;
        }, IntPtr.Zero);
        return list;
    }

    public static List<IntPtr> FindChildByClass(IntPtr parentHwnd, string className) {
        var list = new List<IntPtr>();
        EnumChildWindows(parentHwnd, (hwnd, lParam) => {
            var sb = new System.Text.StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            if (sb.ToString() == className) list.Add(hwnd);
            return true;
        }, IntPtr.Zero);
        return list;
    }

    public static void CaptureWindow(IntPtr hwnd, string path) {
        RECT rect;
        GetWindowRect(hwnd, out rect);
        int w = rect.Right - rect.Left;
        int h = rect.Bottom - rect.Top;
        if (w <= 0 || h <= 0) throw new Exception("Zero size: w=" + w + " h=" + h);
        using (var bmp = new Bitmap(w, h)) {
            using (var g = Graphics.FromImage(bmp)) {
                IntPtr hdc = g.GetHdc();
                PrintWindow(hwnd, hdc, 2);
                g.ReleaseHdc(hdc);
            }
            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

# Find all top-level windows for the process
$windows = [ScreenCapV3]::FindAllWindowsForPid($ProcId)
Write-Host "Top-level windows for PID $ProcId`: $($windows.Count)"

$bestHwnd = [IntPtr]::Zero
$bestArea = 0

foreach ($hwnd in $windows) {
    # Try to find Chrome_RenderWidgetHostHWND as child
    $renders = [ScreenCapV3]::FindChildByClass($hwnd, "Chrome_RenderWidgetHostHWND")
    Write-Host "  HWND $hwnd -> $($renders.Count) Chrome_RenderWidgetHostHWND children"
    foreach ($rh in $renders) {
        $sb = New-Object System.Text.StringBuilder 256
        Add-Type -AssemblyName System.Drawing
        $rect = New-Object object
        # Just enumerate and capture all render widgets
        Write-Host "    Render HWND: $rh"
    }

    # Also check rect size of each top-level window
    $rectBytes = [System.Runtime.InteropServices.Marshal]::AllocHGlobal(16)
    # Use the struct approach
}

# Simpler: collect all Chrome_RenderWidgetHostHWND from all top-level windows, pick largest
$allRenders = @()
foreach ($hwnd in $windows) {
    $renders = [ScreenCapV3]::FindChildByClass($hwnd, "Chrome_RenderWidgetHostHWND")
    foreach ($rh in $renders) { $allRenders += $rh }
}

Write-Host "Total Chrome_RenderWidgetHostHWND found: $($allRenders.Count)"

if ($allRenders.Count -eq 0) {
    # Fallback: capture each top-level window, pick largest visible
    Write-Host "Falling back to top-level windows"
    foreach ($hwnd in $windows) {
        $outFile = $OutPath -replace '\.png$', "-hwnd$hwnd.png"
        try {
            [ScreenCapV3]::CaptureWindow($hwnd, $outFile)
            Write-Host "  Captured $hwnd -> $outFile"
        } catch {
            Write-Host "  Failed $hwnd`: $_"
        }
    }
} else {
    # Capture all render widgets
    $i = 1
    foreach ($rh in $allRenders) {
        $outFile = $OutPath -replace '\.png$', "-render$i.png"
        try {
            [ScreenCapV3]::CaptureWindow($rh, $outFile)
            Write-Host "Captured render$i -> $outFile"
        } catch {
            Write-Host "Failed render$i $rh`: $_"
        }
        $i++
    }
}
