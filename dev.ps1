param([switch]$Static)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies'
if (Test-Path (Join-Path $runtimeRoot 'node/bin/node.exe')) {
    $env:PATH = (Join-Path $runtimeRoot 'node/bin') + ';' + $env:PATH
}
$env:PATH = (Join-Path $PSScriptRoot '.demo/yarn/package/bin') + ';' + $env:PATH
New-Item -ItemType Directory -Force '.demo/tmp' | Out-Null
$env:TEMP = Join-Path $PSScriptRoot '.demo/tmp'
$env:TMP = $env:TEMP
$env:PYTHONUTF8 = '1'
$demoPython = Join-Path $PSScriptRoot '.demo/venv/Scripts/python.exe'
if (!(Test-Path $demoPython)) {
    throw 'Prepare primeiro o ambiente Python local em .demo/venv.'
}
$demoArgs = @('scripts/demo.py')
if (!$Static) { $demoArgs += '--dev' }
& $demoPython @demoArgs
exit $LASTEXITCODE
