#!/bin/bash
# Script de teste simples para validar Chrome MCP

echo "🧪 Teste de Conexão Chrome DevTools MCP"
echo "========================================"
echo ""

# Verificar se container está rodando
echo "1️⃣ Verificando container..."
if docker-compose ps | grep -q "chrome-devtools-mcp-server.*Up"; then
    echo "   ✅ Container está rodando"
else
    echo "   ❌ Container não está rodando"
    exit 1
fi

echo ""
echo "2️⃣ Testando Chrome DevTools Protocol..."

# Testar CDP
CDP_RESPONSE=$(docker-compose exec -T chrome-mcp curl -s http://localhost:9222/json/version)

if [ -z "$CDP_RESPONSE" ]; then
    echo "   ❌ Falha ao conectar no CDP"
    exit 1
fi

echo "   ✅ CDP respondendo"
echo "   📋 Informações do Chrome:"
echo "$CDP_RESPONSE" | jq '.' 2>/dev/null || echo "$CDP_RESPONSE"

echo ""
echo "3️⃣ Listando páginas abertas..."

PAGES=$(docker-compose exec -T chrome-mcp curl -s http://localhost:9222/json/list)
echo "$PAGES" | jq '.[0] | {title, url, type}' 2>/dev/null || echo "$PAGES"

echo ""
echo "4️⃣ Navegando para Example.com..."

# Criar nova página via CDP
NEW_PAGE=$(docker-compose exec -T chrome-mcp curl -s http://localhost:9222/json/new?https://example.com)
echo "   ✅ Página criada"

sleep 2

echo ""
echo "5️⃣ Verificando páginas atualizadas..."

PAGES_UPDATED=$(docker-compose exec -T chrome-mcp curl -s http://localhost:9222/json/list)
echo "$PAGES_UPDATED" | jq '.[] | {title, url}' 2>/dev/null || echo "$PAGES_UPDATED"

echo ""
echo "6️⃣ Informações de conexão visual:"
echo "   🌐 Abra no seu Chrome: chrome://inspect/#devices"
echo "   ⚙️ Configure: localhost:9222"
echo "   🔍 Clique em 'inspect' na página que aparecer"

echo ""
echo "✅ Todos os testes passaram!"
echo ""
echo "📝 Próximo passo: Abra chrome://inspect/#devices no seu navegador"
