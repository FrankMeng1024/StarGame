# keep_awake_v2.ps1 — 使用 SetThreadExecutionState 阻止系统进入睡眠/锁屏
# 这是 Windows API 级别的防息屏，比鼠标移动更可靠，支持域策略环境
# 运行: powershell -ExecutionPolicy Bypass -File scripts\keep_awake_v2.ps1
# 停止: Ctrl+C

$code = @"
using System;
using System.Runtime.InteropServices;
public class WinIdle {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint esFlags);
    public const uint ES_CONTINUOUS      = 0x80000000;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
}
"@
Add-Type -TypeDefinition $code

# ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
# 保持系统不睡眠 + 显示器不关闭，直到脚本退出
$flags = [WinIdle]::ES_CONTINUOUS -bor [WinIdle]::ES_SYSTEM_REQUIRED -bor [WinIdle]::ES_DISPLAY_REQUIRED
$result = [WinIdle]::SetThreadExecutionState($flags)

if ($result -eq 0) {
    Write-Host "[ERROR] SetThreadExecutionState 调用失败，可能需要管理员权限" -ForegroundColor Red
    exit 1
}

Write-Host "防息屏已启动 (SetThreadExecutionState, OS级别)" -ForegroundColor Green
Write-Host "系统不会进入睡眠，显示器不会关闭" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止..." -ForegroundColor Yellow

# 注册退出时恢复正常
Register-EngineEvent PowerShell.Exiting -Action {
    [WinIdle]::SetThreadExecutionState([WinIdle]::ES_CONTINUOUS) | Out-Null
    Write-Host "`n防息屏已停止，系统恢复正常息屏策略" -ForegroundColor Cyan
} | Out-Null

# 每5分钟刷新一次（部分驱动/系统需要定期重申）
$counter = 0
while ($true) {
    Start-Sleep -Seconds 300
    $counter++
    [WinIdle]::SetThreadExecutionState($flags) | Out-Null
    Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] 防息屏刷新 #$counter" -ForegroundColor DarkGray
}
