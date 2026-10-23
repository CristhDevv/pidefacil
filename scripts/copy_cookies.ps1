$src = 'C:\Users\USER\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies'
$dst = 'tmp_cookies.sqlite'
$in = [System.IO.File]::Open($src, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
$out = [System.IO.File]::Create($dst)
$in.CopyTo($out)
$in.Close()
$out.Close()
Write-Host "Cookies copied successfully!"
