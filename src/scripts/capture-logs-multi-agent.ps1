$logFile = "server.log"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$header = "=== New session - $(Get-Date) ==="
Write-Host "Starting capture in: $logFile"
Write-Host "Command: $(if ($args.Count -eq 0) { 'npm run dev -- multi-agent ""Analise a imagem em ./4V4A0668.JPG""' } else { $args -join ' ' })"
Write-Host "Stop with: Ctrl+C"
Write-Host ""

$env:NODE_OPTIONS = "--no-warnings"
$env:NODE_ENV = "development"
$env:FORCE_COLOR = "0"
$env:DEBUG = "true"

# Limpar log anterior
$header | Out-File -FilePath $logFile -Encoding UTF8

# Executar comando e capturar saída
if ($args.Count -eq 0) {
    $cmd = 'npm run dev -- multi-agent "Analise a imagem em G:\novosApps\agentes_test\frame-code-cli\a490b9398a.webp"'
} else {
    $raw = ($args -join ' ').Trim()
    if ($raw -like 'npm *') {
        $cmd = $raw
    } else {
        $cmd = "npm run dev -- multi-agent `"$raw`""
    }
}

Write-Host "Running: $cmd"
Write-Host ""

# Executar e redirecionar TUDO para o arquivo E para console
Invoke-Expression $cmd 2>&1 | Tee-Object -FilePath $logFile -Append

Write-Host ""
Write-Host "=== Capture finished ==="
Write-Host "Log saved in: $logFile"

# Estatísticas
$lineCount = 0
if (Test-Path $logFile) {
    $lineCount = (Get-Content -Path $logFile | Measure-Object -Line).Lines
}
Write-Host "Total lines in log: $lineCount"

Write-Host ""
Write-Host "=== QUICK STATS ==="
if (Test-Path $logFile) {
    $content = Get-Content -Path $logFile -Raw
    Write-Host "Lines with 'Action:': $(@($content -split 'Action:').Count - 1)"
    Write-Host "Lines with 'Thought:': $(@($content -split 'Thought:').Count - 1)"
    Write-Host "Lines with 'tool_detected': $(@($content -split 'tool_detected').Count - 1)"
    Write-Host "Lines with 'ERRO': $(@($content -split 'ERRO').Count - 1)"
}

Write-Host ""
Write-Host "Last 30 lines of log:"
Get-Content -Path $logFile -Tail 30
