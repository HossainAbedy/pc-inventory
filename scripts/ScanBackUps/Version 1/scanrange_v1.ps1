<#
Domain_OS_Check_Parallel.ps1
Parallel scanner: Start IP / End IP -> ping -> WMI (Get-WmiObject) -> SWbemLocator fallback.
Uses RunspacePool for concurrency (works with PowerShell 5.1). Exports to Excel/CSV.

Usage: run elevated, enter start/end IP and admin credentials. Adjust $Throttle if you want fewer/more concurrent threads.
#>

Set-StrictMode -Version Latest

function Validate-IP { param([string]$ip)
    if (-not $ip) { throw "Empty IP." }
    $parts = $ip -split '\.'
    if ($parts.Count -ne 4) { throw "Invalid IP format: $ip" }
    foreach ($p in $parts) { if (-not ($p -match '^\d+$') -or [int]$p -lt 0 -or [int]$p -gt 255) { throw "Invalid IP octet: $p in $ip" } }
    return
}
function IPToUInt64 { param([string]$ip) 
    $p = $ip -split '\.'; return ([uint64][int]$p[0] -shl 24) -bor ([uint64][int]$p[1] -shl 16) -bor ([uint64][int]$p[2] -shl 8) -bor [uint64][int]$p[3]
}
function UInt64ToIP { param([uint64]$n)
    $a = ($n -shr 24) -band 0xFF; $b = ($n -shr 16) -band 0xFF; $c = ($n -shr 8) -band 0xFF; $d = $n -band 0xFF
    return ("{0}.{1}.{2}.{3}" -f $a,$b,$c,$d)
}

# Optional ImportExcel install (best-effort)
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    try { Install-Module -Name ImportExcel -Force -Scope CurrentUser -ErrorAction Stop } catch { Write-Host "ImportExcel unavailable, will fallback to CSV." -ForegroundColor Yellow }
}

# Inputs
$startIP = Read-Host "Enter START IP (e.g. 172.19.101.1)"
$endIP   = Read-Host "Enter END   IP (e.g. 172.19.102.50)"
try {
    [void](Validate-IP $startIP); [void](Validate-IP $endIP)
    $startLong = IPToUInt64 $startIP; $endLong = IPToUInt64 $endIP
    if ($startLong -gt $endLong) { throw "Start IP must be <= End IP." }
} catch { Write-Host "Input error: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# Concurrency: change this to tune speed vs load
$Throttle = Read-Host "Enter throttle (concurrent threads, recommended 20-100). Press Enter for default 50"
if (-not [int]$Throttle) { $Throttle = 50 }

# Credentials
$cred = Get-Credential -Message "Enter admin credentials for remote hosts (domain\user or .\user)"
$username = $cred.UserName
$password = $cred.GetNetworkCredential().Password

# Build IP list (safe)
$ipList = New-Object System.Collections.Generic.List[string]
for ($n = $startLong; $n -le $endLong; $n++) { $ipList.Add( (UInt64ToIP $n) ) }

# Create runspace pool
$min = 1; $max = [int]$Throttle
$pool = [runspacefactory]::CreateRunspacePool($min, $max)
$pool.ThreadOptions = "ReuseThread"
$pool.Open()

$jobs = @()
$total = $ipList.Count
$completed = 0

Write-Host "Starting parallel scan of $total hosts with throttle $Throttle..." -ForegroundColor Cyan

foreach ($ip in $ipList) {
    $ps = [powershell]::Create()
    $script = {
        param($ip,$u,$p)
        # Ping quickly
        if (-not (Test-Connection -ComputerName $ip -Count 1 -Quiet -ErrorAction SilentlyContinue)) { return @{IP=$ip; Status="Unreachable"} }

        # Try Get-WmiObject with -Credential
        try {
            $comp = Get-WmiObject -Class Win32_ComputerSystem -ComputerName $ip -Credential (New-Object System.Management.Automation.PSCredential($u,(ConvertTo-SecureString $p -AsPlainText -Force))) -ErrorAction Stop
            $os   = Get-WmiObject -Class Win32_OperatingSystem -ComputerName $ip -Credential (New-Object System.Management.Automation.PSCredential($u,(ConvertTo-SecureString $p -AsPlainText -Force))) -ErrorAction Stop
        } catch {
            # fallback SWbemLocator
            try {
                $locator = New-Object -ComObject "WbemScripting.SWbemLocator"
                $svc = $locator.ConnectServer($ip, "root\cimv2", $u, $p)
                $comp = $svc.ExecQuery("SELECT * FROM Win32_ComputerSystem") | Select-Object -First 1
                $os   = $svc.ExecQuery("SELECT * FROM Win32_OperatingSystem") | Select-Object -First 1
            } catch {
                return @{IP=$ip; Status="WMIFailed"; Error=$_.Exception.Message}
            }
        }

        if ($comp -and $os) {
            $domainStatus = if ($comp.PartOfDomain) { "Domain: $($comp.Domain)" } else { "Workgroup: $($comp.Workgroup)" }
            return @{IP=$ip; Hostname=$comp.Name; DomainStatus=$domainStatus; OSVersion=$os.Caption; Status="OK"}
        } else {
            return @{IP=$ip; Status="NoData"}
        }
    }

    $ps.AddScript($script) | Out-Null
    $ps.AddArgument($ip) | Out-Null
    $ps.AddArgument($username) | Out-Null
    $ps.AddArgument($password) | Out-Null
    $ps.RunspacePool = $pool

    $ar = $ps.BeginInvoke()
    $jobs += [PSCustomObject]@{ps=$ps; ar=$ar; ip=$ip; done=$false}
}

# Monitor and collect results
$results = New-Object System.Collections.Generic.List[psobject]
while ($jobs | Where-Object { -not $_.done }) {
    foreach ($j in $jobs) {
        if (-not $j.done -and $j.ar.IsCompleted) {
            $out = $j.ps.EndInvoke($j.ar)
            $j.ps.Dispose()
            $j.done = $true
            $completed++
            # out is an enumerator; get first element (script returns hashtable)
            if ($out -and $out.Count -gt 0) {
                $h = $out[0]
                if ($h.Status -eq "OK") {
                    $results.Add([PSCustomObject]@{
                        IP = $h.IP; Hostname = $h.Hostname; DomainStatus = $h.DomainStatus; OSVersion = $h.OSVersion; Timestamp = (Get-Date).ToString("s")
                    })
                } else {
                    # you can record failures too if you want
                    # $results.Add([PSCustomObject]@{IP=$h.IP; Hostname=$null; DomainStatus=$h.Status; OSVersion=$null; Error=$h.Error})
                }
            }
            # update progress
            $percent = [int](($completed / $total) * 100)
            Write-Progress -Activity "Parallel scan" -Status "Completed $completed of $total (last: $($j.ip))" -PercentComplete $percent
        }
    }
    Start-Sleep -Milliseconds 200
}

# Cleanup pool
$pool.Close()
$pool.Dispose()

Write-Progress -Activity "Parallel scan" -Completed -Status "Done"

if ($results.Count -eq 0) { Write-Host "No successful records collected." -ForegroundColor Yellow; exit 0 }

# Export
$exportName = Read-Host "Enter output filename (without extension)"
if (-not $exportName) { $exportName = "DomainOS_Scan_$(Get-Date -Format yyyyMMdd_HHmmss)" }
$filePath = Join-Path -Path $PSScriptRoot -ChildPath "$exportName.xlsx"

if (Get-Module -ListAvailable -Name ImportExcel) {
    try {
        $results | Export-Excel -Path $filePath -WorksheetName "Domain_OS" -AutoSize -BoldTopRow -ErrorAction Stop
        Write-Host "Exported to $filePath" -ForegroundColor Green
    } catch {
        Write-Host "Excel export failed: $($_.Exception.Message). Falling back to CSV." -ForegroundColor Yellow
        $csv = Join-Path $PSScriptRoot "$exportName.csv"
        $results | Export-Csv -Path $csv -NoTypeInformation -Force -Encoding UTF8
        Write-Host "Exported CSV to $csv" -ForegroundColor Green
    }
} else {
    $csv = Join-Path $PSScriptRoot "$exportName.csv"
    $results | Export-Csv -Path $csv -NoTypeInformation -Force -Encoding UTF8
    Write-Host "ImportExcel not present. Exported CSV to $csv" -ForegroundColor Green
}

Write-Host "Done. Collected $($results.Count) records." -ForegroundColor Cyan
