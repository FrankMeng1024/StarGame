# capture_sprint21.ps1 — captures WeChat DevTools window using PrintWindow
param([string]$OutPath)

# Find WeChat DevTools process with a main window
$proc = Get-Process wechatdevtools | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
if (-not $proc) { Write-Error "No wechatdevtools window found"; exit 1 }

$hwnd = $proc.MainWindowHandle
Write-Host "Using hwnd: $hwnd"

$script = @"
[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null
Add-Type -AssemblyName System.Drawing

`$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint nFlags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
Add-Type -TypeDefinition `$sig

`$r = New-Object WinAPI+RECT
[WinAPI]::GetWindowRect([IntPtr]$hwnd, [ref]`$r)
`$w = `$r.Right - `$r.Left
`$h = `$r.Bottom - `$r.Top
Write-Host "Window size: `${w}x`${h}"

`$bmp = New-Object System.Drawing.Bitmap(`$w, `$h)
`$g = [System.Drawing.Graphics]::FromImage(`$bmp)
`$hdc = `$g.GetHdc()
[WinAPI]::PrintWindow([IntPtr]$hwnd, `$hdc, 2)
`$g.ReleaseHdc(`$hdc)
`$g.Dispose()
`$bmp.Save('$OutPath')
`$bmp.Dispose()
Write-Host "Saved to $OutPath"
"@

Invoke-Expression $script
