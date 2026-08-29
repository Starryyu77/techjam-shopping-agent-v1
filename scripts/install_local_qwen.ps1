[CmdletBinding()]
param(
    [string]$InstallRoot = 'D:\TikTok-TechJam\local-ai'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$runtimeVersion = 'b10621'
$runtimeRoot = Join-Path $InstallRoot "llama.cpp\$runtimeVersion"
$modelRoot = Join-Path $InstallRoot 'models'
$downloadRoot = Join-Path $InstallRoot 'downloads'
$modelPath = Join-Path $modelRoot 'Qwen3-8B-Q4_K_M.gguf'

$artifacts = @(
    [PSCustomObject]@{
        Name = 'llama.cpp CUDA 12.4 runtime'
        Uri = "https://github.com/ggml-org/llama.cpp/releases/download/$runtimeVersion/llama-$runtimeVersion-bin-win-cuda-12.4-x64.zip"
        Path = Join-Path $downloadRoot "llama-$runtimeVersion-bin-win-cuda-12.4-x64.zip"
        Sha256 = '81c2ff62e14b549cd5c766ccdd5c61f09e821a171655c3047bdccfddc2d1a1e2'
    },
    [PSCustomObject]@{
        Name = 'CUDA 12.4 runtime DLLs'
        Uri = "https://github.com/ggml-org/llama.cpp/releases/download/$runtimeVersion/cudart-llama-bin-win-cuda-12.4-x64.zip"
        Path = Join-Path $downloadRoot 'cudart-llama-bin-win-cuda-12.4-x64.zip'
        Sha256 = '8c79a9b226de4b3cacfd1f83d24f962d0773be79f1e7b75c6af4ded7e32ae1d6'
    },
    [PSCustomObject]@{
        Name = 'Qwen3-8B Q4_K_M GGUF'
        Uri = 'https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf?download=true'
        Path = $modelPath
        Sha256 = 'd98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785'
    }
)

foreach ($path in @($InstallRoot, $runtimeRoot, $modelRoot, $downloadRoot)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
}

$curl = (Get-Command curl.exe -ErrorAction Stop).Source

foreach ($artifact in $artifacts) {
    if (Test-Path -LiteralPath $artifact.Path) {
        $existingHash = (Get-FileHash -LiteralPath $artifact.Path -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($existingHash -eq $artifact.Sha256) {
            Write-Host "已校验，跳过下载：$($artifact.Name)"
            continue
        }
        throw "现有文件校验失败，请人工检查后删除或改名：$($artifact.Path)"
    }

    $partialPath = "$($artifact.Path).part"
    Write-Host "正在下载：$($artifact.Name)"
    $nativeArgs = @(
        '--location'
        '--fail'
        '--retry'
        '3'
        '--retry-delay'
        '2'
        '--continue-at'
        '-'
        '--output'
        $partialPath
        $artifact.Uri
    )
    & $curl @nativeArgs
    $curlExit = $LASTEXITCODE
    if ($curlExit -ne 0) {
        throw "curl 下载失败，退出码：$curlExit"
    }

    $actualHash = (Get-FileHash -LiteralPath $partialPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $artifact.Sha256) {
        throw "SHA-256 校验失败：$($artifact.Name)"
    }
    Move-Item -LiteralPath $partialPath -Destination $artifact.Path
    Write-Host "下载并校验完成：$($artifact.Name)"
}

$runtimeZip = $artifacts[0].Path
$cudaZip = $artifacts[1].Path
Expand-Archive -LiteralPath $runtimeZip -DestinationPath $runtimeRoot -Force
Expand-Archive -LiteralPath $cudaZip -DestinationPath $runtimeRoot -Force

$serverPath = Join-Path $runtimeRoot 'llama-server.exe'
if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
    throw "安装后未找到 llama-server.exe：$serverPath"
}

$nativeArgs = @('--version')
& $serverPath @nativeArgs
if ($LASTEXITCODE -ne 0) {
    throw "llama-server --version 失败，退出码：$LASTEXITCODE"
}

Write-Host "安装完成。"
Write-Host "运行时：$serverPath"
Write-Host "模型：$modelPath"
