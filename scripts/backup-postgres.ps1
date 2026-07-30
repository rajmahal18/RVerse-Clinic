param(
  [string]$EnvFile = ".env",
  [string]$OutputDir = "backups",
  [int]$Keep = 14
)

$ErrorActionPreference = "Stop"

function Read-EnvValue {
  param([string]$Path, [string]$Name)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match "^\s*$Name\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  $value = $line -replace "^\s*$Name\s*=\s*", ""
  return $value.Trim().Trim('"').Trim("'")
}

$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
  $databaseUrl = Read-EnvValue -Path $EnvFile -Name "DATABASE_URL"
}

if (-not $databaseUrl) {
  throw "DATABASE_URL was not found in the environment or $EnvFile."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump was not found in PATH. Install PostgreSQL client tools on the server."
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDir "clinic-system-$timestamp.dump"

& $pgDump.Source --format=custom --no-owner --no-privileges --file=$backupPath $databaseUrl

Get-ChildItem -LiteralPath $OutputDir -Filter "clinic-system-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  Remove-Item -Force

Write-Host "Backup created: $backupPath"
