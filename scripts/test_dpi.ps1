Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QADpi {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, float f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT pt);
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }
}
'@
$HWND=[IntPtr]7015796
function FocusDT {
    $fg=[QADpi]::GetForegroundWindow(); $dummy=0
    $tid=[QADpi]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QADpi]::GetCurrentThreadId()
    [QADpi]::AttachThreadInput($me,$tid,$true)
    [QADpi]::BringWindowToTop($HWND); [QADpi]::ShowWindow($HWND,9); [QADpi]::SetForegroundWindow($HWND)
    [QADpi]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}
FocusDT
# Try clicking at logical (333, 742) - which should be physical (500, 1113) = console >
$lx = 333; $ly = 742
Write-Host "SetCursorPos logical ($lx, $ly)"
[QADpi]::SetCursorPos($lx, $ly)
Start-Sleep -Milliseconds 300
$pt = New-Object QADpi+POINT
[QADpi]::GetCursorPos([ref]$pt) | Out-Null
Write-Host "GetCursorPos returned logical: $($pt.X), $($pt.Y)"
