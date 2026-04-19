param(
    [Parameter(Mandatory = $true)]
    [string]$PrintJobId
)

$PrintJobId = $PrintJobId.Trim()
if (-not $PrintJobId) {
    Write-Error 'PrintJobId is required and cannot be empty.'
    exit 1
}

if ($PrintJobId -notmatch '^PJ-.+') {
    Write-Error "Invalid PrintJobId '$PrintJobId'. It must start with 'PJ-'."
    exit 1
}

$targetDir = 'C:\HexForge\litho-work'
$targetFile = Join-Path $targetDir 'active-job.txt'

try {
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Set-Content -Path $targetFile -Value $PrintJobId -Encoding UTF8
    Write-Host "Active print job set to '$PrintJobId' in '$targetFile'"
    exit 0
} catch {
    Write-Error "Failed to write active job file: $($_.Exception.Message)"
    exit 1
}
