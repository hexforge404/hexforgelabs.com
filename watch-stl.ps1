

param(
    [string]$WorkDir = 'C:\HexForge\litho-work',
    [string]$ActiveJobFile = '\\10.0.0.200\litho-handoff\active-job.txt',
    [string]$SharedRoot = '\\10.0.0.200\litho-handoff',
    [switch]$SkipStartupScan
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# WATCHER OPERATION NOTES
#
# Lithophane Maker should browse source images from the shared image drive
# (for example: Z:\PJ-<jobId>\source\).
#
# STL export output must be written locally to the orders staging folder:
#   C:\HexForge\litho-work\orders
#
# Prototype or test STL work should be kept separate under:
#   C:\HexForge\litho-work\prototype
#
# This watcher only monitors the local orders folder and moves production
# STL files into the active shared handoff job under the shared root.
# ---------------------------------------------------------------------------

$script:StlState = [hashtable]::Synchronized(@{})
$script:LastEventAt = [hashtable]::Synchronized(@{})
$script:RecentlyProcessed = [hashtable]::Synchronized(@{})
$script:FailureCounts = [hashtable]::Synchronized(@{})
$script:DuplicateCooldownSeconds = 10
$script:MaxFailuresBeforeQuarantine = 2

$OrdersDir = Join-Path $WorkDir 'orders'
$PrototypeDir = Join-Path $WorkDir 'prototype'
$FailedDir = Join-Path $WorkDir 'failed-hold'

function HasRecentSuccess($path) {
    $normalized = Get-NormalizedPath $path
    if (-not $script:RecentlyProcessed.ContainsKey($normalized)) {
        return $false
    }
    $entry = $script:RecentlyProcessed[$normalized]
    return ((Get-Date) - $entry.Timestamp).TotalSeconds -lt $script:DuplicateCooldownSeconds
}

function MarkProcessedSuccess($path) {
    $normalized = Get-NormalizedPath $path
    $script:RecentlyProcessed[$normalized] = @{ Timestamp = Get-Date }
}

function Get-SharedStlDir($printJobId) {
    return Join-Path -Path $SharedRoot -ChildPath "$printJobId\stl"
}

function Ensure-Directory($folder) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}

function Get-UniqueDestinationPath($destDir, $fileName) {
    $destPath = Join-Path -Path $destDir -ChildPath $fileName
    if (-not (Test-Path $destPath)) {
        return $destPath
    }

    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $extension = [System.IO.Path]::GetExtension($fileName)
    for ($index = 1; $index -le 100; $index++) {
        $candidate = Join-Path -Path $destDir -ChildPath "$baseName-$index$extension"
        if (-not (Test-Path $candidate)) {
            return $candidate
        }
    }

    throw "Unable to create a unique destination path for '$fileName' in '$destDir'."
}

function Wait-ForFileReady($path, $timeoutSeconds = 60) {
    $endTime = (Get-Date).AddSeconds($timeoutSeconds)
    $lastSize = -1
    $stableCount = 0

    while ((Get-Date) -lt $endTime) {
        if (-not (Test-Path $path)) {
            Start-Sleep -Milliseconds 500
            continue
        }

        try {
            $item = Get-Item -LiteralPath $path -ErrorAction Stop
            $size = $item.Length

            if ($size -eq $lastSize) {
                $stableCount++
            } else {
                $stableCount = 1
                $lastSize = $size
            }

            if ($stableCount -lt 3) {
                Start-Sleep -Milliseconds 500
                continue
            }

            if (((Get-Date) - $item.LastWriteTime).TotalSeconds -lt 4) {
                Start-Sleep -Milliseconds 500
                continue
            }

            Write-Host "[STL WATCHER] File passed stability checks: $path"
            return $true
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

function Get-NormalizedPath($path) {
    return [System.IO.Path]::GetFullPath($path).ToLowerInvariant()
}

function Write-ConfigSummary {
    Write-Host "[STL WATCHER] Runtime configuration:"
    Write-Host "  WorkDir:        $WorkDir"
    Write-Host "  OrdersDir:      $OrdersDir"
    Write-Host "  PrototypeDir:   $PrototypeDir"
    Write-Host "  ActiveJobFile:  $ActiveJobFile"
    Write-Host "  SharedRoot:     $SharedRoot"
}

function Try-EnqueueStlFile($path) {
    if (-not $path) {
        return
    }

    if ([System.IO.Path]::GetExtension($path).ToLowerInvariant() -ne '.stl') {
        return
    }

    $fileName = [System.IO.Path]::GetFileName($path)
    if ($fileName -match '^(?i)(test-|proto-)' -or $fileName -match '(?i)_draft\.stl$') {
        Write-Host "[STL WATCHER] Ignoring non-production STL: $fileName"
        return
    }

    $normalized = Get-NormalizedPath $path
    $script:LastEventAt[$normalized] = Get-Date

    if ($script:StlState[$normalized] -eq 'Quarantined') {
        return
    }

    $currentState = $script:StlState[$normalized]
    if (-not $currentState -or $currentState -in @('Completed', 'Failed')) {
        $script:StlState[$normalized] = 'Pending'
    }
}

function Process-PendingFiles {
    $debounceThreshold = 1500
    $now = Get-Date
    $pendingPaths = $script:StlState.GetEnumerator() | Where-Object Value -eq 'Pending' | Select-Object -ExpandProperty Key

    foreach ($normalized in $pendingPaths) {
        $lastEvent = $script:LastEventAt[$normalized]
        if (-not $lastEvent) {
            continue
        }

if (((($now - $lastEvent).TotalMilliseconds)) -lt $debounceThreshold) {
            continue
        }

        $script:StlState[$normalized] = 'Processing'
        Process-StlFile -fullPath $normalized

        if (HasRecentSuccess $normalized) {
            $script:StlState[$normalized] = 'Completed'
        } else {
            $script:StlState[$normalized] = 'Failed'
        }
    }
}

function Process-StlFile($fullPath) {
    try {
        $activeJob = (Get-Content -Path $ActiveJobFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($activeJob) {
            $activeJob = $activeJob.Trim()
        }

        if (-not $activeJob -or $activeJob -notmatch '^PJ-.+') {
            Write-Warning "[STL WATCHER] Invalid or missing active job in '$ActiveJobFile'. Skipping: $fullPath"
            return
        }

        Write-Host "[STL WATCHER] Active job: $activeJob"

        $sharedStlDir = Get-SharedStlDir $activeJob
        Ensure-Directory $sharedStlDir

        $fileName = [System.IO.Path]::GetFileName($fullPath)
        $destinationPath = Get-UniqueDestinationPath -destDir $sharedStlDir -fileName $fileName

        if (-not (Test-Path $fullPath)) {
            if (Test-Path $destinationPath) {
                Write-Host "[STL WATCHER] Source missing but destination exists: $destinationPath"
                MarkProcessedSuccess $fullPath
                return
            }

            Write-Host "[STL WATCHER] File does not exist: $fullPath"
            return
        }

        Write-Host "[STL WATCHER] Preparing to move STL"
        Write-Host "  Source: $fullPath"
        Write-Host "  Target: $destinationPath"
        Write-Host "  Active print job: $activeJob"

        Write-Host "[STL WATCHER] Waiting for file unlock..."
        if (-not (Wait-ForFileReady -path $fullPath -timeoutSeconds 60)) {
            Write-Warning "[STL WATCHER] File not ready after timeout: $fullPath"
            return
        }

        Start-Sleep -Seconds 2

        $maxAttempts = 10
        $attempt = 1
        $moved = $false

        while (-not $moved -and $attempt -le $maxAttempts) {
            try {
                Copy-Item -Path $fullPath -Destination $destinationPath -Force -ErrorAction Stop

                if (Test-Path $destinationPath) {
                    Write-Host "[STL WATCHER] Copied STL to $destinationPath"

                    try {
                        Remove-Item -Path $fullPath -Force -ErrorAction Stop
                        Write-Host "[STL WATCHER] Removed original STL: $fullPath"
                    } catch {
                        Write-Warning "[STL WATCHER] Could not delete original STL (still locked?): $fullPath"
                    }

                    $moved = $true
                    MarkProcessedSuccess $fullPath
                }
            } catch {
                if ($attempt -lt $maxAttempts) {
                    Write-Host "[STL WATCHER] Retry $attempt/$maxAttempts..."
                    Start-Sleep -Milliseconds 1000
                }
                $attempt++
            }
        }

        if (-not $moved) {
            Write-Warning "[STL WATCHER] Failed to move STL after $maxAttempts retries: $fullPath"

            $normalized = Get-NormalizedPath $fullPath

            if (-not $script:FailureCounts.ContainsKey($normalized)) {
                $script:FailureCounts[$normalized] = 0
            }

            $script:FailureCounts[$normalized]++

            if ($script:FailureCounts[$normalized] -ge $script:MaxFailuresBeforeQuarantine) {

                $fileName = [System.IO.Path]::GetFileName($fullPath)
                $quarantinePath = Get-UniqueDestinationPath -destDir $FailedDir -fileName $fileName

                try {
                    Move-Item -Path $fullPath -Destination $quarantinePath -Force -ErrorAction Stop
                    Write-Host "[STL WATCHER] QUARANTINED STL -> $quarantinePath" -ForegroundColor Yellow

                    $script:StlState[$normalized] = 'Quarantined'
                } catch {
                    Write-Warning "[STL WATCHER] Failed to quarantine STL: $($_.Exception.Message)"
                }
            } else {
                Write-Host "[STL WATCHER] Will retry on next cycle ($($script:FailureCounts[$normalized])/$script:MaxFailuresBeforeQuarantine)"
            }
        }
    } catch {
        Write-Warning "[STL WATCHER] Error processing STL '$fullPath': $($_.Exception.Message)"
    }
}

function Start-Watcher {
    Write-Host "[STL WATCHER] Monitoring folder: $WorkDir"
    Write-Host "[STL WATCHER] Active job file: $ActiveJobFile"
    Write-Host "[STL WATCHER] Shared drive root: $SharedRoot"

    if (-not (Test-Path $WorkDir)) {
        Write-Error "Work directory does not exist: $WorkDir"
        exit 1
    }

    Ensure-Directory $OrdersDir
    Ensure-Directory $PrototypeDir
    Ensure-Directory $FailedDir
    Write-Host "[STL WATCHER] Failed STL quarantine folder: $FailedDir"

    if (-not (Test-Path $ActiveJobFile)) {
        Write-Warning "[STL WATCHER] Active job file missing: $ActiveJobFile"
    }

    if (-not (Test-Path $SharedRoot)) {
        Write-Warning "[STL WATCHER] Shared root missing: $SharedRoot"
    }

    Write-ConfigSummary

    $watcher = New-Object System.IO.FileSystemWatcher $OrdersDir, '*.stl'
    $watcher.IncludeSubdirectories = $true
    $watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size, CreationTime'

    $action = {
        $path = $Event.SourceEventArgs.FullPath
        Start-Sleep -Milliseconds 500
        Try-EnqueueStlFile $path
    }

    Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action {
        $path = $Event.SourceEventArgs.FullPath
        Start-Sleep -Milliseconds 500
        Try-EnqueueStlFile $path
    } | Out-Null

    $watcher.EnableRaisingEvents = $true

    Write-Host ""
    Write-Host "[STL WATCHER] === STARTING WATCHER ===" -ForegroundColor Cyan
    Write-Host "[STL WATCHER] Timestamp: $(Get-Date)"
    Write-Host ""
    Write-Host "[STL WATCHER] Monitoring orders folder: $OrdersDir"
    Write-Host "[STL WATCHER] Prototype folder ignored: $PrototypeDir"
    Write-Host "[STL WATCHER] Manual test: drop a real .stl file into $OrdersDir to verify watcher pickup"
    Write-Host "[STL WATCHER] Image browsing may remain on Z:\ for Lithophane Maker"
    Write-Host "[STL WATCHER] Watching for new or renamed .stl files. Press Ctrl+C to exit."

    if (-not $SkipStartupScan) {
        try {
            Get-ChildItem -Path $OrdersDir -Recurse -Filter '*.stl' -File | ForEach-Object {
                Try-EnqueueStlFile $_.FullName
            }
        } catch {
            Write-Warning "[STL WATCHER] Startup scan error: $($_.Exception.Message)"
        }
    } else {
        Write-Host "[STL WATCHER] Skipping startup scan due to -SkipStartupScan"
    }

    $lastReconcile = Get-Date
    while ($true) {
        Process-PendingFiles

        if (((Get-Date) - $lastReconcile).TotalSeconds -ge 25) {
            try {
                Get-ChildItem -Path $OrdersDir -Recurse -Filter '*.stl' -File | ForEach-Object {
                    Try-EnqueueStlFile $_.FullName
                }
            } catch {
                Write-Warning "[STL WATCHER] Reconciliation scan error: $($_.Exception.Message)"
            }

            $lastReconcile = Get-Date
        }

        Start-Sleep -Seconds 2
    }
}

try {
    Start-Watcher
} catch {
    Write-Host ""
    Write-Host "[STL WATCHER] FATAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    Read-Host "Press Enter to exit"
}
