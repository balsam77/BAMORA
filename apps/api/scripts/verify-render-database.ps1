param(
    [string]$CaFile = (Join-Path $env:USERPROFILE 'Downloads\prod-ca-2021.crt')
)

$ErrorActionPreference = 'Stop'
$secret = $null
$plain = $null
$payload = $null
$pointer = [IntPtr]::Zero
$process = $null
$exitCode = 1
try {
    if (-not (Test-Path -LiteralPath $CaFile -PathType Leaf)) {
        throw 'Official CA file not found. Supply its absolute path with -CaFile.'
    }
    $certificatePath = (Resolve-Path -LiteralPath $CaFile).Path
    $script = Join-Path $PSScriptRoot 'verify-render-database.cjs'
    $secret = Read-Host 'Paste DATABASE_URL copied from Render (hidden input; never paste it into chat)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $payload = @{ databaseUrl = $plain; caFile = $certificatePath } | ConvertTo-Json -Compress
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = (Get-Command node -CommandType Application).Source
    $start.Arguments = '"' + $script + '"'
    $start.WorkingDirectory = (Split-Path $PSScriptRoot -Parent)
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $start
    [void]$process.Start()
    $process.StandardInput.WriteLine($payload)
    $process.StandardInput.Close()
    $payload = $null
    $plain = $null
    $outputTask = $process.StandardOutput.ReadToEndAsync()
    $errorTask = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(45000)) {
        Stop-Process -Id $process.Id -Force
        throw 'Verification timed out; no migration was executed.'
    }
    $output = $outputTask.Result
    $errors = $errorTask.Result
    if ($output) { Write-Output $output }
    if ($errors) { Write-Output $errors }
    $exitCode = $process.ExitCode
} catch {
    Write-Output 'Local verification could not complete. Check the CA path, Node installation and diagnostic build files. No migration was executed.'
} finally {
    $plain = $null
    $payload = $null
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($secret) { $secret.Dispose() }
    if ($process) { $process.Dispose() }
}
exit $exitCode
