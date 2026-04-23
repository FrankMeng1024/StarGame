param(
    [int]$clickX = 0,
    [int]$clickY = 0,
    [Parameter(Mandatory=$true)]
    [string]$outputPath,
    [string]$action = "view",
    [int]$preCaptureSleep = 1500,
    [int]$cropX = 775,
    [int]$cropY = 90,
    [int]$cropW = 505,
    [int]$cropH = 450
)

# DPI scaling: AppliedDPI=144 = 150% scaling. Physical = Logical * 1.5
# Screen logical: 1280x800, physical: 1920x1200
$DPI_SCALE = 1.5
$PHYS_W = 1920
$PHYS_H = 1200

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Text;

public class AllInOne {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc fn, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);

    public delegate bool EnumWndProc(IntPtr hwnd, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public MOUSEINPUT mi;
    }
    const uint MOUSEEVENTF_MOVE = 0x0001;
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint MOUSEEVENTF_ABSOLUTE = 0x8000;

    // physX, physY: PHYSICAL pixel coordinates (after DPI scaling)
    // physW, physH: physical screen dimensions
    public static void ClickPhys(int physX, int physY, int physW, int physH) {
        int ax = (physX * 65535) / physW;
        int ay = (physY * 65535) / physH;
        var inputs = new INPUT[3];
        inputs[0].type = 0; inputs[0].mi.dx = ax; inputs[0].mi.dy = ay; inputs[0].mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
        inputs[1].type = 0; inputs[1].mi.dx = ax; inputs[1].mi.dy = ay; inputs[1].mi.dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_ABSOLUTE;
        inputs[2].type = 0; inputs[2].mi.dx = ax; inputs[2].mi.dy = ay; inputs[2].mi.dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_ABSOLUTE;
        SendInput(3, inputs, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
    }

    // x, y, w, h: LOGICAL pixel coordinates (what CopyFromScreen uses)
    public static void CaptureScreen(int x, int y, int w, int h, string path) {
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(x, y, 0, 0, new Size(w, h));
            var dir = System.IO.Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !System.IO.Directory.Exists(dir))
                System.IO.Directory.CreateDirectory(dir);
            bmp.Save(path, ImageFormat.Png);
        }
    }

    public static IntPtr FindDevTools() {
        IntPtr result = IntPtr.Zero;
        EnumWindows((hw, lp) => {
            var sb = new StringBuilder(256);
            GetClassName(hw, sb, 256);
            if (sb.ToString() == "Chrome_WidgetWin_1" && IsWindowVisible(hw)) {
                RECT r; if (GetWindowRect(hw, out r)) { if (r.R - r.L >= 900) { result = hw; return false; } }
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$hwnd = [AllInOne]::FindDevTools()
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "ERROR: DevTools not found"; exit 1 }
Write-Host "DevTools HWND: 0x$($hwnd.ToInt64().ToString('X'))"

[AllInOne]::ShowWindow($hwnd, 9) | Out-Null
[AllInOne]::BringWindowToTop($hwnd) | Out-Null
[AllInOne]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 1200

if ($action -eq "click") {
    # Convert logical coords to physical coords for SendInput
    $physX = [int]($clickX * $DPI_SCALE)
    $physY = [int]($clickY * $DPI_SCALE)
    Write-Host "Clicking logical ($clickX, $clickY) -> physical ($physX, $physY)"
    [AllInOne]::ClickPhys($physX, $physY, $PHYS_W, $PHYS_H)
    Start-Sleep -Milliseconds 2000
    [AllInOne]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 500
}

Start-Sleep -Milliseconds $preCaptureSleep

# CaptureScreen uses logical coordinates
[AllInOne]::CaptureScreen($cropX, $cropY, $cropW, $cropH, $outputPath)
Write-Host "Saved: $outputPath"
