# ✨ Fase 3: Polimento e UX

## 🎯 Objetivo
Refinar a experiência do usuário, adicionar funcionalidades de conveniência e preparar a arquitetura para expansões futuras (histórico).

**Meta:** Uma experiência de uso fluida, bonita e robusta, nível "produto final".

---

## 📋 Tarefas

### 1. Feedback Visual (Spinners)
- [ ] Adicionar indicador de carregamento (`blessed.loading`):
  - [ ] Mostrar quando o GraphEngine está executando (`isExecuting`)
  - [ ] Esconder quando aguardando input do usuário
  - [ ] Texto dinâmico: "🤖 Pensando...", "🔧 Executando tool..."

### 2. Keybindings Avançados
- [ ] Implementar atalhos globais:
  - [ ] `?`: Mostrar popup de Ajuda
  - [ ] `Tab`: Alternar foco (Input <-> Chat <-> Sidebar)
  - [ ] `PgUp/PgDn`: Scroll rápido no chat

### 3. Cores e Temas
- [ ] Definir paleta de cores consistente (Theme object):
  - [ ] Primary (Bordas, Destaques): Cyan
  - [ ] Success: Green
  - [ ] Error: Red
  - [ ] Warning: Yellow
  - [ ] Muted: Gray
- [ ] Aplicar tema em todos os componentes

### 4. Cleanup Robusto
- [ ] Garantir que processos órfãos sejam mortos ao sair:
  - [ ] Hook no `process.on('exit')` e `SIGINT`
  - [ ] Iterar lista de processos e enviar SIGTERM
  - [ ] Aguardar cleanup antes de destruir screen

### 5. Preparação para Histórico (Arquitetura)
- [ ] Definir interfaces para persistência:
  - [ ] `SessionData` (mensagens, processos, timestamp)
  - [ ] `HistoryManager` (save/load stub)
- [ ] Implementar flag `--restore` (placeholder)

---

## 🔧 Detalhes Técnicos

### Spinner Logic

```typescript
const spinner = blessed.loading({
  parent: chat,
  border: 'line',
  height: 3,
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' Status '
});

// No loop de execução:
spinner.load();
spinner.setContent('🤖 Processando...');
await graph.execute();
spinner.stop();
```

### Cleanup Logic

```typescript
async function gracefulShutdown() {
  spinner.load();
  spinner.setContent('🧹 Limpando processos...');
  
  await Promise.all(processes.map(p => terminalStopTool.execute(p.id)));
  
  screen.destroy();
  process.exit(0);
}
```

---

## ✅ Critérios de Aceitação

1. **UX:**
   - Usuário sabe quando o agente está "pensando" (spinner).
   - Ajuda acessível via `?`.
   - Navegação via teclado fluida.

2. **Visual:**
   - Cores consistentes e agradáveis.
   - Sem texto "quebrado" ou desalinhado.

3. **Segurança:**
   - Fechar a TUI mata todos os processos filhos (sem zumbis).

---

## 📦 Dependências
- **Requer:** Fase 2 do TUI completa.
