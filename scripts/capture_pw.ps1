param([long]$hwnd = 7409032, [string]$outPath = "C:\ClaudeCodeProjects\StarGame\docs\virtual-user\sprint7-mini-flow\flow-92-project-loaded.png")

Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
public class PW5 {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int w, int h);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public static bool Capture(IntPtr hwnd, string path) {
        RECT r; GetWindowRect(hwnd, out r);
        int w = r.Right - r.Left; int h = r.Bottom - r.Top;
        if (w <= 0) w = 1280;
        if (h <= 0) h = 800;
        IntPtr hdcWin = GetDC(hwnd);
        IntPtr hdcMem = CreateCompatibleDC(hdcWin);
        IntPtr hBmp = CreateCompatibleBitmap(hdcWin, w, h);
        IntPtr old = SelectObject(hdcMem, hBmp);
        bool ok = PrintWindow(hwnd, hdcMem, 2);
        SelectObject(hdcMem, old);
        Image img = Image.FromHbitmap(hBmp);
        img.Save(path, ImageFormat.Png);
        img.Dispose();
        DeleteObject(hBmp); DeleteDC(hdcMem); ReleaseDC(hwnd, hdcWin);
        return ok;
    }
}
"@

$dir = Split-Path $outPath
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$result = [PW5]::Capture([IntPtr]::new($hwnd), $outPath)
Write-Host "PrintWindow result: $result"
Write-Host "Saved: $outPath"
if (Test-Path $outPath) {
    $fi = Get-Item $outPath
    Write-Host "File size: $($fi.Length) bytes"
}
