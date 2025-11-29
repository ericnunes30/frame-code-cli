# 📁 Plano de Implementação TUI - Estrutura de Fases

## 🎯 Visão Geral

Este diretório contém o planejamento completo e faseado da implementação da TUI (Terminal User Interface) para o modo `interactive` do frame-code-cli.

**Meta:** Interface full-screen estilo OpenCode usando Blessed  
**Escopo:** Apenas comando `interactive` (modo autônomo `ask` continua com console.log)

---

## 📚 Documentos

### **00. Visão Geral**
📄 [`00-overview.md`](00-overview.md) - Documento principal com contexto completo, decisões e arquitetura

### **Fases de Implementação**

#### **Fase 1: Fundação** (1 semana) 🟢
📄 [`01-fase1-fundacao.md`](01-fase1-fundacao.md)
- TUI básica com Blessed
- Layout 3 áreas (sidebar, chat, input)
- Integração com `processQuestion()` existente
- messageFormatter adaptável

**Entregáveis:**
- [ ] TUI renderiza full-screen
- [ ] Input funciona
- [ ] Mensagens aparecem no chat
- [ ] ESC e Ctrl+C funcionam

---

#### **Fase 2: Processos e Stats** (1 semana) 🟡
📄 [`02-fase2-processos.md`](02-fase2-processos.md)
- Integração com terminal tools
- Processos na sidebar com polling
- Footer com contagem de tokens
- Streaming de respostas

**Entregáveis:**
- [ ] Processos aparecem na sidebar
- [ ] Status atualiza automaticamente
- [ ] Tokens contados em tempo real
- [ ] Streaming de LLM funciona

---

#### **Fase 3: Polimento** (3-5 dias) 🔵
📄 [`03-fase3-polimento.md`](03-fase3-polimento.md)
- Spinner durante execução
- Help screen (?)
- Keybindings extras
- Preparação para histórico

**Entregáveis:**
- [ ] Loading indicators
- [ ] Help screen funcional
- [ ] Cores e tema consistentes
- [ ] Arquitetura extensível para histórico

---

## 🗺️ Roadmap Visual

```
┌─────────────────────────────────────────┐
│ Fase 1: Fundação (1 sem)                │
│ ├─ TUI básica                           │
│ ├─ Layout 3 áreas                       │
│ └─ Integração messageFormatter          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Fase 2: Processos (1 sem)               │
│ ├─ Terminal tools integration           │
│ ├─ Sidebar dinâmica                     │
│ └─ Stats em tempo real                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Fase 3: Polimento (3-5 dias)            │
│ ├─ UX melhorado                         │
│ ├─ Help + keybindings                   │
│ └─ Preparação histórico                 │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Geral

### Pré-requisitos:
- [ ] Node.js instalado
- [ ] Git Bash (Windows) ou terminal compatível
- [ ] Dependências: `blessed`, `@types/blessed`

### Fase 1:
- [ ] Blessed instalado
- [ ] TUI renderiza
- [ ] Integração com cli.ts
- [ ] messageFormatter adaptado

### Fase 2:
- [ ] Terminal tools Fase 1 implementada
- [ ] Processos visualizados
- [ ] Polling funcionando
- [ ] Tokens contados

### Fase 3:
- [ ] UX polido
- [ ] Help implementado
- [ ] Tema final
- [ ] Documentação atualizada

---

## 📦 Dependências Entre Fases

```
Terminal Tools (Fase 1) ─────┐
                             ↓
TUI Fase 1 (fundação) ──→ TUI Fase 2 (processos) ──→ TUI Fase 3 (polish)
                             ↑
messageFormatter adaptado ───┘
```

**Crítico:** TUI Fase 2 depende de Terminal Tools Fase 1 estar implementada!

---

## 🎯 Ordem Recomendada de Implementação

1. **Terminal Tools Fase 1** (ver `../plan-terminal-tools.md`)
   - `terminal_execute`
   - `terminal_background`
   - `terminal_status`
   - `terminal_stop`
   - `terminal_list`

2. **TUI Fase 1** (este plano)
   - Layout básico
   - Integração com GraphEngine

3. **TUI Fase 2** (após Terminal Tools)
   - Visualização de processos
   - Stats dinâmicas

4. **TUI Fase 3** (polimento final)
   - UX e melhorias

---

## 📚 Documentação Relacionada

- [`../plan-terminal-tools.md`](../plan-terminal-tools.md) - Plano das ferramentas de terminal
- [`../plan-sugesstions-features.md`](../plan-sugesstions-features.md) - Features implementadas
- [`../reference-image-tui.png`](../reference-image-tui.png) - Referência visual do design

---

**Última atualização:** 2025-11-29  
**Status:** 📋 Planejamento completo  
**Próximo passo:** Implementar Terminal Tools Fase 1, depois TUI Fase 1
