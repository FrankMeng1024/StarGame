param([long]$hwnd = 29425864)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class DWMBounds2 {
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, uint dwAttribute, out RECT pvAttribute, uint cbAttribute);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    const uint DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    public static void GetBounds(IntPtr hwnd) {
        RECT logical, physical;
        GetWindowRect(hwnd, out logical);
        DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out physical, 16);
        Console.WriteLine("Logical:  " + logical.Left + "," + logical.Top + " -> " + logical.Right + "," + logical.Bottom + " (" + (logical.Right-logical.Left) + "x" + (logical.Bottom-logical.Top) + ")");
        Console.WriteLine("Physical: " + physical.Left + "," + physical.Top + " -> " + physical.Right + "," + physical.Bottom + " (" + (physical.Right-physical.Left) + "x" + (physical.Bottom-physical.Top) + ")");
    }
}
"@

$h = [IntPtr]::new($hwnd)
[DWMBounds2]::GetBounds($h)
