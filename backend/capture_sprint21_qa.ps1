# capture_sprint21_qa.ps1 — open DevTools, capture menu screen and navigate for QA
param(
    [string]$EvDir = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint21-mini-evidence"
)

Add-Type -AssemblyName System.Drawing

$cliPath  = "C:\tools\微信web开发者工具\cli.bat"
$projPath = "C:\ClaudeCodeProjects\StarGame\miniprogram"

# Ensure evidence dir
if (-not (Test-Path $EvDir)) { New-Item -ItemType Directory -Force -Path $EvDir | Out-Null }

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32 {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool r);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
"@

function CaptureScreen([string]$path, [int]$sx, [int]$sy, [int]$sw, [int]$sh) {
    $bmp = New-Object System.Drawing.Bitmap($sw, $sh)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($sx, $sy, 0, 0, [System.Drawing.Size]::new($sw, $sh))
    $gfx.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved: $path"
}

# Reopen project to force recompile
Write-Host "Opening project in DevTools..."
& cmd /c "`"$cliPath`" open --project `"$projPath`"" 2>$null
Start-Sleep -Milliseconds 5000

# Find the DevTools window with a main hwnd
$hwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 30; $i++) {
    $procs = Get-Process -Name "wechatdevtools" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
    if ($procs) {
        $hwnd = $procs[0].MainWindowHandle
        Write-Host "Found hwnd: $hwnd (pid $($procs[0].Id))"
        break
    }
    Start-Sleep -Milliseconds 500
}
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "ERROR: No DevTools window"; exit 1 }

# Move window to upper-left, size 1280x800
[W32]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 800
[W32]::MoveWindow($hwnd, 0, 0, 1280, 800, $true) | Out-Null
Start-Sleep -Milliseconds 800
[W32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 2000

# Capture menu (full DevTools for reference)
CaptureScreen (Join-Path $EvDir "STORY-00270-01-devtools-full.png") 0 0 1280 800

# Simulator is roughly at x=930 within the 1280px window (right portion)
# Capture simulator panel: x=930, y=30, w=350, h=740
CaptureScreen (Join-Path $EvDir "STORY-00270-02-simulator.png") 930 30 350 740

Write-Host "Done. Check evidence directory: $EvDir"
