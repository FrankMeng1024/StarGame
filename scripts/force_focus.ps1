param([int]$Px = 1615, [int]$Py = 710, [string]$Cmd = "")

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class FocusHelper {
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
    [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);

    public static bool ForceForeground(IntPtr hwnd) {
        IntPtr fg = GetForegroundWindow();
        uint fgThread = GetWindowThreadProcessId(fg, out _);
        uint myThread = GetCurrentThreadId();
        
        AttachThreadInput(myThread, fgThread, true);
        BringWindowToTop(hwnd);
        ShowWindow(hwnd, 9);
        SetForegroundWindow(hwnd);
        AttachThreadInput(myThread, fgThread, false);
        
        return GetForegroundWindow() == hwnd;
    }
    
    public static void Click(int px, int py) {
        SetCursorPos(px, py);
        Thread.Sleep(100);
        mouse_event(0x0002, 0, 0, 0, 0);
        Thread.Sleep(50);
        mouse_event(0x0004, 0, 0, 0, 0);
    }
    
    public static void TypeCmd(string cmd) {
        // Ctrl+A (select all), then paste
        keybd_event(0x11, 0, 0, 0); // Ctrl
        keybd_event(0x41, 0, 0, 0); // A
        Thread.Sleep(50);
        keybd_event(0x41, 0, 2, 0);
        keybd_event(0x11, 0, 2, 0);
        Thread.Sleep(100);
        keybd_event(0x11, 0, 0, 0); // Ctrl
        keybd_event(0x56, 0, 0, 0); // V
        Thread.Sleep(50);
        keybd_event(0x56, 0, 2, 0);
        keybd_event(0x11, 0, 2, 0);
        Thread.Sleep(200);
        keybd_event(0x0D, 0, 0, 0); // Enter
        Thread.Sleep(50);
        keybd_event(0x0D, 0, 2, 0);
    }
}
'@

$hwnd = [IntPtr]7015796
$result = [FocusHelper]::ForceForeground($hwnd)
Write-Host "Focus result: $result"
Start-Sleep -Milliseconds 500

if ($Cmd -ne "") {
    # Click console input at physical (314, 805)
    [FocusHelper]::Click(314, 805)
    Start-Sleep -Milliseconds 300
    Set-Clipboard -Value $Cmd
    Start-Sleep -Milliseconds 200
    [FocusHelper]::TypeCmd($Cmd)
    Start-Sleep -Milliseconds 1500
    Write-Host "Command sent: $Cmd"
} else {
    # Just click at given position
    [FocusHelper]::Click($Px, $Py)
    Start-Sleep -Milliseconds 1000
    Write-Host "Clicked: $Px, $Py"
}
