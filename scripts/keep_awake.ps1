# keep_awake.ps1 — 每55秒移动鼠标1px再移回，阻止屏保启动
# 运行: powershell -ExecutionPolicy Bypass -File scripts\keep_awake.ps1
Add-Type -AssemblyName System.Windows.Forms

Write-Host "防屏保已启动 (Ctrl+C 停止)"
while ($true) {
    $pos = [System.Windows.Forms.Cursor]::Position
    [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new($pos.X + 1, $pos.Y)
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.Cursor]::Position = $pos
    Start-Sleep -Seconds 595
}
