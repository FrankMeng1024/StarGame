Get-Process | Select-Object Id, ProcessName, MainWindowTitle | Where-Object { $_.ProcessName -like '*wechat*' -or $_.ProcessName -like '*devtools*' -or $_.ProcessName -like '*nw*' }
