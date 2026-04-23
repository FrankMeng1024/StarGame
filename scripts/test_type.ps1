Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QAType {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public INPUTUNION union;
    }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Explicit)]
    public struct INPUTUNION {
        [System.Runtime.InteropServices.FieldOffset(0)] public KEYBDINPUT kb;
        [System.Runtime.InteropServices.FieldOffset(0)] public MOUSEINPUT mi;
    }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }

    public static void TypeChar(char c) {
        var inputs = new INPUT[2];
        inputs[0].type = 1; // KEYBOARD
        inputs[0].union.kb.wVk = 0;
        inputs[0].union.kb.wScan = (ushort)c;
        inputs[0].union.kb.dwFlags = 4; // KEYEVENTF_UNICODE
        inputs[1].type = 1;
        inputs[1].union.kb.wVk = 0;
        inputs[1].union.kb.wScan = (ushort)c;
        inputs[1].union.kb.dwFlags = 4 | 2; // KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
        SendInput(2, inputs, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
    }
    public static void TypeString(string s) {
        foreach (char c in s) TypeChar(c);
    }
    public static void PressEnter() {
        var inputs = new INPUT[2];
        inputs[0].type = 1; inputs[0].union.kb.wVk = 0x0D;
        inputs[1].type = 1; inputs[1].union.kb.wVk = 0x0D; inputs[1].union.kb.dwFlags = 2;
        SendInput(2, inputs, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
    }
}
'@
$HWND=[IntPtr]7015796
$PYTHONW="C:\Program Files\Python314\pythonw.exe"
$OUTDIR="C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"

function FocusDT {
    $fg=[QAType]::GetForegroundWindow(); $dummy=0
    $tid=[QAType]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QAType]::GetCurrentThreadId()
    [QAType]::AttachThreadInput($me,$tid,$true)
    [QAType]::BringWindowToTop($HWND); [QAType]::ShowWindow($HWND,9); [QAType]::SetForegroundWindow($HWND)
    [QAType]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function ShotGame { param([string]$n)
    $py="import mss,mss.tools,sys`nr={'top':140,'left':1340,'width':410,'height':880}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_t.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "Shot: $n"
}
function ShotConsole { param([string]$n)
    $py="import mss,mss.tools,sys`nr={'top':1060,'left':305,'width':535,'height':140}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_t2.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "ConShot: $n"
}

FocusDT
Write-Host "Clicking > at (500, 1113)..."
[QAType]::SetCursorPos(500, 1113); Start-Sleep -Milliseconds 200
[QAType]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QAType]::mouse_event(4,0,0,0,0)
Start-Sleep -Milliseconds 500

Write-Host "Typing via SendInput Unicode..."
[QAType]::TypeString("wx.__navigate('levels')")
Start-Sleep -Milliseconds 300
[QAType]::PressEnter()
Start-Sleep -Milliseconds 2000

FocusDT
ShotConsole "CONSOLE-type-test.png"
ShotGame "GAME-type-test.png"
