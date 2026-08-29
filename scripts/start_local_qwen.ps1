[CmdletBinding()]
param(
    [string]$InstallRoot = 'D:\TikTok-TechJam\local-ai',
    [ValidateRange(1024, 65535)]
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$serverPath = Join-Path $InstallRoot 'llama.cpp\b10621\llama-server.exe'
$modelPath = Join-Path $InstallRoot 'models\Qwen3-8B-Q4_K_M.gguf'
$runRoot = Join-Path $InstallRoot 'run'
$pidPath = Join-Path $runRoot 'llama-server.pid'
$stdoutPath = Join-Path $runRoot 'llama-server.stdout.log'
$stderrPath = Join-Path $runRoot 'llama-server.stderr.log'

foreach ($path in @($serverPath, $modelPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "缺少文件，请先运行 install_local_qwen.ps1：$path"
    }
}

New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

if (Test-Path -LiteralPath $pidPath) {
    $existingPid = [int](Get-Content -Raw -LiteralPath $pidPath)
    $existing = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existing -and $existing.Path -eq $serverPath) {
        Write-Host "千问服务已经运行，PID：$existingPid"
        exit 0
    }
}

$nativeArgs = @(
    '--model', $modelPath
    '--alias', 'qwen3-8b'
    '--host', '127.0.0.1'
    '--port', $Port.ToString()
    '--ctx-size', '8192'
    '--n-gpu-layers', 'all'
    '--parallel', '1'
    '--jinja'
    '--reasoning', 'off'
)

$process = Start-Process `
    -FilePath $serverPath `
    -ArgumentList $nativeArgs `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden `
    -PassThru

Set-Content -LiteralPath $pidPath -Value $process.Id -Encoding ascii
Write-Host "已启动千问服务，PID：$($process.Id)"
Write-Host "地址：http://127.0.0.1:$Port/v1"
Write-Host "日志：$stderrPath"
