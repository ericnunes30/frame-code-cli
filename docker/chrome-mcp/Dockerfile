# ========================================
# Dockerfile: Google Chrome Stable + MCP Server
# Para uso com Chrome DevTools MCP Protocol
# ========================================

FROM node:20-bookworm-slim

# Metadados
LABEL maintainer="frame-code-cli"
LABEL description="Google Chrome Stable com Servidor MCP para testes E2E orientados por agentes"
LABEL chrome.version="stable"

# Argumentos de build
ARG CHROME_VERSION=stable
ARG DEBIAN_FRONTEND=noninteractive

# ========================================
# Instalar dependências do Google Chrome
# ========================================
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    curl \
    socat \
    --no-install-recommends

# ========================================
# Instalar Google Chrome Stable
# ========================================
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-${CHROME_VERSION} \
    && rm -rf /var/lib/apt/lists/*

# Verificar instalação do Chrome
RUN google-chrome --version

# ========================================
# Configurar Puppeteer
# ========================================
# Prevenir download automático do Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Apontar para o Chrome instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# ========================================
# Instalar Servidor Chrome DevTools MCP
# ========================================
RUN npm install -g chrome-devtools-mcp

# Verificar instalação
RUN chrome-devtools-mcp --version || echo "MCP Server instalado"

# ========================================
# Configurar usuário não-root
# ========================================
# Por segurança, não executar Chrome como root
RUN groupadd -r chrome && useradd -r -g chrome -G audio,video chrome \
    && mkdir -p /home/chrome/Downloads /app \
    && chown -R chrome:chrome /home/chrome \
    && chown -R chrome:chrome /app

# ========================================
# Variáveis de Ambiente
# ========================================
ENV CHROME_DEBUG_PORT=9222
ENV MCP_SERVER_PORT=8000
ENV HOME=/home/chrome
ENV DISPLAY=:99

# ========================================
# Diretório de trabalho
# ========================================
WORKDIR /app

# Criar diretório para artefatos de teste
RUN mkdir -p /app/artifacts && chown chrome:chrome /app/artifacts

# ========================================
# Copiar script de inicialização
# ========================================
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ========================================
# Expor portas
# ========================================
EXPOSE ${CHROME_DEBUG_PORT}
EXPOSE ${MCP_SERVER_PORT}

# ========================================
# Mudar para usuário não-root
# ========================================
USER chrome

# ========================================
# Health Check
# ========================================
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${CHROME_DEBUG_PORT}/json/version || exit 1

# ========================================
# Entrypoint
# ========================================
ENTRYPOINT ["/entrypoint.sh"]
CMD ["http"]  # ou "stdio" para modo local
