using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

class Program
{
    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
    
    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }
    
    [DllImport("user32.dll")]
    static extern IntPtr GetWindowDC(IntPtr hwnd);
    
    [DllImport("user32.dll")]
    static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
    
    [DllImport("gdi32.dll")]
    static extern bool BitBlt(IntPtr dst, int dx, int dy, int w, int h, IntPtr src, int sx, int sy, uint rop);
    
    [DllImport("gdi32.dll")]
    static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    
    [DllImport("gdi32.dll")]
    static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int w, int h);
    
    [DllImport("gdi32.dll")]
    static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    
    [DllImport("gdi32.dll")]
    static extern bool DeleteDC(IntPtr hdc);
    
    [DllImport("gdi32.dll")]
    static extern bool DeleteObject(IntPtr obj);

    static void Main(string[] args)
    {
        long hwndLong = long.Parse(args[0]);
        string outPath = args[1];
        
        IntPtr hwnd = new IntPtr(hwndLong);
        RECT rect;
        GetWindowRect(hwnd, out rect);
        int w = rect.Right - rect.Left;
        int h = rect.Bottom - rect.Top;
        
        Console.WriteLine("Window: " + w + "x" + h + " at (" + rect.Left + "," + rect.Top + ")");
        
        IntPtr screenDC = GetWindowDC(IntPtr.Zero);
        IntPtr memDC = CreateCompatibleDC(screenDC);
        IntPtr hBmp = CreateCompatibleBitmap(screenDC, w, h);
        IntPtr oldBmp = SelectObject(memDC, hBmp);
        
        bool result = BitBlt(memDC, 0, 0, w, h, screenDC, rect.Left, rect.Top, 0x00CC0020);
        Console.WriteLine("BitBlt result: " + result);
        
        Bitmap bmp = Bitmap.FromHbitmap(hBmp);
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
        
        SelectObject(memDC, oldBmp);
        DeleteDC(memDC);
        DeleteObject(hBmp);
        ReleaseDC(IntPtr.Zero, screenDC);
        
        Console.WriteLine("Saved: " + outPath);
    }
}
