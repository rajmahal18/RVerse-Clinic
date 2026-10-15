param(
  [string]$EnvFile = ".env",
  [string]$OutputDir = "backups",
  [ValidateRange(1, 3650)]
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
# Prisma-only query options are not accepted by PostgreSQL client tools.
$databaseUrl = $databaseUrl -replace '([?&])(schema|connection_limit|pool_timeout|pgbouncer|sslaccept)=[^&]*', '$1'
$databaseUrl = $databaseUrl -replace '\?&+', '?' -replace '&{2,}', '&' -replace '[?&]$', ''

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump was not found in PATH. Install PostgreSQL client tools on the server."
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fffffff"
$backupPath = Join-Path $OutputDir "clinic-system-$timestamp.dump"
$partialPath = "$backupPath.partial"

# Avoid credentials in the process command line and suppress raw tool diagnostics.
$previousDatabase = $env:PGDATABASE
try {
  $env:PGDATABASE = $databaseUrl
  & $pgDump.Source --no-password --format=custom --no-owner --no-privileges --file=$partialPath 2>$null
  if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $partialPath) -or (Get-Item -LiteralPath $partialPath).Length -eq 0) {
    throw "Backup generation failed. Previous backups were retained. Check database access, client compatibility, and storage permissions."
  }
  Move-Item -LiteralPath $partialPath -Destination $backupPath
} catch {
  if (Test-Path -LiteralPath $partialPath) { Remove-Item -LiteralPath $partialPath -Force }
  throw "Backup generation failed. Previous backups were retained. Check database access, client compatibility, and storage permissions."
} finally {
  $env:PGDATABASE = $previousDatabase
}

Get-ChildItem -LiteralPath $OutputDir -Filter "clinic-system-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  Remove-Item -Force

Write-Host "Backup created: $backupPath"
