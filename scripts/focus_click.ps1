param([long]$hwnd = 29425864, [int]$clientX = 288, [int]$clientY = 458)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseHelper3 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, IntPtr dwExtraInfo);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public static void ClickInWindow(IntPtr hwnd, int clientX, int clientY) {
        RECT r; GetWindowRect(hwnd, out r);
        int screenX = r.Left + clientX;
        int screenY = r.Top + clientY;
        ShowWindow(hwnd, 9); // SW_RESTORE
        SetForegroundWindow(hwnd);
        System.Threading.Thread.Sleep(500);
        SetCursorPos(screenX, screenY);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, screenX, screenY, 0, IntPtr.Zero);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTUP, screenX, screenY, 0, IntPtr.Zero);
        System.Console.WriteLine("Clicked at screen " + screenX + "," + screenY + " (client " + clientX + "," + clientY + ")");
    }
}
"@

$h = [IntPtr]::new($hwnd)
[MouseHelper3]::ClickInWindow($h, $clientX, $clientY)
