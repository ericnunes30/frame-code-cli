$logFile = "server.log"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$header = "=== New session - $(Get-Date) ==="
for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
        Set-Content -Path $logFile -Value $header -Encoding UTF8
        break
    } catch {
        if ($attempt -eq 4) { throw }
        Start-Sleep -Seconds 1
    }
}

Write-Host "Starting capture in: $logFile"
Write-Host "Command: $(if ($args.Count -eq 0) { 'npm run dev -- multi-agent ""Descreva a tarefa""' } else { $args -join ' ' })"
Write-Host "Stop with: Ctrl+C"
Write-Host ""

$env:NODE_OPTIONS = "--no-warnings"
$env:NODE_ENV = "development"
$env:FORCE_COLOR = "1"
$env:DEBUG = "*"
$env:DEBUG = "true"

function Invoke-WithCapture {
    param([string]$Command)

    Write-Host "Running: $Command"

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $writer = [System.IO.StreamWriter]::new($logFile, $true, $utf8NoBom)
    try {
        cmd /c "chcp 65001 >nul & $Command" 2>&1 | ForEach-Object {
            $_
            $writer.WriteLine($_)
            $writer.Flush()
        }
    } finally {
        $writer.Dispose()
    }
}

if ($args.Count -eq 0) {
    Invoke-WithCapture 'npm run dev -- multi-agent "crie um projeto todoist simples em express-app que ainda nao existe"'
} else {
    $raw = ($args -join ' ').Trim()
    if ($raw -like 'npm *') {
        Invoke-WithCapture $raw
    } else {
        Invoke-WithCapture ("npm run dev -- multi-agent ""{0}""" -f $raw)
    }
}

Write-Host ""
Write-Host "=== Capture finished ==="
Write-Host "Log saved in: $logFile"

$llmCount = 0
if (Test-Path $logFile) {
    $llmCount = (Select-String -Path $logFile -Pattern "PROMPT COMPLETO ANTES DA CHAMADA AO LLM" -AllMatches | Measure-Object).Count
}
Write-Host "LLM outputs detected: $llmCount"

Write-Host ""
Write-Host "Last 20 lines of log:"
Get-Content -Path $logFile -Tail 20

$lineCount = 0
if (Test-Path $logFile) {
    $lineCount = (Get-Content -Path $logFile | Measure-Object -Line).Lines
}
Write-Host ""
Write-Host "Total lines in log: $lineCount"

Write-Host ""
Write-Host "=== DETAILED STATS ==="
Write-Host "Lines with 'Generator raw:': $((Select-String -Path $logFile -Pattern 'Generator raw:' -AllMatches | Measure-Object).Count)"
Write-Host "Lines with 'Critic raw:': $((Select-String -Path $logFile -Pattern 'Critic raw:' -AllMatches | Measure-Object).Count)"
Write-Host "Lines with 'PROMPT COMPLETO': $((Select-String -Path $logFile -Pattern 'PROMPT COMPLETO' -AllMatches | Measure-Object).Count)"
Write-Host "Lines with 'Action:': $((Select-String -Path $logFile -Pattern 'Action:' -AllMatches | Measure-Object).Count)"
Write-Host "Lines with 'Thought:': $((Select-String -Path $logFile -Pattern 'Thought:' -AllMatches | Measure-Object).Count)"
