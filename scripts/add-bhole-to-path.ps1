# Add bhole to PATH for the current user (persistent)
# Run from repo root: pnpm install && pnpm build --filter=blackhole && ./scripts/add-bhole-to-path.ps1
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$bholeCmd = Join-Path $repoRoot "bhole.cmd"
if (-not (Test-Path $bholeCmd)) {
  Write-Host "bhole.cmd not found. Run from repo root."
  exit 1
}
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$repoRoot*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$repoRoot", "User")
  Write-Host "Added repo root to PATH. Close ALL terminals and Cursor, reopen, then run: bhole --help"
} else {
  Write-Host "Repo root already in PATH. Try closing Cursor completely and reopening."
}
