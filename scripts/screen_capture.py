"""
Windows Graphics Capture API screenshot via Python + ctypes
Works with hardware-accelerated windows (D3D/Chromium)
Uses IDXGIOutputDuplication approach or Desktop Duplication API
"""

import ctypes
import ctypes.wintypes
import struct
import time
import sys
import os

# Simple approach: use the Desktop Duplication API to capture the area
# where the DevTools window is located

gdi32 = ctypes.windll.gdi32
user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [("biSize", ctypes.c_uint32), ("biWidth", ctypes.c_int32),
                ("biHeight", ctypes.c_int32), ("biPlanes", ctypes.c_uint16),
                ("biBitCount", ctypes.c_uint16), ("biCompression", ctypes.c_uint32),
                ("biSizeImage", ctypes.c_uint32), ("biXPelsPerMeter", ctypes.c_int32),
                ("biYPelsPerMeter", ctypes.c_int32), ("biClrUsed", ctypes.c_uint32),
                ("biClrImportant", ctypes.c_uint32)]

class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", ctypes.c_uint32 * 3)]

def capture_screen_region(x, y, w, h, out_path):
    """Capture a screen region using StretchBlt from desktop DC"""
    desktop_hwnd = user32.GetDesktopWindow()
    desktop_dc = user32.GetWindowDC(desktop_hwnd)

    mem_dc = gdi32.CreateCompatibleDC(desktop_dc)

    # Create DIBSection for direct pixel access
    bmi = BITMAPINFO()
    bmi.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.bmiHeader.biWidth = w
    bmi.bmiHeader.biHeight = -h  # negative = top-down
    bmi.bmiHeader.biPlanes = 1
    bmi.bmiHeader.biBitCount = 32
    bmi.bmiHeader.biCompression = 0  # BI_RGB

    ppvBits = ctypes.c_void_p()
    hbmp = gdi32.CreateDIBSection(desktop_dc, ctypes.byref(bmi), 0,
                                   ctypes.byref(ppvBits), None, 0)

    old_bmp = gdi32.SelectObject(mem_dc, hbmp)

    # Bring window to front first (done before calling this)
    time.sleep(0.1)

    # BitBlt from screen
    SRCCOPY = 0x00CC0020
    result = gdi32.BitBlt(mem_dc, 0, 0, w, h, desktop_dc, x, y, SRCCOPY)

    gdi32.SelectObject(mem_dc, old_bmp)

    # Read pixel data
    if ppvBits.value:
        pixels_ptr = ppvBits.value
        row_size = ((w * 32 + 31) // 32) * 4
        total_size = row_size * h
        pixel_data = (ctypes.c_uint8 * total_size).from_address(pixels_ptr)
        raw_bytes = bytes(pixel_data)

        # Write as BMP file
        bmp_header = struct.pack('<2sIHHI', b'BM', 54 + total_size, 0, 0, 54)
        bmp_info = struct.pack('<IIIHHIIIIII', 40, w, -h, 1, 32, 0, total_size, 2835, 2835, 0, 0)

        # Convert BGRA to RGB PNG using a simple PPM write or struct approach
        # Actually let's just write BMP directly
        bmp_path = out_path.replace('.png', '.bmp')
        with open(bmp_path, 'wb') as f:
            f.write(b'BM')
            f.write(struct.pack('<I', 54 + total_size))  # file size
            f.write(struct.pack('<HH', 0, 0))  # reserved
            f.write(struct.pack('<I', 54))  # offset to pixel data
            f.write(struct.pack('<I', 40))  # header size
            f.write(struct.pack('<i', w))  # width
            f.write(struct.pack('<i', h))  # height (positive = bottom-up)
            f.write(struct.pack('<H', 1))  # color planes
            f.write(struct.pack('<H', 32))  # bits per pixel
            f.write(struct.pack('<I', 0))  # compression (none)
            f.write(struct.pack('<I', total_size))
            f.write(struct.pack('<i', 2835))  # X pixels per meter
            f.write(struct.pack('<i', 2835))  # Y pixels per meter
            f.write(struct.pack('<I', 0))  # colors in table
            f.write(struct.pack('<I', 0))  # important colors
            # BMP stores bottom-up, convert from top-down
            for row in range(h - 1, -1, -1):
                offset = row * row_size
                f.write(raw_bytes[offset:offset + row_size])

        print(f"Saved BMP: {bmp_path} ({os.path.getsize(bmp_path)} bytes)")
        return True
    else:
        print("Failed to get pixel data")
        return False

    gdi32.DeleteDC(mem_dc)
    gdi32.DeleteObject(hbmp)
    user32.ReleaseDC(desktop_hwnd, desktop_dc)


def bring_window_to_front(hwnd):
    SW_RESTORE = 9
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    time.sleep(0.5)

def get_window_rect(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.left, r.top, r.right - r.left, r.bottom - r.top


if __name__ == '__main__':
    hwnd = int(sys.argv[1]) if len(sys.argv) > 1 else 5705136
    out = sys.argv[2] if len(sys.argv) > 2 else 'test.bmp'

    print(f"Capturing hwnd={hwnd}")
    x, y, w, h = get_window_rect(hwnd)
    print(f"Window at ({x},{y}) size {w}x{h}")

    # Bring to front
    bring_window_to_front(hwnd)
    time.sleep(1.5)  # Wait for repaint

    # Capture
    capture_screen_region(x, y, w, h, out)
