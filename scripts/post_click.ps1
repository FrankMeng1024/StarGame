param([long]$hwnd = 10094084, [int]$x = 1050, [int]$y = 25)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class PostClick2 {
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    const uint WM_LBUTTONDOWN = 0x0201;
    const uint WM_LBUTTONUP = 0x0202;
    public static void Click(IntPtr hwnd, int x, int y) {
        IntPtr lp = (IntPtr)((y << 16) | (x & 0xFFFF));
        SendMessage(hwnd, WM_LBUTTONDOWN, (IntPtr)1, lp);
        System.Threading.Thread.Sleep(100);
        SendMessage(hwnd, WM_LBUTTONUP, (IntPtr)0, lp);
    }
}
"@

$h = [IntPtr]::new($hwnd)
[PostClick2]::Click($h, $x, $y)
Write-Host "Clicked at $x,$y on hwnd=$hwnd"
