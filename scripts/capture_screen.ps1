Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

param(
    [int]$hwnd = 5770672,
    [string]$outPath = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint2-mini-evidence\smoke-25.png"
)

$hWnd = [IntPtr]$hwnd
[WinAPI]::ShowWindow($hWnd, 9) | Out-Null  # SW_RESTORE
[WinAPI]::SetForegroundWindow($hWnd) | Out-Null
[WinAPI]::BringWindowToTop($hWnd) | Out-Null
Start-Sleep -Milliseconds 2000

$rect = New-Object WinAPI+RECT
[WinAPI]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
$x = $rect.Left; $y = $rect.Top
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
Write-Host "Window at ($x,$y) size ${w}x${h}"

# Use Screen.AllScreens to find correct screen
$allScreens = [System.Windows.Forms.Screen]::AllScreens
foreach ($s in $allScreens) {
    Write-Host "Screen: $($s.DeviceName) Bounds=$($s.Bounds)"
}

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x, $y, 0, 0, [System.Drawing.Size]::new($w, $h), [System.Drawing.CopyPixelOperation]::SourceCopy)
$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Saved: $outPath"
