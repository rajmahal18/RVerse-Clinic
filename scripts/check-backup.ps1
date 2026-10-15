$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("clinic-backup-test-" + [guid]::NewGuid())
$originalDatabase = $env:DATABASE_URL
$originalPgDatabase = $env:PGDATABASE
try {
  New-Item -ItemType Directory -Path $testRoot | Out-Null
  $fakeDump = Join-Path $testRoot 'fake-pg-dump.ps1'
  function Get-Command {
    param($Name, $ErrorAction)
    if ($Name -eq 'pg_dump') { return [pscustomobject]@{ Source = $fakeDump } }
    Microsoft.PowerShell.Core\Get-Command $Name
  }
  $env:DATABASE_URL = 'postgresql://localhost:9/synthetic?schema=public'
  $env:PGDATABASE = 'restore-this-value'
  $output = Join-Path $testRoot 'backups'
  New-Item -ItemType Directory -Path $output | Out-Null
  Set-Content -LiteralPath (Join-Path $output 'clinic-system-20000101-000000.dump') -Value 'synthetic backup'
  foreach ($scenario in @('failure', 'empty', 'success')) {
    $mock = @'
$fileArg = $args | Where-Object { $_ -like '--file=*' }
$file = $fileArg.Substring(7)
if ($env:PGDATABASE -match 'schema=') { throw 'Prisma parameter was not removed' }
'@
    if ($scenario -eq 'failure') { $mock += "`nSet-Content -LiteralPath `$file -Value 'partial'; `$global:LASTEXITCODE = 1" }
    elseif ($scenario -eq 'empty') { $mock += "`n[IO.File]::WriteAllText(`$file, ''); `$global:LASTEXITCODE = 0" }
    else { $mock += "`nSet-Content -LiteralPath `$file -Value 'completed'; `$global:LASTEXITCODE = 0" }
    Set-Content -LiteralPath $fakeDump -Value $mock
    $failed = $false
    try { & "$PSScriptRoot/backup-postgres.ps1" -OutputDir $output -Keep 1 | Out-Null } catch { $failed = $true }
    if ($failed -ne ($scenario -ne 'success')) { throw "Unexpected result: $scenario" }
    $files = @(Get-ChildItem -LiteralPath $output -Filter '*.dump')
    if ($files.Count -ne 1) { throw 'Incorrect retention' }
    if ($scenario -ne 'success' -and $files[0].Name -ne 'clinic-system-20000101-000000.dump') { throw 'Previous backup removed after failure' }
    if (@(Get-ChildItem -LiteralPath $output -Filter '*.partial').Count -ne 0) { throw 'Partial backup retained' }
    if ($env:PGDATABASE -ne 'restore-this-value') { throw 'Environment not restored' }
  }
  Write-Host 'PASS: backup failure, empty output, success, retention, and environment restoration (mock pg_dump; no database).'
} finally {
  $env:DATABASE_URL = $originalDatabase
  $env:PGDATABASE = $originalPgDatabase
  # Only remove this test's explicitly created temporary directory.
  if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}
