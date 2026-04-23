# Screenshot using System.Drawing.Graphics.CopyFromScreen (no Imaging namespace needed)
# Saves as PNG using Bitmap.Save with explicit format

Add-Type -AssemblyName System.Drawing

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
public class QAAPI4 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);

    public static void Screenshot(int x, int y, int w, int h, string path) {
        var bmp = new Bitmap(w, h);
        using (var g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(x, y, 0, 0, new Size(w, h));
        }
        bmp.Save(path, ImageFormat.Png);
        bmp.Dispose();
    }
}
'@

$HWND = [IntPtr]7015796
$OUTDIR = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"

# Game region in LOGICAL coords (mss uses physical, but CopyFromScreen uses logical)
# Physical: left=1255, top=85, width=660, height=820
# Logical (divide by 1.5): left=837, top=57, width=440, height=547
# But wait - CopyFromScreen uses physical pixels on high-DPI systems when SetProcessDPIAware
# Need to check if DPI aware. Try logical first.
$G_L = 837; $G_T = 57; $G_W = 440; $G_H = 547

function Take-Shot-DT {
    param([string]$filename, [int]$x=$G_L, [int]$y=$G_T, [int]$w=$G_W, [int]$h=$G_H)
    $path = Join-Path $OUTDIR $filename
    [QAAPI4]::Screenshot($x, $y, $w, $h, $path)
    Write-Host "Shot: $filename"
}

function Focus-DT {
    $fg = [QAAPI4]::GetForegroundWindow()
    $dummy = 0
    $fgTid = [QAAPI4]::GetWindowThreadProcessId($fg, [ref]$dummy)
    $myTid = [QAAPI4]::GetCurrentThreadId()
    [QAAPI4]::AttachThreadInput($myTid, $fgTid, $true)
    [QAAPI4]::BringWindowToTop($HWND)
    [QAAPI4]::ShowWindow($HWND, 9)
    [QAAPI4]::SetForegroundWindow($HWND) | Out-Null
    [QAAPI4]::AttachThreadInput($myTid, $fgTid, $false)
    Start-Sleep -Milliseconds 600
}

function Take-Full {
    param([string]$filename)
    $path = Join-Path $OUTDIR $filename
    [QAAPI4]::Screenshot(0, 0, 1920, 1200, $path)
    Write-Host "Full shot: $filename"
}

Write-Host "=== DPI Calibration ==="
Focus-DT
Start-Sleep -Milliseconds 200
# Capture full screen using CopyFromScreen
Take-Full "CALIB-full-CFS.png"
# Capture game region using logical coords
Take-Shot-DT "CALIB-game-logical.png"
Write-Host "Done - check screenshots to calibrate"
