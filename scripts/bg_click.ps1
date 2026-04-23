# This runs in background - brings DevTools to front and clicks
param([int]$Px = 1615, [int]$Py = 710)

Start-Sleep -Milliseconds 2000

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win32h {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError=true)] 
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public int type;
        public MOUSEINPUT mi;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy, mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }
}
'@

$hwnd = [IntPtr]7015796
[Win32h]::BringWindowToTop($hwnd)
[Win32h]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 1000

# Use SendInput for more reliable clicking
$input = New-Object Win32h+INPUT
$input.type = 0  # MOUSE
$input.mi = New-Object Win32h+MOUSEINPUT
$input.mi.dx = [int]($Px * 65535 / 1920)
$input.mi.dy = [int]($Py * 65535 / 1200)  
$input.mi.dwFlags = 0x0001 -bor 0x8000  # MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE
[Win32h]::SendInput(1, @($input), [System.Runtime.InteropServices.Marshal]::SizeOf($input)) | Out-Null
Start-Sleep -Milliseconds 100

$inputDown = New-Object Win32h+INPUT
$inputDown.type = 0
$inputDown.mi = New-Object Win32h+MOUSEINPUT
$inputDown.mi.dwFlags = 0x0002  # MOUSEEVENTF_LEFTDOWN
[Win32h]::SendInput(1, @($inputDown), [System.Runtime.InteropServices.Marshal]::SizeOf($inputDown)) | Out-Null
Start-Sleep -Milliseconds 50

$inputUp = New-Object Win32h+INPUT
$inputUp.type = 0
$inputUp.mi = New-Object Win32h+MOUSEINPUT
$inputUp.mi.dwFlags = 0x0004  # MOUSEEVENTF_LEFTUP
[Win32h]::SendInput(1, @($inputUp), [System.Runtime.InteropServices.Marshal]::SizeOf($inputUp)) | Out-Null

Write-Host "Clicked at $Px, $Py"
