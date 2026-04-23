using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

class DXGICapture {
    [StructLayout(LayoutKind.Sequential)] struct DXGI_OUTDUPL_FRAME_INFO {
        public long LastPresentTime, LastMouseUpdateTime;
        public int AccumulatedFrames;
        public bool RectsCoalesced, ProtectedContentMaskedOut;
        public DXGI_OUTDUPL_POINTER_POSITION PointerPosition;
        public int TotalMetadataBufferSize, PointerShapeBufferSize;
    }
    [StructLayout(LayoutKind.Sequential)] struct DXGI_OUTDUPL_POINTER_POSITION {
        public System.Drawing.Point Position;
        public bool Visible;
    }
    [StructLayout(LayoutKind.Sequential)] struct D3D11_TEXTURE2D_DESC {
        public int Width, Height, MipLevels, ArraySize, Format, SampleDescCount, SampleDescQuality;
        public int Usage, BindFlags, CPUAccessFlags, MiscFlags;
    }
    [StructLayout(LayoutKind.Sequential)] struct D3D11_MAPPED_SUBRESOURCE {
        public IntPtr pData;
        public int RowPitch, DepthPitch;
    }

    [DllImport("d3d11.dll")]
    static extern int D3D11CreateDevice(IntPtr pAdapter, int DriverType, IntPtr Software, int Flags,
        IntPtr pFeatureLevels, int FeatureLevels, int SDKVersion,
        out IntPtr ppDevice, out int pFeatureLevel, out IntPtr ppImmediateContext);

    [DllImport("dxgi.dll")] static extern int CreateDXGIFactory1(ref Guid riid, out IntPtr ppFactory);
    [DllImport("kernel32.dll")] static extern void CopyMemory(IntPtr dest, IntPtr src, int count);

    static Guid IID_IDXGIFactory1 = new Guid("770aae78-f26f-4dba-a829-253c83d1b387");
    static Guid IID_IDXGIOutput1 = new Guid("00cddea8-939b-4b83-a340-a685226666cc");
    static Guid IID_ID3D11Texture2D = new Guid("6f15aaf2-d208-4e89-9ab4-489535d34f9c");

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnEnumAdapters(IntPtr factory, int idx, out IntPtr ppAdapter);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnEnumOutputs(IntPtr adapter, int idx, out IntPtr ppOutput);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnDuplicateOutput(IntPtr output1, IntPtr d3dDevice, out IntPtr ppDupl);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnAcquireNextFrame(IntPtr dupl, int timeout, out DXGI_OUTDUPL_FRAME_INFO fi, out IntPtr res);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnReleaseFrame(IntPtr dupl);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnQueryInterface(IntPtr obj, ref Guid iid, out IntPtr ppObj);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnCreateTexture2D(IntPtr device, ref D3D11_TEXTURE2D_DESC desc, IntPtr initData, out IntPtr ppTex);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate void FnCopyResource(IntPtr ctx, IntPtr dst, IntPtr src);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int FnMap(IntPtr ctx, IntPtr res, int sub, int mapType, int flags, out D3D11_MAPPED_SUBRESOURCE mapped);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate void FnUnmap(IntPtr ctx, IntPtr res, int sub);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate void FnRelease(IntPtr obj);

    static T Vtable<T>(IntPtr obj, int idx) where T : class {
        IntPtr vtbl = Marshal.ReadIntPtr(obj);
        IntPtr fp = Marshal.ReadIntPtr(vtbl, idx * IntPtr.Size);
        return Marshal.GetDelegateForFunctionPointer(fp, typeof(T)) as T;
    }

    static void Main(string[] args) {
        string outPath = args.Length > 0 ? args[0] : "capture.png";
        Console.WriteLine("Output: " + outPath);

        IntPtr device, context;
        int featureLevel;
        int hr = D3D11CreateDevice(IntPtr.Zero, 1, IntPtr.Zero, 0, IntPtr.Zero, 0, 7, out device, out featureLevel, out context);
        if (hr != 0) { Console.WriteLine("D3D11 failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("D3D11 OK level=0x" + featureLevel.ToString("X"));

        IntPtr factory;
        var g1 = IID_IDXGIFactory1;
        hr = CreateDXGIFactory1(ref g1, out factory);
        if (hr != 0) { Console.WriteLine("DXGIFactory failed: 0x" + hr.ToString("X8")); return; }

        IntPtr adapter;
        hr = Vtable<FnEnumAdapters>(factory, 7)(factory, 0, out adapter);
        if (hr != 0) { Console.WriteLine("EnumAdapters failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Adapter OK");

        IntPtr output;
        hr = Vtable<FnEnumOutputs>(adapter, 7)(adapter, 0, out output);
        if (hr != 0) { Console.WriteLine("EnumOutputs failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Output OK");

        IntPtr output1;
        var g2 = IID_IDXGIOutput1;
        hr = Vtable<FnQueryInterface>(output, 0)(output, ref g2, out output1);
        if (hr != 0) { Console.WriteLine("QI Output1 failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Output1 OK");

        IntPtr duplication;
        hr = Vtable<FnDuplicateOutput>(output1, 22)(output1, device, out duplication);
        if (hr != 0) { Console.WriteLine("DuplicateOutput failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Duplication OK");

        DXGI_OUTDUPL_FRAME_INFO fi;
        IntPtr desktopRes = IntPtr.Zero;
        var acquireFrame = Vtable<FnAcquireNextFrame>(duplication, 8);
        var releaseFrame = Vtable<FnReleaseFrame>(duplication, 14);

        for (int i = 0; i < 20; i++) {
            hr = acquireFrame(duplication, 3000, out fi, out desktopRes);
            if (hr == 0 && desktopRes != IntPtr.Zero) {
                Console.WriteLine("Frame acquired attempt=" + i + " AccumulatedFrames=" + fi.AccumulatedFrames);
                if (fi.AccumulatedFrames > 0) break;
                // Stale/empty frame — release and try again
                Console.WriteLine("Stale frame (AccumulatedFrames=0), releasing and retrying...");
                releaseFrame(duplication);
                desktopRes = IntPtr.Zero;
                System.Threading.Thread.Sleep(100);
                continue;
            }
            Console.WriteLine("Attempt " + i + " hr=0x" + hr.ToString("X8"));
            if (desktopRes != IntPtr.Zero) { releaseFrame(duplication); desktopRes = IntPtr.Zero; }
            System.Threading.Thread.Sleep(100);
        }

        if (desktopRes == IntPtr.Zero) { Console.WriteLine("No frame acquired"); return; }

        IntPtr gpuTex;
        var g3 = IID_ID3D11Texture2D;
        hr = Vtable<FnQueryInterface>(desktopRes, 0)(desktopRes, ref g3, out gpuTex);
        if (hr != 0) { Console.WriteLine("QI Tex2D failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("GPU texture OK");

        var stagingDesc = new D3D11_TEXTURE2D_DESC {
            Width = 1280, Height = 800, MipLevels = 1, ArraySize = 1,
            Format = 87, SampleDescCount = 1, SampleDescQuality = 0,
            Usage = 3, BindFlags = 0, CPUAccessFlags = 0x20000, MiscFlags = 0
        };
        IntPtr stagingTex;
        hr = Vtable<FnCreateTexture2D>(device, 5)(device, ref stagingDesc, IntPtr.Zero, out stagingTex);
        if (hr != 0) { Console.WriteLine("CreateTexture2D failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Staging texture OK");

        Vtable<FnCopyResource>(context, 47)(context, stagingTex, gpuTex);
        Console.WriteLine("CopyResource done");

        releaseFrame(duplication);

        D3D11_MAPPED_SUBRESOURCE mapped;
        hr = Vtable<FnMap>(context, 14)(context, stagingTex, 0, 1, 0, out mapped);
        if (hr != 0) { Console.WriteLine("Map failed: 0x" + hr.ToString("X8")); return; }
        Console.WriteLine("Mapped RowPitch=" + mapped.RowPitch);

        // DXGI gives BGRA with A=0 for desktop content; copy and force A=255
        var bmp = new Bitmap(1280, 800, PixelFormat.Format32bppArgb);
        var bd = bmp.LockBits(new Rectangle(0, 0, 1280, 800), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        for (int y = 0; y < 800; y++) {
            IntPtr src = new IntPtr(mapped.pData.ToInt64() + (long)y * mapped.RowPitch);
            IntPtr dst = new IntPtr(bd.Scan0.ToInt64() + (long)y * bd.Stride);
            CopyMemory(dst, src, 1280 * 4);
        }
        // Force alpha=255 (DXGI desktop duplication returns A=0 for opaque desktop pixels)
        unsafe {
            byte* ptr = (byte*)bd.Scan0.ToPointer();
            for (int i = 0; i < 1280 * 800; i++) {
                ptr[i * 4 + 3] = 255; // Set alpha channel to opaque
            }
        }
        bmp.UnlockBits(bd);
        Vtable<FnUnmap>(context, 15)(context, stagingTex, 0);

        bmp.Save(outPath, ImageFormat.Png);
        Console.WriteLine("DONE: " + outPath);
    }
}
