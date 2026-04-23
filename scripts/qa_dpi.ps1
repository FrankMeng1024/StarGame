# Sprint 3-mini QA - DPI-correct coordinates
# Physical / 1.5 = logical for SetCursorPos
# mss captures physical pixels (no DPI conversion needed for screenshots)

Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class QADPI2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int c, int e);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
}
'@

$HWND = [IntPtr]7015796
$OUTDIR = "C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence"
$PYTHONW = "C:\Program Files\Python314\pythonw.exe"
# Game region in PHYSICAL pixels (for mss)
$GL_P=1340; $GT_P=140; $GW_P=410; $GH_P=880
# Game region in LOGICAL pixels (for SetCursorPos = physical/1.5)
$GL_L=[int]($GL_P/1.5); $GT_L=[int]($GT_P/1.5)
$GW_L=[int]($GW_P/1.5); $GH_L=[int]($GH_P/1.5)
# Console > logical position (physical 500,1113 / 1.5)
$CON_X=333; $CON_Y=742

Write-Host "Game logical: left=$GL_L top=$GT_L w=$GW_L h=$GH_L"
Write-Host "Console logical: $CON_X,$CON_Y"

function FocusDT {
    $fg=[QADPI2]::GetForegroundWindow(); $dummy=0
    $tid=[QADPI2]::GetWindowThreadProcessId($fg,[ref]$dummy)
    $me=[QADPI2]::GetCurrentThreadId()
    [QADPI2]::AttachThreadInput($me,$tid,$true)
    [QADPI2]::BringWindowToTop($HWND); [QADPI2]::ShowWindow($HWND,9); [QADPI2]::SetForegroundWindow($HWND)
    [QADPI2]::AttachThreadInput($me,$tid,$false)
    Start-Sleep -Milliseconds 500
}

function ShotGame { param([string]$n)
    $py="import mss,mss.tools,sys`nr={'top':$GT_P,'left':$GL_P,'width':$GW_P,'height':$GH_P}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
    $f="$OUTDIR\_tg.py"; $py|Set-Content $f -Encoding utf8
    $p=Start-Process $PYTHONW -ArgumentList "`"$f`"","`"$OUTDIR\$n`"" -WindowStyle Hidden -PassThru; $p.WaitForExit(5000)|Out-Null
    Write-Host "  SHOT: $n"
}

function Cmd { param([string]$c)
    FocusDT
    Set-Clipboard -Value $c
    Start-Sleep -Milliseconds 150
    [QADPI2]::SetCursorPos($CON_X, $CON_Y); Start-Sleep -Milliseconds 200
    [QADPI2]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 80; [QADPI2]::mouse_event(4,0,0,0,0)
    Start-Sleep -Milliseconds 400
    # Ctrl+A Ctrl+V Enter
    [QADPI2]::keybd_event(0x11,0,0,0); [QADPI2]::keybd_event(0x41,0,0,0); Start-Sleep -Milliseconds 80
    [QADPI2]::keybd_event(0x41,0,2,0); [QADPI2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 80
    [QADPI2]::keybd_event(0x11,0,0,0); [QADPI2]::keybd_event(0x56,0,0,0); Start-Sleep -Milliseconds 80
    [QADPI2]::keybd_event(0x56,0,2,0); [QADPI2]::keybd_event(0x11,0,2,0); Start-Sleep -Milliseconds 300
    [QADPI2]::keybd_event(0x0D,0,0,0); Start-Sleep -Milliseconds 80; [QADPI2]::keybd_event(0x0D,0,2,0)
    Start-Sleep -Milliseconds 1800
    Write-Host "  CMD: $c"
    FocusDT
    Start-Sleep -Milliseconds 500
}

Write-Host "=== Test: console command with correct DPI ==="
Cmd "wx.__navigate('levels')"
ShotGame "DPI-test-levels.png"

# Also check console
$py2="import mss,mss.tools,sys`nr={'top':1060,'left':305,'width':535,'height':140}`nwith mss.mss() as sct:`n    s=sct.grab(r)`n    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])"
$f2="$OUTDIR\_tc.py"; $py2|Set-Content $f2 -Encoding utf8
FocusDT
$p2=Start-Process $PYTHONW -ArgumentList "`"$f2`"","`"$OUTDIR\DPI-test-console.png`"" -WindowStyle Hidden -PassThru; $p2.WaitForExit(5000)|Out-Null
Write-Host "Console shot done"
