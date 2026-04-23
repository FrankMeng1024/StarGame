param([string]$projectPath = 'C:\ClaudeCodeProjects\StarGame\miniprogram')

# Kill all existing wechatdevtools processes
Write-Host "Killing all wechatdevtools processes..."
Get-Process wechatdevtools -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Relaunch with --disable-gpu and the project path
$exe = 'C:\tools\微信web开发者工具\wechatdevtools.exe'
$pkg = 'C:\tools\微信web开发者工具\code\package.nw'
$argList = @(
    $pkg,
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--disable-accelerated-2d-canvas',
    '--project', $projectPath
)

Write-Host "Launching with args: $($argList -join ' ')"
Start-Process -FilePath $exe -ArgumentList $argList
Write-Host "DevTools launched. Waiting for startup..."
Start-Sleep -Seconds 5

# Find the new window
$procs = Get-Process wechatdevtools -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($p in $procs) {
    Write-Host "Process: PID=$($p.Id) HWND=$($p.MainWindowHandle) Title=$($p.MainWindowTitle)"
}
