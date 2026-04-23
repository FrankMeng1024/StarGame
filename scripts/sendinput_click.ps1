param([int]$x = 858, [int]$y = 726, [long]$hwnd = 29425864)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class SendInputHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public MOUSEINPUT mi;
    }
    [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int n);
    const uint INPUT_MOUSE = 0;
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint MOUSEEVENTF_MOVE = 0x0001;
    const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
    public static void Click(IntPtr hwnd, int screenX, int screenY) {
        ShowWindow(hwnd, 9);
        SetForegroundWindow(hwnd);
        System.Threading.Thread.Sleep(600);
        SetCursorPos(screenX, screenY);
        System.Threading.Thread.Sleep(150);

        // Normalize coords for SendInput (0-65535 range)
        int screenW = GetSystemMetrics(0); // SM_CXSCREEN
        int screenH = GetSystemMetrics(1); // SM_CYSCREEN
        int normX = (int)((long)screenX * 65536 / screenW) + 1;
        int normY = (int)((long)screenY * 65536 / screenH) + 1;

        var down = new INPUT[1];
        down[0].type = INPUT_MOUSE;
        down[0].mi.dx = normX;
        down[0].mi.dy = normY;
        down[0].mi.dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_ABSOLUTE;
        SendInput(1, down, Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(100);

        var up = new INPUT[1];
        up[0].type = INPUT_MOUSE;
        up[0].mi.dx = normX;
        up[0].mi.dy = normY;
        up[0].mi.dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_ABSOLUTE;
        SendInput(1, up, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@

[SendInputHelper]::Click([IntPtr]::new($hwnd), $x, $y)
Write-Host "SendInput click at $x,$y"
