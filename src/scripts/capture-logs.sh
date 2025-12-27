#!/bin/bash

# Script MEGA ROBUSTO para capturar toda a saída do codecritic
# Uso: ./capture-logs.sh
#      ou passe um comando personalizado: ./capture-logs.sh "comando"

# Arquivo de log
LOG_FILE="server.log"

# Comando padrão: Chrome MCP Agent no modo autônomo
DEFAULT_CMD='npm run autonomous -- "navegue para https://z.ai/subscribe e me diga o conteudo da pagina"'

# Usar comando passado ou o padrão
CMD="${1:-$DEFAULT_CMD}"

# Limpar log anterior
echo "=== Nova sessão - $(date) ===" > "$LOG_FILE"

echo "Iniciando captura MEGA ROBUSTA em: $LOG_FILE"
echo "Comando: $CMD"
echo "Para parar: Ctrl+C"
echo ""

# Configurar variáveis de ambiente para desabilitar buffering
export NODE_OPTIONS="--no-warnings"
export NODE_ENV=development
export FORCE_COLOR=1
export DEBUG="*"
export DEBUG=true

# Função para executar comando com captura máxima
execute_with_max_capture() {
    local cmd="$1"
    echo "Executando: $cmd"

    # Método 1: Usar stdbuf para desabilitar buffering
    if command -v stdbuf >/dev/null 2>&1; then
        echo "Usando stdbuf para desabilitar buffering..."
        stdbuf -oL -eL bash -c "$cmd" 2>&1 | tee -a "$LOG_FILE"
        return
    fi

    # Método 2: Usar winpty se disponível (melhor para Windows)
    if command -v winpty >/dev/null 2>&1; then
        echo "Usando winpty para melhor compatibilidade Windows..."
        winpty bash -c "$cmd" 2>&1 | tee -a "$LOG_FILE"
        return
    fi

    # Método 3: Redirecionamento simples com configurações extras
    echo "Usando redirecionamento simples com configurações..."
    bash -c "$cmd" 2>&1 | tee -a "$LOG_FILE"
}

# Executar o comando
execute_with_max_capture "$CMD"

echo ""
echo "=== Captura finalizada ==="
echo "Log salvo em: $LOG_FILE"

# Verificar quantos outputs LLM foram capturados
llm_count=$(grep -c "PROMPT COMPLETO ANTES DA CHAMADA AO LLM" "$LOG_FILE" 2>/dev/null || echo "0")
echo "Outputs LLM detectados: $llm_count"

# Mostrar últimas linhas para verificar
echo ""
echo "Últimas 20 linhas do log:"
tail -20 "$LOG_FILE"

# Verificar se o arquivo está completo
file_size=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
echo ""
echo "Total de linhas no log: $file_size"

# Mostrar estatísticas detalhadas
echo ""
echo "=== ESTATÍSTICAS DETALHADAS ==="
echo "Linhas com 'Generator raw:': $(grep -c 'Generator raw:' "$LOG_FILE" 2>/dev/null || echo "0")"
echo "Linhas com 'Critic raw:': $(grep -c 'Critic raw:' "$LOG_FILE" 2>/dev/null || echo "0")"
echo "Linhas com 'PROMPT COMPLETO': $(grep -c 'PROMPT COMPLETO' "$LOG_FILE" 2>/dev/null || echo "0")"
echo "Linhas com 'Action:': $(grep -c 'Action:' "$LOG_FILE" 2>/dev/null || echo "0")"
echo "Linhas com 'Thought:': $(grep -c 'Thought:' "$LOG_FILE" 2>/dev/null || echo "0")"