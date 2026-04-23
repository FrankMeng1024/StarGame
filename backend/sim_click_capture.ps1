param(
    [int]$clickX,
    [int]$clickY,
    [string]$outputPath = "capture.png",
    [int]$captureX = 100,
    [int]$captureY = 0,
    [int]$captureW = 1280,
    [int]$captureH = 800,
    [int]$waitMs = 3000
)

# DPI: logical coords are 1280x800 logical, physical 1920x1200
$DPI = 1.5
$PHYS_W = 1920
$PHYS_H = 1200

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class SimClick {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc fn, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    public delegate bool EnumWndProc(IntPtr h, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public MOUSEINPUT mi; }

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

    public static void ClickPhys(int physX, int physY, int physW, int physH) {
        int ax = (physX * 65535) / physW;
        int ay = (physY * 65535) / physH;
        var inputs = new INPUT[3];
        inputs[0].type = 0; inputs[0].mi.dx = ax; inputs[0].mi.dy = ay; inputs[0].mi.dwFlags = 0x0001 | 0x8000;
        inputs[1].type = 0; inputs[1].mi.dx = ax; inputs[1].mi.dy = ay; inputs[1].mi.dwFlags = 0x0002 | 0x8000;
        inputs[2].type = 0; inputs[2].mi.dx = ax; inputs[2].mi.dy = ay; inputs[2].mi.dwFlags = 0x0004 | 0x8000;
        SendInput(3, inputs, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
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

$hwnd = [SimClick]::FindDevTools()
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "ERROR: DevTools not found"; exit 1 }

[SimClick]::ShowWindow($hwnd, 9) | Out-Null
[SimClick]::BringWindowToTop($hwnd) | Out-Null
[SimClick]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 1000

# Click the simulator area
$physX = [int]($clickX * $DPI)
$physY = [int]($clickY * $DPI)
Write-Host "Clicking logical ($clickX,$clickY) -> physical ($physX,$physY)"
[SimClick]::ClickPhys($physX, $physY, $PHYS_W, $PHYS_H)

Start-Sleep -Milliseconds $waitMs

# Re-focus DevTools
[SimClick]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

[SimClick]::Capture($captureX, $captureY, $captureW, $captureH, $outputPath)
Write-Host "Captured: $outputPath"
