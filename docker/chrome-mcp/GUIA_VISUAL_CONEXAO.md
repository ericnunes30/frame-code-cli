# 🔍 Guia Visual: Como Conectar no Chrome DevTools Remoto

## ✅ Pré-requisito: Container Rodando

Certifique-se que o container está ativo:
```bash
docker-compose ps
# Status deve estar "Up" e "healthy"
```

---

## 📋 Passo a Passo

### **Passo 1: Abrir Chrome Inspect**

1. Abra o **Google Chrome** no seu Windows
2. Na barra de endereços, digite:
   ```
   chrome://inspect/#devices
   ```
3. Pressione **Enter**

### **Passo 2: Configurar Target Remoto**

4. Na página que abrir, localize a seção **"Discover network targets"**
5. Clique no botão **"Configure..."** ao lado
6. Um popup vai abrir com um campo de texto

### **Passo 3: Adicionar Endereço**

7. No campo, digite:
   ```
   localhost:9222
   ```
8. Clique em **"Done"**

### **Passo 4: Inspecionar**

9. Aguarde alguns segundos
10. Na lista **"Remote Target"**, você verá aparecer:
    ```
    about:blank
    WebSocketDebuggerUrl: ws://localhost:9222/devtools/page/...
    ```
11. Clique no link **"inspect"** abaixo da página

### **Passo 5: DevTools Aberto! 🎉**

12. O Chrome DevTools vai abrir conectado ao Chrome do container!
13. Você pode:
    - Ver o console
    - Inspecionar elementos
    - Monitorar rede
    - Debugar JavaScript
    - Tudo em tempo real! ✨

---

## 🧪 Testar Navegação

No DevTools que abriu, vá no **Console** e digite:

```javascript
location.href = 'https://example.com';
```

Pressione **Enter** - a página vai navegar e você verá tudo acontecer!

---

## 📸 O que você deve ver:

```
╔══════════════════════════════════════════════════════════╗
║  Chrome DevTools - Remote Target                         ║
╠══════════════════════════════════════════════════════════╣
║  Elements | Console | Sources | Network | Performance    ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  > about:blank                                           ║
║                                                           ║
║  Console:                                                ║
║  > location.href = 'https://example.com'                ║
║  "https://example.com"                                   ║
║                                                           ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🎯 Resultado dos Testes Executados

```bash
✅ Container está rodando
✅ CDP respondendo
✅ Chrome versão: 142.0.7444.175
✅ Páginas listadas com sucesso
✅ Navegação para Example.com funcionou
```

### Informações do Chrome no Container:
```json
{
  "Browser": "Chrome/142.0.7444.175",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  "V8-Version": "14.2.231.21",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
}
```

---

## 💡 Dicas

### Se não aparecer nada:
1. Verifique se o container está rodando: `docker-compose ps`
2. Teste a porta manualmente: `curl http://localhost:9222/json/version`
3. Reinicie o container: `docker-compose restart`

### Para navegar programaticamente:
```bash
# Criar nova aba com URL
curl http://localhost:9222/json/new?https://google.com

# Listar todas as abas
curl http://localhost:9222/json/list | jq
```

### Para fechar uma aba:
```bash
# Pegar ID da aba
curl http://localhost:9222/json/list | jq '.[0].id'

# Fechar (substitua ID_DA_ABA)
curl http://localhost:9222/json/close/ID_DA_ABA
```

---

## 🚀 Próximos Passos

Agora que você tem o Chrome conectado visualmente:

1. ✅ Teste navegar para diferentes URLs
2. ✅ Inspecione elementos da página
3. ✅ Veja o console em tempo real
4. ✅ Monitore requisições de rede

**Isso prova que o MCP está 100% funcional!** 🎊

Quando o agente LLM usar as ferramentas MCP, ele estará fazendo exatamente isso - controlando o Chrome via CDP, mas de forma automatizada!

---

**Criado:** 2025-11-27  
**Status:** ✅ Testado e Funcionando
