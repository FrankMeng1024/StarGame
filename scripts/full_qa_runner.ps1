param([string]$OutDir = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence")

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
public class QARunner {
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

    public static bool FocusWindow(IntPtr hwnd) {
        IntPtr fg = GetForegroundWindow();
        uint dummy;
        uint fgTid = GetWindowThreadProcessId(fg, out dummy);
        uint myTid = GetCurrentThreadId();
        AttachThreadInput(myTid, fgTid, true);
        BringWindowToTop(hwnd);
        ShowWindow(hwnd, 9);
        bool result = SetForegroundWindow(hwnd);
        AttachThreadInput(myTid, fgTid, false);
        Thread.Sleep(600);
        return GetForegroundWindow() == hwnd;
    }
    
    public static void Click(int px, int py) {
        SetCursorPos(px, py);
        Thread.Sleep(100);
        mouse_event(0x0002, 0, 0, 0, 0);
        Thread.Sleep(50);
        mouse_event(0x0004, 0, 0, 0, 0);
        Thread.Sleep(100);
    }
    
    public static void SendConsoleCmd(string cmd) {
        // Click on console input bar
        Click(314, 805);
        Thread.Sleep(300);
        keybd_event(0x11, 0, 0, 0); // Ctrl+A
        keybd_event(0x41, 0, 0, 0);
        Thread.Sleep(50);
        keybd_event(0x41, 0, 2, 0);
        keybd_event(0x11, 0, 2, 0);
        Thread.Sleep(100);
        keybd_event(0x11, 0, 0, 0); // Ctrl+V
        keybd_event(0x56, 0, 0, 0);
        Thread.Sleep(50);
        keybd_event(0x56, 0, 2, 0);
        keybd_event(0x11, 0, 2, 0);
        Thread.Sleep(200);
        keybd_event(0x0D, 0, 0, 0); // Enter
        Thread.Sleep(50);
        keybd_event(0x0D, 0, 2, 0);
    }
    
    public static Bitmap Screenshot(int left, int top, int width, int height) {
        var bmp = new Bitmap(width, height);
        var g = Graphics.FromImage(bmp);
        g.CopyFromScreen(left, top, 0, 0, new Size(width, height));
        g.Dispose();
        return bmp;
    }
}
'@

Add-Type -AssemblyName System.Drawing

$hwnd = [IntPtr]7015796
$GAME_LEFT = 1255
$GAME_TOP = 85
$GAME_W = 660
$GAME_H = 820

function Take-Shot {
    param([string]$name)
    $path = Join-Path $OutDir "$name"
    $bmp = [QARunner]::Screenshot($GAME_LEFT, $GAME_TOP, $GAME_W, $GAME_H)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Shot: $path"
}

function Focus-DevTools {
    $ok = [QARunner]::FocusWindow($hwnd)
    Write-Host "Focus: $ok"
}

function Send-Cmd {
    param([string]$cmd)
    Set-Clipboard -Value $cmd
    Start-Sleep -Milliseconds 200
    [QARunner]::SendConsoleCmd($cmd)
    Start-Sleep -Milliseconds 1500
    Write-Host "Sent: $cmd"
}

function Click-At {
    param([int]$px, [int]$py)
    [QARunner]::Click($px, $py)
    Start-Sleep -Milliseconds 1000
    Write-Host "Clicked: $px, $py"
}

# ---- START TEST SEQUENCE ----
Write-Host "=== Sprint 3-mini QA Runner ==="

# Step 1: Focus DevTools and clear hint storage
Focus-DevTools
Send-Cmd "wx.removeStorageSync('__hintSeen')"
Take-Shot "SETUP-00-baseline.png"

# Step 2: Navigate to level select (TEST-01 - STORY-00215)
Focus-DevTools
Send-Cmd "wx.__navigate('levelSelect')"
Start-Sleep -Milliseconds 1000
Take-Shot "STORY-00215-01-level-select.png"

