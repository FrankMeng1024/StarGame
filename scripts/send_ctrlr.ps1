param([long]$hwnd = 10094084)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeySender2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    const uint WM_KEYDOWN = 0x100;
    const uint WM_KEYUP = 0x101;
    const uint WM_SYSKEYDOWN = 0x0104;
    // Virtual key codes
    const int VK_CONTROL = 0x11;
    const int VK_R = 0x52;
    public static void SendCtrlR(IntPtr hwnd) {
        ShowWindow(hwnd, 9); // SW_RESTORE
        SetForegroundWindow(hwnd);
        System.Threading.Thread.Sleep(300);
        // Ctrl+R
        PostMessage(hwnd, WM_KEYDOWN, (IntPtr)VK_CONTROL, IntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        PostMessage(hwnd, WM_KEYDOWN, (IntPtr)VK_R, IntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        PostMessage(hwnd, WM_KEYUP, (IntPtr)VK_R, IntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        PostMessage(hwnd, WM_KEYUP, (IntPtr)VK_CONTROL, IntPtr.Zero);
    }
}
"@

$h = [IntPtr]::new($hwnd)
[KeySender2]::SendCtrlR($h)
Write-Host "Sent Ctrl+R to hwnd=$hwnd"
