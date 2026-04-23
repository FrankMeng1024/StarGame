param([int]$Px = 1615, [int]$Py = 710, [string]$OutPath = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\click-result.png")

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
public class ClickAndShot {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int w, int h);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr dst, int dx, int dy, int dw, int dh, IntPtr src, int sx, int sy, uint rop);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ReleaseDC(IntPtr hwnd, IntPtr hdc);
}
'@

$hwnd = [IntPtr]7015796
$dummy = 0
$fg = [ClickAndShot]::GetForegroundWindow()
$fgTid = [ClickAndShot]::GetWindowThreadProcessId($fg, [ref]$dummy)
$myTid = [ClickAndShot]::GetCurrentThreadId()
[ClickAndShot]::AttachThreadInput($myTid, $fgTid, $true)
[ClickAndShot]::BringWindowToTop($hwnd)
[ClickAndShot]::ShowWindow($hwnd, 9)
[ClickAndShot]::SetForegroundWindow($hwnd)
[ClickAndShot]::AttachThreadInput($myTid, $fgTid, $false)
Start-Sleep -Milliseconds 800

$nowFg = [ClickAndShot]::GetForegroundWindow()
Write-Host "Foreground: $($nowFg.ToInt64()) (want: $($hwnd.ToInt64()))"

# Click
[ClickAndShot]::SetCursorPos($Px, $Py)
Start-Sleep -Milliseconds 100
[ClickAndShot]::mouse_event(2, 0, 0, 0, 0)
[ClickAndShot]::mouse_event(4, 0, 0, 0, 0)
Start-Sleep -Milliseconds 1500

# Take screenshot using .NET System.Drawing
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(660, 820)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(1255, 85, 0, 0, [System.Drawing.Size]::new(660, 820))
$g.Dispose()
$bmp.Save($OutPath)
$bmp.Dispose()
Write-Host "Screenshot saved: $OutPath"
