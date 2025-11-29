# 🏗️ Fase 1: Fundação TUI

## 🎯 Objetivo
Implementar a estrutura básica da TUI usando **Blessed**, substituindo o `readline` no modo `interactive`, mantendo a integração com o `GraphEngine` existente.

**Meta:** TUI full-screen funcional com layout de 3 áreas (Sidebar, Chat, Input).

---

## 📋 Tarefas

### 1. Setup Inicial
- [ ] Instalar dependências: `npm install blessed @types/blessed`
- [ ] Criar estrutura de diretórios: `src/ui/`
- [ ] Criar arquivo base: `src/ui/tui.ts`

### 2. Implementação do Layout (Blessed)
- [ ] Criar `screen` com configurações full-screen (smartCSR, fullUnicode)
- [ ] Criar **Header** (Box) com info do agente
- [ ] Criar **Sidebar** (List/Box) para processos (vazia inicialmente)
- [ ] Criar **Chat Area** (Box scrollable) para mensagens
- [ ] Criar **Input** (Textbox) na parte inferior
- [ ] Criar **Footer** (Box) para stats

### 3. Integração com GraphEngine
- [ ] Modificar `src/core/cli.ts`:
  - [ ] Importar `createTUI`
  - [ ] Substituir loop `readline` por inicialização da TUI
  - [ ] Conectar input do TUI ao `processQuestion()`
- [ ] Modificar `src/core/messageFormatter.ts`:
  - [ ] Criar interface `OutputAdapter`
  - [ ] Implementar `setOutputAdapter`
  - [ ] Redirecionar logs para o adapter quando disponível

### 4. Funcionalidades Básicas
- [ ] **Input Handling:**
  - [ ] Capturar Enter no input
  - [ ] Limpar input após envio
  - [ ] Manter foco no input
- [ ] **Message Display:**
  - [ ] Implementar `addMessage(type, content)`
  - [ ] Ícones e cores por tipo (user, agent, tool)
  - [ ] Auto-scroll para nova mensagem
- [ ] **Keybindings:**
  - [ ] `Ctrl+C` / `Escape`: Fechar aplicação (graceful shutdown)
  - [ ] `Ctrl+L`: Limpar chat

---

## 🔧 Detalhes Técnicos

### Arquitetura do `src/ui/tui.ts`

```typescript
import blessed from 'blessed';

export function createTUI(config: any) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'frame-agent'
  });

  // Layout components...
  // (Header, Sidebar, Chat, Input, Footer)

  return {
    screen,
    addMessage: (type, content) => { /* ... */ },
    start: async () => { /* ... */ },
    destroy: () => screen.destroy()
  };
}
```

### Adaptação do `messageFormatter.ts`

```typescript
// Antes:
// console.log('🤖 Agente:', content);

// Depois:
// outputAdapter.log('agent', content);
```

---

## ✅ Critérios de Aceitação

1. **Execução:**
   - `frame-code interactive` abre em tela cheia.
   - Layout corresponde ao design (Sidebar 20%, Chat 80%).

2. **Interação:**
   - Usuário digita, Enter envia.
   - Mensagem do usuário aparece no chat.
   - Resposta do agente aparece no chat.
   - Tool calls aparecem no chat.

3. **Estabilidade:**
   - `Ctrl+C` fecha sem deixar terminal sujo.
   - Redimensionar janela ajusta layout.
   - Scroll funciona quando chat enche.

4. **Regressão:**
   - `frame-code ask` continua funcionando normalmente (console.log).

---

## 📦 Dependências
- Nenhuma dependência externa além de `blessed`.
- Depende de `GraphEngine` estar funcional (já está).
