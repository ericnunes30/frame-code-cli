# 🚀 Google Chrome Stable + MCP Server - Docker

Esta configuração Docker fornece **Google Chrome Stable** (não Chromium) com o **Chrome DevTools MCP Server** para testes End-to-End orientados por agentes de IA.

---

## 📋 O que está incluído?

- ✅ **Google Chrome Stable** (versão mais recente)
- ✅ **Chrome DevTools MCP Server** (via NPM)
- ✅ **Remote Debugging** habilitado na porta 9222
- ✅ **Servidor MCP HTTP** na porta 8000
- ✅ **Health checks** automáticos
- ✅ **Usuário não-root** para segurança

---

## 🔧 Pré-requisitos

- Docker >= 20.10
- Docker Compose >= 2.0
- 2GB+ de RAM disponível

---

## 🚀 Quick Start

### 1. Build da imagem

```bash
cd docker/chrome-mcp
docker-compose build
```

### 2. Iniciar o servidor

```bash
docker-compose up -d
```

### 3. Verificar status

```bash
# Ver logs
docker-compose logs -f

# Verificar health
docker-compose ps

# Testar Chrome CDP
curl http://localhost:9222/json/version
```

### 4. Conectar do seu Chrome local

Abra no seu navegador:
```
chrome://inspect/#devices
```

Você verá a instância remota do Chrome no container!

---

## 📊 Verificação de Instalação

### Verificar versão do Chrome no container

```bash
docker-compose exec chrome-mcp google-chrome --version
```

**Saída esperada:**
```
Google Chrome 120.0.6099.216  # (ou versão mais recente)
```

### Testar conexão CDP

```bash
curl http://localhost:9222/json/version | jq
```

**Saída esperada:**
```json
{
  "Browser": "Chrome/120.0.6099.216",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...",
  "V8-Version": "12.0.267.8",
  "WebKit-Version": "537.36",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
}
```

---

## 🔌 Integração com frame-code-cli

### Exemplo TypeScript

```typescript
import { ChromeDevToolsMCPClient } from './mcpClient';

const client = new ChromeDevToolsMCPClient('http://localhost:8000/mcp');
await client.connect();

// Navegar
await client.navigatePage('https://example.com');

// Capturar console
const logs = await client.getConsoleLogs();
console.log(logs);

// Screenshot
await client.takeScreenshot('./artifacts/test.png');
```

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

Edite `docker-compose.yml`:

```yaml
environment:
  - CHROME_DEBUG_PORT=9222     # Porta CDP
  - MCP_SERVER_PORT=8000       # Porta MCP
  - DEBUG=true                 # Logs verbosos
  - HEADLESS=true              # Modo headless (sempre true em Docker)
```

### Usar versão Beta/Unstable do Chrome

```bash
# Build com versão beta
docker-compose build --build-arg CHROME_VERSION=beta

# Ou edite Dockerfile:
ARG CHROME_VERSION=unstable
```

### Persistir artefatos de teste

Os screenshots e traces são salvos automaticamente em:
```
./artifacts/
```

---

## 🛡️ Segurança

### ⚠️ NÃO USE EM PRODUÇÃO SEM PROTEÇÃO

A porta 9222 exposta permite **controle total do navegador**. Use apenas em:
- ✅ Desenvolvimento local
- ✅ Redes internas isoladas
- ✅ Containers em CI/CD com acesso restrito

### Restringir acesso à porta 9222

Edite `docker-compose.yml`:

```yaml
ports:
  - "127.0.0.1:9222:9222"  # Apenas localhost
  - "127.0.0.1:8000:8000"  # Apenas localhost
```

---

## 🐛 Troubleshooting

### Chrome não inicia

```bash
# Ver logs detalhados
docker-compose logs chrome-mcp

# Verificar se tem RAM suficiente
docker stats
```

**Solução:** Aumentar `shm_size` no `docker-compose.yml`

### Erro "Failed to move to new namespace"

**Causa:** Falta de permissões SYS_ADMIN

**Solução:** Verificar se `cap_add: SYS_ADMIN` está no docker-compose.yml

### MCP Server não responde

```bash
# Acessar o container
docker-compose exec chrome-mcp bash

# Testar manualmente
curl localhost:9222/json/version
```

---

## 📚 Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f chrome-mcp

# Parar servidor
docker-compose down

# Rebuild completo
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Acessar shell do container
docker-compose exec chrome-mcp bash

# Ver processos no container
docker-compose exec chrome-mcp ps aux

# Verificar uso de memória
docker stats chrome-devtools-mcp-server
```

---

## 🔄 Atualizar Chrome

```bash
# Rebuild para obter versão mais recente
docker-compose build --no-cache --pull
docker-compose up -d
```

---

## 📦 Estrutura de Arquivos

```
docker/chrome-mcp/
├── Dockerfile              # Imagem com Google Chrome Stable
├── entrypoint.sh          # Script de inicialização
├── docker-compose.yml     # Orquestração
├── README.md              # Este arquivo
└── artifacts/             # Screenshots e traces (criado automaticamente)
```

---

## 🆚 Chromium vs Google Chrome

| Característica | Chromium | Google Chrome |
|----------------|----------|---------------|
| Codecs de vídeo | Limitado | Completo (H.264, AAC) |
| Flash Player | ❌ Não | ❌ Não (removido) |
| Auto-update | ❌ Não | ✅ Sim |
| Google branding | ❌ Não | ✅ Sim |
| Crash reporting | ❌ Não | ✅ Sim |
| **Recomendado MCP** | ⚠️ OK | ✅ **Sim** |

**Este Dockerfile usa Google Chrome Stable!** ✅

---

## 📖 Documentação Relacionada

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Puppeteer Docs](https://pptr.dev/)
- [Plano de Integração](../../PLANO_INTEGRACAO_CHROME_DEVTOOLS_MCP.md)

---

## ✅ Status

- [x] Google Chrome Stable instalado
- [x] Remote debugging habilitado
- [x] Servidor MCP configurado
- [x] Health checks implementados
- [x] Segurança (usuário não-root)
- [x] Docker Compose pronto
- [ ] Testes E2E implementados (próxima fase)

---

**Criado para:** `frame-code-cli`  
**Data:** 2025-11-27  
**Versão:** 1.0.0
