$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','cd /d C:\JS\ns\neuroswarm\router-api && set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test && npm start' -PassThru
Start-Sleep -Seconds 2
Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" | Select-Object ProcessId,CommandLine | Format-List | Out-String -Width 400 | Write-Host
Write-Host "Started process PID: $($p.Id)"