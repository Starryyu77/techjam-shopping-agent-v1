[CmdletBinding()]
param(
    [string]$InstallRoot = 'D:\TikTok-TechJam\local-ai'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$serverPath = Join-Path $InstallRoot 'llama.cpp\b10621\llama-server.exe'
$pidPath = Join-Path $InstallRoot 'run\llama-server.pid'
if (-not (Test-Path -LiteralPath $pidPath)) {
    Write-Host '没有记录到正在运行的千问服务。'
    exit 0
}

$serverPid = [int](Get-Content -Raw -LiteralPath $pidPath)
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
if ($process) {
    if ($process.Path -ne $serverPath) {
        throw "PID 指向的不是本项目 llama-server，拒绝停止：$serverPid"
    }
    Stop-Process -Id $serverPid
    Wait-Process -Id $serverPid -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $pidPath -Force
Write-Host '千问服务已停止。'
