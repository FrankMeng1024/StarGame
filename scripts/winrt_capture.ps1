# WinRT Windows.Graphics.Capture screenshot for GPU-rendered windows
param([int]$hwnd = 0, [string]$output = "capture.png")

Add-Type -AssemblyName System.Drawing

# Load WinRT via C# interop
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading;
using System.Threading.Tasks;

public class WinRTCapture {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    [DllImport("d3d11.dll")]
    public static extern int D3D11CreateDevice(
        IntPtr pAdapter, int DriverType, IntPtr Software, int Flags,
        IntPtr pFeatureLevels, int FeatureLevels, int SDKVersion,
        out IntPtr ppDevice, out int pFeatureLevel, out IntPtr ppImmediateContext);
}
'@ -IgnoreWarnings 2>$null

Write-Host "WinRT capture starting for hwnd $hwnd"
Write-Host "Note: WinRT capture requires .NET 5+ or specific assembly loading"

# Alternative: Use PrintWindow with PW_RENDERFULLCONTENT = 2
# This works for some GPU windows when WinRT is not easily accessible from PowerShell
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class PrintWindowCapture {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    public static bool CaptureWithPrintWindow(IntPtr hwnd, string outputPath, uint flags = 2) {
        RECT rect;
        if (!GetWindowRect(hwnd, out rect)) return false;
        int w = rect.Right - Math.Max(0, rect.Left);
        int h = rect.Bottom - Math.Max(0, rect.Top);
        if (w <= 0 || h <= 0) return false;

        IntPtr hdcWindow = GetDC(hwnd);
        IntPtr hdcMem = CreateCompatibleDC(hdcWindow);
        IntPtr hbmCapture = CreateCompatibleBitmap(hdcWindow, w, h);
        IntPtr hbmOld = SelectObject(hdcMem, hbmCapture);

        bool result = PrintWindow(hwnd, hdcMem, flags);

        Image img = Image.FromHbitmap(hbmCapture);
        img.Save(outputPath, ImageFormat.Png);
        img.Dispose();

        SelectObject(hdcMem, hbmOld);
        DeleteObject(hbmCapture);
        DeleteDC(hdcMem);
        ReleaseDC(hwnd, hdcWindow);

        return result;
    }
}
'@

$hWnd = [IntPtr]$hwnd
[PrintWindowCapture]::SetForegroundWindow($hWnd) | Out-Null
Start-Sleep -Milliseconds 500

# PW_RENDERFULLCONTENT = 2 captures GPU content on Windows 10/11
$success = [PrintWindowCapture]::CaptureWithPrintWindow($hWnd, $output, 2)
Write-Host "PrintWindow result: $success"
Write-Host "Saved to: $output"
