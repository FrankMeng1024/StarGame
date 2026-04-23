# WinRT Windows.Graphics.Capture for GPU-rendered windows
# Requires Windows 10 1803+
param([int]$hwnd = 0, [string]$output = "capture.png")

Add-Type -AssemblyName System.Drawing

# Load WinRT types
$GraphicsCaptureItem = [Windows.Graphics.Capture.GraphicsCaptureItem, Windows.Graphics.Capture, ContentType=WindowsRuntime]
$Direct3D11CaptureFramePool = [Windows.Graphics.Capture.Direct3D11CaptureFramePool, Windows.Graphics.Capture, ContentType=WindowsRuntime]
$GraphicsCaptureSession = [Windows.Graphics.Capture.GraphicsCaptureSession, Windows.Graphics.Capture, ContentType=WindowsRuntime]

Write-Host "WinRT types loaded"

# We need to use C# to drive the async WinRT APIs properly
Add-Type -ReferencedAssemblies @(
    'System.Runtime.InteropServices.WindowsRuntime',
    'System.Runtime',
    'System.Threading.Tasks'
) @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;

public class WinRTCapHelper {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    // IGraphicsCaptureItemInterop - allows creating capture item from HWND
    [ComImport]
    [Guid("3628E81B-3CAC-4C60-B7F4-23CE0E0C3356")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IGraphicsCaptureItemInterop {
        IntPtr CreateForWindow(IntPtr window, ref Guid iid);
        IntPtr CreateForMonitor(IntPtr monitor, ref Guid iid);
    }

    public static bool GetWindowSize(IntPtr hwnd, out int w, out int h) {
        RECT r;
        bool ok = GetWindowRect(hwnd, out r);
        w = r.Right - r.Left;
        h = r.Bottom - r.Top;
        return ok;
    }
}
'@ -IgnoreWarnings 2>$null

Write-Host "C# helper loaded"

# Create capture item from HWND
try {
    $factory = [System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeMarshal]::GetActivationFactory(
        [Windows.Graphics.Capture.GraphicsCaptureItem]
    )
    Write-Host "Factory type: $($factory.GetType().FullName)"
} catch {
    Write-Host "Factory error: $($_.Exception.Message)"
}
