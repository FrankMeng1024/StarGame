"""
Mouse jiggler — moves mouse 1px every 60 seconds to prevent screen lock.
Run in background. Stop with Ctrl+C or kill process.
"""
import ctypes
import time
import sys

print("Mouse jiggler started. Press Ctrl+C to stop.")
toggle = 0
while True:
    x = 640 + toggle
    ctypes.windll.user32.SetCursorPos(x, 400)
    toggle = 1 - toggle
    time.sleep(55)
