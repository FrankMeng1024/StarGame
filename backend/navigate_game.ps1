param(
    [Parameter(Mandatory=$true)]
    [string]$screen,
    [string]$outputPath = "",
    [int]$waitMs = 2000
)

# Navigate the game to a specific screen using wx.__navigate backdoor
# Captures a screenshot after navigation

$DPI_SCALE = 1.5
$PHYS_W = 1920
$PHYS_H = 1200

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;

public class NavCapture {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc fn, IntPtr lp);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);

    public delegate bool EnumWndProc(IntPtr hwnd, IntPtr lp);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk, wScan;
        public uint dwFlags, time;
        public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public KEYBDINPUT ki;
    }
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_UNICODE = 0x0004;

    public static IntPtr FindDevTools() {
        IntPtr result = IntPtr.Zero;
        EnumWindows((hw, lp) => {
            var sb = new StringBuilder(256);
            GetClassName(hw, sb, 256);
            if (sb.ToString() == "Chrome_WidgetWin_1" && IsWindowVisible(hw)) {
                RECT r; if (GetWindowRect(hw, out r)) {
                    if (r.R - r.L >= 900) { result = hw; return false; }
                }
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }

    public static void PressKey(ushort vk) {
        var a = new INPUT[2];
        a[0].type = 1; a[0].ki.wVk = vk;
        a[1].type = 1; a[1].ki.wVk = vk; a[1].ki.dwFlags = KEYEVENTF_KEYUP;
        SendInput(2, a, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(50);
    }

    public static void TypeText(string text) {
        foreach (char c in text) {
            var a = new INPUT[2];
            a[0].type = 1; a[0].ki.wScan = (ushort)c; a[0].ki.dwFlags = KEYEVENTF_UNICODE;
            a[1].type = 1; a[1].ki.wScan = (ushort)c; a[1].ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            SendInput(2, a, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
            System.Threading.Thread.Sleep(30);
        }
    }

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
}
"@ -ReferencedAssemblies "System.Drawing"

$hwnd = [NavCapture]::FindDevTools()
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "ERROR: DevTools not found"; exit 1 }
Write-Host "DevTools HWND: 0x$($hwnd.ToInt64().ToString('X'))"

[NavCapture]::ShowWindow($hwnd, 9) | Out-Null
[NavCapture]::BringWindowToTop($hwnd) | Out-Null
[NavCapture]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 1000

# Open DevTools debug console using Ctrl+Shift+I or look for the console input
# WeChat DevTools uses Ctrl+Shift+I to open debug panel
# Try VK codes: Ctrl=0x11, Shift=0x10, I=0x49

$inputs = New-Object 'NavCapture+INPUT[]' 6
# Ctrl down
$inputs[0].type = 1; $inputs[0].ki.wVk = 0x11
# Shift down
$inputs[1].type = 1; $inputs[1].ki.wVk = 0x10
# I down
$inputs[2].type = 1; $inputs[2].ki.wVk = 0x49
# I up
$inputs[3].type = 1; $inputs[3].ki.wVk = 0x49; $inputs[3].ki.dwFlags = 0x0002
# Shift up
$inputs[4].type = 1; $inputs[4].ki.wVk = 0x10; $inputs[4].ki.dwFlags = 0x0002
# Ctrl up
$inputs[5].type = 1; $inputs[5].ki.wVk = 0x11; $inputs[5].ki.dwFlags = 0x0002

[NavCapture]::SendInput(6, $inputs, [System.Runtime.InteropServices.Marshal]::SizeOf([NavCapture+INPUT])) | Out-Null
Start-Sleep -Milliseconds 1500

Write-Host "Sent Ctrl+Shift+I"

if ($outputPath) {
    [NavCapture]::CaptureScreen(0, 0, 1280, 800, $outputPath)
    Write-Host "Saved: $outputPath"
}
