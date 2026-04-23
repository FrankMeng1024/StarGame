param(
    [string]$outputPath = "capture.png",
    [int]$captureX = 820,
    [int]$captureY = 130,
    [int]$captureW = 460,
    [int]$captureH = 420,
    [int]$waitMs = 8000
)

$DPI = 1.5
$PHYS_W = 1920
$PHYS_H = 1200

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class KeySend {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc fn, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public delegate bool EnumWndProc(IntPtr h, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public KEYBDINPUT ki; }

    public static IntPtr FindDevTools() {
        IntPtr result = IntPtr.Zero;
        EnumWindows((h, lp) => {
            if (!IsWindowVisible(h)) return true;
            var cls = new System.Text.StringBuilder(256);
            GetClassName(h, cls, 256);
            if (cls.ToString() == "Chrome_WidgetWin_1") {
                RECT r; GetWindowRect(h, out r);
                if (r.R - r.L >= 900) { result = h; return false; }
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }

    public static void PressKey(ushort vk) {
        keybd_event((byte)vk, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)vk, 0, 0x0002, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
    }

    public static void SendCtrlShiftR() {
        // Ctrl down
        keybd_event(0x11, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(30);
        // Shift down
        keybd_event(0x10, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(30);
        // R down
        keybd_event(0x52, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        // R up
        keybd_event(0x52, 0, 0x0002, UIntPtr.Zero);
        System.Threading.Thread.Sleep(30);
        // Shift up
        keybd_event(0x10, 0, 0x0002, UIntPtr.Zero);
        System.Threading.Thread.Sleep(30);
        // Ctrl up
        keybd_event(0x11, 0, 0x0002, UIntPtr.Zero);
    }

    public static void Capture(int x, int y, int w, int h, string path) {
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(x, y, 0, 0, new Size(w, h));
            var dir = System.IO.Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !System.IO.Directory.Exists(dir))
                System.IO.Directory.CreateDirectory(dir);
            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$hwnd = [KeySend]::FindDevTools()
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "ERROR: DevTools not found"; exit 1 }

[KeySend]::ShowWindow($hwnd, 9) | Out-Null
[KeySend]::BringWindowToTop($hwnd) | Out-Null
[KeySend]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 1500

Write-Host "Sending Ctrl+Shift+R (force reload)..."
[KeySend]::SendCtrlShiftR()

Start-Sleep -Milliseconds $waitMs

[KeySend]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

[KeySend]::Capture($captureX, $captureY, $captureW, $captureH, $outputPath)
Write-Host "Captured: $outputPath"
