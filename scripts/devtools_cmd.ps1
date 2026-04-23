param([string]$Command = "wx.__navigate('levelSelect')", [string]$OutPath = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\nav-result.png")

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win32f {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
}
'@

$hwnd = [IntPtr]7015796
[Win32f]::ShowWindow($hwnd, 9)
[Win32f]::AllowSetForegroundWindow(-1)
Start-Sleep -Milliseconds 200
[Win32f]::BringWindowToTop($hwnd)
Start-Sleep -Milliseconds 200
[Win32f]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 1000

$fg = [Win32f]::GetForegroundWindow()
Write-Host "Foreground: $fg (expected: $($hwnd.ToInt64()))"

# Click on Chrome_RenderWidgetHostHWND - the console input at physical (314, 805)
[Win32f]::SetCursorPos(314, 805)
Start-Sleep -Milliseconds 200
[Win32f]::mouse_event(2, 0, 0, 0, 0)
[Win32f]::mouse_event(4, 0, 0, 0, 0)
Start-Sleep -Milliseconds 300

# Select all
[Win32f]::keybd_event(0x11, 0, 0, 0)
[Win32f]::keybd_event(0x41, 0, 0, 0)
[Win32f]::keybd_event(0x41, 0, 2, 0)
[Win32f]::keybd_event(0x11, 0, 2, 0)
Start-Sleep -Milliseconds 100

Set-Clipboard -Value $Command
Start-Sleep -Milliseconds 200

[Win32f]::keybd_event(0x11, 0, 0, 0)
[Win32f]::keybd_event(0x56, 0, 0, 0)
[Win32f]::keybd_event(0x56, 0, 2, 0)
[Win32f]::keybd_event(0x11, 0, 2, 0)
Start-Sleep -Milliseconds 300

[Win32f]::keybd_event(0x0D, 0, 0, 0)
[Win32f]::keybd_event(0x0D, 0, 2, 0)
Start-Sleep -Milliseconds 1500

Write-Host "Done"
