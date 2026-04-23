# capture_intro_phase.ps1 — capture intro at frozen phase
# Usage: powershell -File capture_intro_phase.ps1 -phase 1 -outputPath "C:\path\to\shot.png"
param(
    [int]$phase = 1,
    [string]$outputPath = "C:\tmp\intro_phase.png"
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool repaint);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
"@

$cliPath = "C:\tools\微信web开发者工具\cli.bat"
$projPath = "C:\ClaudeCodeProjects\StarGame\miniprogram"

Write-Host "Phase: $phase, Output: $outputPath"

# Close DevTools first
Write-Host "Closing DevTools..."
& cmd /c "`"$cliPath`" close --project `"$projPath`"" 2>$null
Start-Sleep -Milliseconds 2000

# Open DevTools
Write-Host "Opening DevTools..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"`"$cliPath`" open --project `"$projPath`"`"" -PassThru -WindowStyle Hidden
Start-Sleep -Milliseconds 4000

# Find DevTools HWND
Write-Host "Finding DevTools window..."
$maxWait = 20
$hwnd = [IntPtr]::Zero
for ($i = 0; $i -lt $maxWait; $i++) {
    $processes = Get-Process -Name "wechatdevtools" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
    if ($processes) {
        $hwnd = $processes[0].MainWindowHandle
        Write-Host "Got HWND: $hwnd"
        break
    }
    Start-Sleep -Milliseconds 500
}

if ($hwnd -eq [IntPtr]::Zero) {
    Write-Host "ERROR: Could not find DevTools window"
    exit 1
}

# Show window and shift it
[Win32]::ShowWindow($hwnd, 9) | Out-Null  # SW_RESTORE
Start-Sleep -Milliseconds 500
[Win32]::MoveWindow($hwnd, -700, 0, 1280, 800, $true) | Out-Null
Start-Sleep -Milliseconds 500
[Win32]::SetForegroundWindow($hwnd) | Out-Null

# Wait for auto-compile to complete (need a bit of time)
Write-Host "Waiting for compile + animation frame..."
Start-Sleep -Milliseconds 3000

# Take screenshot using CopyFromScreen
# With window at x=-700, simulator is at internal x≈930 relative to 1280px window
# So screen x = -700 + 930 = 230. Game canvas is 667px wide.
# Capture from screen x=230, y=30 (below title bar), width=667, height=375
$captureX = 230
$captureY = 30
$captureW = 667
$captureH = 375

# Ensure output directory exists
$dir = Split-Path $outputPath -Parent
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap($captureW, $captureH)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen($captureX, $captureY, 0, 0, [System.Drawing.Size]::new($captureW, $captureH))
$gfx.Dispose()
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Screenshot saved to: $outputPath"
Write-Host "Done."
