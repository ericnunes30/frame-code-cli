# ⚡ Fase 2: Processos e Stats

## 🎯 Objetivo
Integrar a TUI com as **Ferramentas de Terminal** (Fase 1) para visualizar processos em background, atualizar status em tempo real e mostrar estatísticas de uso.

**Meta:** Sidebar viva com processos reais e footer com contagem de tokens.

---

## 📋 Tarefas

### 1. Integração com Terminal Tools
- [ ] Conectar `terminal_background` com a Sidebar:
  - [ ] Interceptar tool call no `toolDetectionWrapper` (ou via evento)
  - [ ] Adicionar processo à lista visual da Sidebar
- [ ] Implementar `updateSidebar()`:
  - [ ] Renderizar lista de processos
  - [ ] Cores por status (verde=running, vermelho=error, cinza=stopped)

### 2. Monitoramento (Polling)
- [ ] Criar hook/intervalo de monitoramento (ex: a cada 2s):
  - [ ] Iterar processos ativos
  - [ ] Chamar `terminal_status` (da tool)
  - [ ] Atualizar uptime e status na UI
  - [ ] Remover processos finalizados (opcional/configurável)

### 3. Estatísticas (Footer)
- [ ] Implementar contador de tokens:
  - [ ] Estimar tokens baseado no histórico de mensagens
  - [ ] Atualizar Footer: `💬 3.2K tokens`
- [ ] Contador de processos:
  - [ ] Atualizar Footer: `⚡ 2 processes`

### 4. Streaming de Respostas
- [ ] Adaptar `messageFormatter` para suportar chunks de stream
- [ ] Implementar `updateLastMessage` no TUI:
  - [ ] Ao invés de criar nova linha, atualizar conteúdo da última caixa
  - [ ] Efeito de digitação em tempo real

---

## 🔧 Detalhes Técnicos

### Fluxo de Processos

```typescript
// Quando terminal_background é chamado:
tui.addProcess({
  id: toolResult.processId,
  name: toolParams.name,
  command: toolParams.command,
  status: 'starting',
  startTime: Date.now()
});

// Loop de Monitoramento:
setInterval(async () => {
  const status = await terminalStatusTool.execute(proc.id);
  tui.updateProcess(proc.id, { 
    status: status.status,
    uptime: status.uptime 
  });
}, 2000);
```

### Streaming na UI

```typescript
// messageFormatter
onStreamChunk: (chunk) => tui.appendStream(chunk);

// TUI
appendStream: (chunk) => {
  const lastBox = chat.children[lastIndex];
  lastBox.setContent(lastBox.content + chunk);
  screen.render();
}
```

---

## ✅ Critérios de Aceitação

1. **Processos:**
   - Ao rodar `npm run dev` (via agente), aparece na Sidebar.
   - Status muda de `starting` para `running`.
   - Uptime atualiza a cada 2s.
   - Ao parar processo, status muda para `stopped` ou sai da lista.

2. **Stats:**
   - Footer mostra número correto de processos ativos.
   - Footer mostra estimativa de tokens aumentando conforme conversa.

3. **UX:**
   - Respostas do agente aparecem progressivamente (streaming).
   - Sidebar não pisca excessivamente durante updates.

---

## 📦 Dependências
- **Requer:** Fase 1 do TUI completa.
- **Requer:** Fase 1 das Ferramentas de Terminal implementada (`terminal_background`, `terminal_status`).
