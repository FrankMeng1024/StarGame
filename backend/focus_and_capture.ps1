param(
    [int]$x = 100, [int]$y = 0, [int]$w = 1080, [int]$h = 800,
    [string]$outputPath = "capture.png"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class FocusCap {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc fn, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder sb, int n);
    public delegate bool EnumWndProc(IntPtr h, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

    public static void Capture(int x, int y, int w, int h, string path) {
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(x, y, 0, 0, new Size(w, h));
            var dir = System.IO.Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !System.IO.Directory.Exists(dir))
                System.IO.Directory.CreateDirectory(dir);
            bmp.Save(path, ImageFormat.Png);
        }
    }

    public static IntPtr FindDevTools() {
        IntPtr result = IntPtr.Zero;
        EnumWindows((h, lp) => {
            if (!IsWindowVisible(h)) return true;
            var cls = new System.Text.StringBuilder(256);
            GetClassName(h, cls, 256);
            if (cls.ToString() == "Chrome_WidgetWin_1") {
                RECT r; GetWindowRect(h, out r);
                if (r.R - r.L >= 900) { result = h; return false; }
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$hwnd = [FocusCap]::FindDevTools()
if ($hwnd -ne [IntPtr]::Zero) {
    [FocusCap]::ShowWindow($hwnd, 9) | Out-Null
    [FocusCap]::BringWindowToTop($hwnd) | Out-Null
    [FocusCap]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 800
    Write-Host "Focused HWND: 0x$($hwnd.ToInt64().ToString('X'))"
}

[FocusCap]::Capture($x, $y, $w, $h, $outputPath)
Write-Host "Captured: $outputPath"
