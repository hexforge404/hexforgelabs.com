param(
    [string]$WorkDir = 'C:\HexForge\litho-work',
    [string]$WatcherScript = 'C:\HexForge\litho-work\watch-stl.ps1',
    [string]$SharedRoot = '',
    [string]$ActiveJobFile = '',
    [switch]$UseNetworkShare,
    [int]$TimeoutSeconds = 15
)

$ErrorActionPreference = 'Stop'

function Write-Pass($message) { Write-Host "[PASS] $message" -ForegroundColor Green }
function Write-Fail($message) { Write-Host "[FAIL] $message" -ForegroundColor Red }
function Write-Skip($message) { Write-Host "[SKIP] $message" -ForegroundColor Yellow }

function Assert-True($condition, $message) {
    if ($condition) {
        Write-Pass $message
        return $true
    }

    Write-Fail $message
    return $false
}

function Ensure-Directory($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

function Remove-PathIfExists($path) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function New-PlaceholderStl($path) {
    "solid placeholder`nendsolid placeholder" | Set-Content -Path $path -Encoding Ascii
}

function Wait-Until($timeoutSeconds, [scriptblock]$predicate) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        if (& $predicate) {
            return $true
        }
        Start-Sleep -Milliseconds 300
    }

    return $false
}

function Start-WatcherProcess($skipStartupScan, $logPath) {
    if (-not (Test-Path $WatcherScript)) {
        throw "Watcher script not found: $WatcherScript"
    }

    $args = @(
        '-ExecutionPolicy', 'Bypass',
        '-File', $WatcherScript,
        '-WorkDir', $WorkDir,
        '-ActiveJobFile', $ActiveJobFile,
        '-SharedRoot', $SharedRoot
    )

    if ($skipStartupScan) {
        $args += '-SkipStartupScan'
    }

    Start-Process -FilePath 'powershell' -ArgumentList $args -NoNewWindow -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $logPath
}

function Stop-WatcherProcess($process) {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForLogLine($logPath, $pattern, $timeoutSeconds) {
    return Wait-Until $timeoutSeconds { Test-Path $logPath -and (Select-String -Path $logPath -Pattern $pattern -Quiet) }
}

function Set-ActiveJob($jobId) {
    $value = $jobId.Trim()
    $value | Set-Content -Path $ActiveJobFile -Encoding Ascii
}

function Get-SharedStlDir($jobId) {
    Join-Path -Path $SharedRoot -ChildPath "$jobId\stl"
}

function Get-TestPaths($suffix) {
    return @{
        OrdersRoot = Join-Path $WorkDir 'orders'
        PrototypeRoot = Join-Path $WorkDir 'prototype'
        FailedRoot = Join-Path $WorkDir 'failed-hold'
        OrdersTest = Join-Path (Join-Path $WorkDir 'orders') "__watcher-test__\\$suffix"
        PrototypeTest = Join-Path (Join-Path $WorkDir 'prototype') "__watcher-test__\\$suffix"
        LogsDir = Join-Path $WorkDir '__watcher-test__\\logs'
    }
}

function Prepare-TestRoots($paths) {
    Ensure-Directory $paths.OrdersRoot
    Ensure-Directory $paths.PrototypeRoot
    Ensure-Directory $paths.FailedRoot
    Ensure-Directory $paths.OrdersTest
    Ensure-Directory $paths.PrototypeTest
    Ensure-Directory $paths.LogsDir
}

function Cleanup-TestRoots($paths) {
    Remove-PathIfExists $paths.OrdersTest
    Remove-PathIfExists $paths.PrototypeTest
}

function Detect-QuarantineEnabled {
    if (-not (Test-Path $WatcherScript)) {
        return $false
    }

    return (Select-String -Path $WatcherScript -Pattern 'failed-hold|Quarantined' -Quiet)
}

if (-not $UseNetworkShare) {
    if (-not $SharedRoot) {
        $SharedRoot = Join-Path $WorkDir '__shared-root__'
    }

    if (-not $ActiveJobFile) {
        $ActiveJobFile = Join-Path $SharedRoot 'active-job.txt'
    }

    Ensure-Directory $SharedRoot
    Ensure-Directory (Split-Path -Parent $ActiveJobFile)
} else {
    if (-not $SharedRoot) {
        $SharedRoot = '\\10.0.0.200\litho-handoff'
    }
    if (-not $ActiveJobFile) {
        $ActiveJobFile = Join-Path $SharedRoot 'active-job.txt'
    }
}

Write-Host "[TEST] WorkDir: $WorkDir"
Write-Host "[TEST] WatcherScript: $WatcherScript"
Write-Host "[TEST] SharedRoot: $SharedRoot"
Write-Host "[TEST] ActiveJobFile: $ActiveJobFile"

$paths = Get-TestPaths -suffix ([Guid]::NewGuid().ToString('N'))
Prepare-TestRoots $paths

$allPassed = $true
$watcher = $null
$logPath = Join-Path $paths.LogsDir ('watcher-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

try {
    # Test 1: Orders folder is watched source
    Set-ActiveJob 'PJ-TEST-ORDERS'
    $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $ordersStl = Join-Path $paths.OrdersTest 'orders-picked.stl'
    New-PlaceholderStl $ordersStl

    $destDir = Get-SharedStlDir 'PJ-TEST-ORDERS'
    Ensure-Directory $destDir
    $destFile = Join-Path $destDir 'orders-picked.stl'

    $pickedUp = Wait-Until $TimeoutSeconds { Test-Path $destFile }
    $allPassed = (Assert-True $pickedUp 'Orders STL picked up') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null
    Cleanup-TestRoots $paths

    # Test 2: Prototype folder is ignored
    Prepare-TestRoots $paths
    Set-ActiveJob 'PJ-TEST-PROTO'
    $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $protoStl = Join-Path $paths.PrototypeTest 'prototype-ignored.stl'
    New-PlaceholderStl $protoStl

    $destDir = Get-SharedStlDir 'PJ-TEST-PROTO'
    Ensure-Directory $destDir
    $destFile = Join-Path $destDir 'prototype-ignored.stl'

    $moved = Wait-Until $TimeoutSeconds { Test-Path $destFile }
    $allPassed = (Assert-True (-not $moved) 'Prototype STL ignored') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null
    Cleanup-TestRoots $paths

    # Test 3: Ignore rule works (proto- prefix)
    Prepare-TestRoots $paths
    Set-ActiveJob 'PJ-TEST-IGNORE'
    $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $ignoredStl = Join-Path $paths.OrdersTest 'proto-test.stl'
    New-PlaceholderStl $ignoredStl

    $destDir = Get-SharedStlDir 'PJ-TEST-IGNORE'
    Ensure-Directory $destDir
    $destFile = Join-Path $destDir 'proto-test.stl'

    $moved = Wait-Until $TimeoutSeconds { Test-Path $destFile }
    $allPassed = (Assert-True (-not $moved) 'Ignore rule for proto-*.stl') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null
    Cleanup-TestRoots $paths

    # Test 4: Active job resolution
    Prepare-TestRoots $paths
    Set-ActiveJob 'PJ-TEST-ACTIVE'
    $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $activeStl = Join-Path $paths.OrdersTest 'active-job.stl'
    New-PlaceholderStl $activeStl

    $destDir = Get-SharedStlDir 'PJ-TEST-ACTIVE'
    Ensure-Directory $destDir
    $destFile = Join-Path $destDir 'active-job.stl'

    $moved = Wait-Until $TimeoutSeconds { Test-Path $destFile }
    $allPassed = (Assert-True $moved 'Active job resolution targets correct PJ-...\stl') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null
    Cleanup-TestRoots $paths

    # Test 5: Startup/restart recovery
    Prepare-TestRoots $paths
    Set-ActiveJob 'PJ-TEST-STARTUP'

    $preStartStl = Join-Path $paths.OrdersTest 'startup-scan.stl'
    New-PlaceholderStl $preStartStl

    $destDir = Get-SharedStlDir 'PJ-TEST-STARTUP'
    Ensure-Directory $destDir
    $destFile = Join-Path $destDir 'startup-scan.stl'

    $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $movedDuringSkip = Wait-Until ([Math]::Min($TimeoutSeconds, 10)) { Test-Path $destFile }
    $allPassed = (Assert-True (-not $movedDuringSkip) 'SkipStartupScan does not process pre-existing STL quickly') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null

    Remove-PathIfExists $destFile
    $watcher = Start-WatcherProcess -skipStartupScan $false -logPath $logPath
    Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

    $movedDuringScan = Wait-Until $TimeoutSeconds { Test-Path $destFile }
    $allPassed = (Assert-True $movedDuringScan 'Startup scan processes pre-existing STL') -and $allPassed

    Stop-WatcherProcess $watcher
    $watcher = $null
    Cleanup-TestRoots $paths

    # Test 6: Failed-hold behavior (if enabled)
    if (Detect-QuarantineEnabled) {
        Prepare-TestRoots $paths
        Set-ActiveJob 'PJ-TEST-FAILURE'
        $watcher = Start-WatcherProcess -skipStartupScan $true -logPath $logPath
        Wait-ForLogLine -logPath $logPath -pattern 'STARTING WATCHER' -timeoutSeconds 10 | Out-Null

        $failureStl = Join-Path $paths.OrdersTest 'fail-quarantine.stl'
        New-PlaceholderStl $failureStl

        $destDir = Get-SharedStlDir 'PJ-TEST-FAILURE'
        Ensure-Directory $destDir
        $destFile = Join-Path $destDir 'fail-quarantine.stl'

        # Lock destination file and remove write permission on the folder to force copy failure.
        $aclChanged = $false
        try {
            if (-not (Test-Path $destFile)) {
                New-PlaceholderStl $destFile
            }

            $user = $env:USERNAME
            if ($user) {
                & icacls $destDir /deny "$user:(W)" | Out-Null
                $aclChanged = $true
            }
        } catch {
            Write-Skip "Failed to set ACL deny write; quarantine test may be unreliable: $($_.Exception.Message)"
        }

        $firstFail = Wait-ForLogLine -logPath $logPath -pattern 'Failed to move STL after' -timeoutSeconds 20

        # Touch the file to trigger another attempt.
        if (Test-Path $failureStl) {
            (Get-Item $failureStl).LastWriteTime = Get-Date
        }

        $secondFail = Wait-ForLogLine -logPath $logPath -pattern 'Will retry on next cycle|QUARANTINED STL' -timeoutSeconds 20

        if ($aclChanged) {
            try {
                & icacls $destDir /remove:d "$env:USERNAME" | Out-Null
            } catch {
                Write-Skip "Failed to remove ACL deny write: $($_.Exception.Message)"
            }
        }

        $quarantinedFile = Join-Path $paths.FailedRoot 'fail-quarantine.stl'
        $quarantined = Wait-Until $TimeoutSeconds { Test-Path $quarantinedFile }

        $result = $firstFail -and $secondFail -and $quarantined
        $allPassed = (Assert-True $result 'Failed-hold quarantine triggered after repeated failures') -and $allPassed

        Stop-WatcherProcess $watcher
        $watcher = $null
        Cleanup-TestRoots $paths
    } else {
        Write-Skip 'Failed-hold quarantine logic not detected; skipping test'
    }
} finally {
    Stop-WatcherProcess $watcher
}

if ($allPassed) {
    Write-Host '[RESULT] ALL TESTS PASSED' -ForegroundColor Green
    exit 0
}

Write-Host '[RESULT] ONE OR MORE TESTS FAILED' -ForegroundColor Red
exit 1
