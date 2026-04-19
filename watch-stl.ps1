param(
    [string]$WorkDir = 'C:\HexForge\litho-work',
    [string]$ActiveJobFile = 'Z:\active-job.txt',
    [string]$SharedRoot = 'Z:\'
)

function Get-ActivePrintJobId {
    if (-not (Test-Path $ActiveJobFile)) {
        return $null
    }

    $jobId = Get-Content -Path $ActiveJobFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $jobId) { return $null }

    $jobId = $jobId.Trim()
    if ($jobId -match '^PJ-.+') {
        return $jobId
    }

    return $null
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

function Wait-ForFileReady($path, $timeoutSeconds = 30) {
    $endTime = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $endTime) {
        try {
            $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
            if ($stream) {
                $stream.Dispose()
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

function Process-StlFile($fullPath) {
    if (-not (Test-Path $fullPath)) {
        Write-Host "[STL WATCHER] File does not exist: $fullPath"
        return
    }

    $printJobId = Get-ActivePrintJobId
    if (-not $printJobId) {
        Write-Host "[STL WATCHER] No valid active print job ID found in '$ActiveJobFile'. Skipping: $fullPath"
        return
    }

    $sharedStlDir = Get-SharedStlDir $printJobId
    Ensure-Directory $sharedStlDir

    $fileName = [System.IO.Path]::GetFileName($fullPath)
    $destinationPath = Get-UniqueDestinationPath -destDir $sharedStlDir -fileName $fileName

    Write-Host "[STL WATCHER] Preparing to move STL"
    Write-Host "  Source: $fullPath"
    Write-Host "  Target: $destinationPath"
    Write-Host "  Active print job: $printJobId"

    if (-not (Wait-ForFileReady -path $fullPath -timeoutSeconds 30)) {
        Write-Warning "[STL WATCHER] File is not ready for move after waiting: $fullPath"
        return
    }

    try {
        Move-Item -Path $fullPath -Destination $destinationPath -Force
        Write-Host "[STL WATCHER] Moved STL to $destinationPath"
    } catch {
        Write-Error "[STL WATCHER] Failed to move STL '$fullPath' to '$destinationPath': $($_.Exception.Message)"
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

    $watcher = New-Object System.IO.FileSystemWatcher $WorkDir, '*.stl'
    $watcher.IncludeSubdirectories = $true
    $watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size, CreationTime'

    $action = {
        $path = $Event.SourceEventArgs.FullPath
        Start-Sleep -Milliseconds 500
        Process-StlFile -fullPath $path
    }

    Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action {
        $path = $Event.SourceEventArgs.FullPath
        Start-Sleep -Milliseconds 500
        Process-StlFile -fullPath $path
    } | Out-Null

    $watcher.EnableRaisingEvents = $true

    Write-Host "[STL WATCHER] Watching for new or changed .stl files. Press Ctrl+C to exit."

    Get-ChildItem -Path $WorkDir -Recurse -Filter '*.stl' -File | ForEach-Object {
        Process-StlFile -fullPath $_.FullName
    }

    while ($true) {
        Start-Sleep -Seconds 1
    }
}

Start-Watcher
