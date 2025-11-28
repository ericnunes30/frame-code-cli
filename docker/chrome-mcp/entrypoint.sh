#!/bin/bash
# ========================================
# Entrypoint para Google Chrome + MCP Server
# ========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ========================================
# Verificar Google Chrome
# ========================================
log_info "Verificando instalação do Google Chrome..."
CHROME_VERSION=$(google-chrome --version)
log_success "Google Chrome detectado: ${CHROME_VERSION}"

# ========================================
# Configurar variáveis
# ========================================
CHROME_DEBUG_PORT=${CHROME_DEBUG_PORT:-9222}
CHROME_INTERNAL_PORT=9223
MCP_SERVER_PORT=${MCP_SERVER_PORT:-8000}
MODE=${1:-http}  # http ou stdio

log_info "Configuração:"
log_info "  - Porta Pública (Exposta): ${CHROME_DEBUG_PORT}"
log_info "  - Porta Interna (Chrome): ${CHROME_INTERNAL_PORT}"
log_info "  - Porta Servidor MCP: ${MCP_SERVER_PORT}"
log_info "  - Modo de Transporte: ${MODE}"

# ========================================
# Iniciar Proxy Socat (Port Forwarding)
# ========================================
log_info "Iniciando proxy socat (0.0.0.0:${CHROME_DEBUG_PORT} -> 127.0.0.1:${CHROME_INTERNAL_PORT})..."
socat TCP-LISTEN:${CHROME_DEBUG_PORT},fork,bind=0.0.0.0 TCP:127.0.0.1:${CHROME_INTERNAL_PORT} &
SOCAT_PID=$!

# ========================================
# Iniciar Google Chrome em modo headless
# ========================================
log_info "Iniciando Google Chrome em modo headless na porta interna ${CHROME_INTERNAL_PORT}..."

google-chrome \
    --headless=new \
    --no-sandbox \
    --disable-setuid-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --disable-extensions \
    --no-first-run \
    --no-default-browser-check \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port=${CHROME_INTERNAL_PORT} \
    --user-data-dir=/tmp/chrome-profile \
    --window-size=1920,1080 \
    --hide-scrollbars \
    --mute-audio \
    about:blank &

CHROME_PID=$!
log_success "Chrome iniciado com PID: ${CHROME_PID}"

# ========================================
# Aguardar Chrome estar pronto
# ========================================
log_info "Aguardando Chrome ficar pronto..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Verifica na porta interna primeiro
    if curl -s http://127.0.0.1:${CHROME_INTERNAL_PORT}/json/version > /dev/null 2>&1; then
        log_success "Chrome está respondendo internamente na porta ${CHROME_INTERNAL_PORT}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_info "Tentativa ${RETRY_COUNT}/${MAX_RETRIES}..."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Timeout: Chrome não respondeu após ${MAX_RETRIES} segundos"
    exit 1
fi

# ========================================
# Exibir informações de conexão CDP
# ========================================
log_info "Obtendo informações do Chrome DevTools Protocol (via Proxy)..."
CDP_INFO=$(curl -s http://localhost:${CHROME_DEBUG_PORT}/json/version)
echo -e "${GREEN}${CDP_INFO}${NC}"

# ========================================
# Iniciar Servidor MCP
# ========================================
log_info "Iniciando Servidor Chrome DevTools MCP..."

if [ "$MODE" = "http" ]; then
    log_info "Modo HTTP+SSE - Servidor acessível em http://0.0.0.0:${MCP_SERVER_PORT}"
    
    # Nota: O comando exato pode variar dependendo da versão do chrome-devtools-mcp
    # Ajuste conforme documentação oficial
    chrome-devtools-mcp start \
        --port ${MCP_SERVER_PORT} \
        --host 0.0.0.0 \
        --chrome-port ${CHROME_INTERNAL_PORT} || {
        
        log_warning "Comando HTTP não suportado, tentando modo padrão..."
        chrome-devtools-mcp start
    }
    
elif [ "$MODE" = "stdio" ]; then
    log_info "Modo STDIO - Comunicação via entrada/saída padrão"
    chrome-devtools-mcp start
    
else
    log_error "Modo desconhecido: ${MODE}. Use 'http' ou 'stdio'"
    exit 1
fi

# ========================================
# Função de limpeza ao encerrar
# ========================================
cleanup() {
    log_warning "Encerrando serviços..."
    kill $CHROME_PID 2>/dev/null || true
    kill $SOCAT_PID 2>/dev/null || true
    log_success "Container encerrado"
}

trap cleanup SIGTERM SIGINT

# ========================================
# Manter container ativo
# ========================================
log_success "✅ Servidor MCP e Chrome prontos!"
log_info "Conexões disponíveis:"
log_info "  - Chrome DevTools Protocol: http://localhost:${CHROME_DEBUG_PORT}"
log_info "  - Servidor MCP: http://localhost:${MCP_SERVER_PORT}"
log_info ""
log_info "Para debugar no seu Chrome local, acesse: chrome://inspect/#devices"
log_info ""

wait
