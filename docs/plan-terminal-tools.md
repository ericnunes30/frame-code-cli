# 🔧 Plano de Implementação - Ferramentas Terminal

## 🎯 Objetivo
Dar ao agente LLM **controle completo** sobre processos do sistema, similar ao que um desenvolvedor tem no terminal.

**Meta de Longo Prazo:** Nível Devin (múltiplos terminais, processos gerenciados, controle total)

---

## 📊 Estado Atual

### Implementação Existente
**Arquivo:** `src/tools/terminal.ts`

```typescript
interface TerminalParams {
  command: string;
}

// Usa exec() - síncrono, sem controle
const { stdout, stderr } = await execPromise(params.command);
```

### ❌ Problemas Identificados
1. **Sem sessão persistente** - `cd /dir` não persiste
2. **Sem processos em background** - `npm run dev` trava
3. **Sem timeout configurável** - pode travar indefinidamente
4. **Sem streaming** - output só no final
5. **Sem cancelamento** - não pode parar processos
6. **Sem gerenciamento** - não lista/monitora processos ativos

---

## 🗺️ Roadmap de Implementação

### **Fase 1: Fundação** (1-2 semanas)
Ferramentas básicas com controle de processos.

#### Ferramentas:
```typescript
// 1. Execução síncrona melhorada
terminal_execute({
  command: string;
  cwd?: string;          // Diretório de trabalho
  timeout?: number;      // Timeout em ms (default: 30000)
  env?: Record;          // Variáveis adicionais
})
→ { success: boolean; output: string; exitCode: number }

// 2. Processos em background
terminal_background({
  command: string;
  cwd?: string;
  env?: Record;
  name?: string;         // Nome amigável (opcional)
})
→ { processId: string; status: 'starting'; pid: number }

// 3. Status de processo
terminal_status(processId: string)
→ { 
  status: 'running' | 'stopped' | 'error';
  pid: number;
  uptime: number;        // segundos
  exitCode?: number;
}

// 4. Logs de processo
terminal_logs({
  processId: string;
  lines?: number;        // últimas N linhas (default: 50)
})
→ { logs: string; lineCount: number }

// 5. Parar processo
terminal_stop(processId: string)
→ { success: boolean; message: string }

// 6. Listar processos
terminal_list()
→ { 
  processes: Array<{
    id: string;
    name?: string;
    command: string;
    status: string;
    uptime: number;
  }>
}
```

#### Tech Stack:
- **`execa`** - Melhor controle que `child_process.exec`
- **`tree-kill`** - Matar processo + filhos
- **Process Manager** - Map<id, ProcessInfo>

#### Arquitetura:
```typescript
// Gerenciador centralizado
class TerminalProcessManager {
  private processes = new Map<string, ProcessInfo>();
  
  execute(params)      // Síncrono
  background(params)   // Async, retorna ID
  status(id)          // Check status
  logs(id, lines)     // Últimas linhas
  stop(id)            // Kill processo
  list()              // Lista todos
}

// Cada ferramenta usa o manager
terminalExecuteTool.execute() → manager.execute()
terminalBackgroundTool.execute() → manager.background()
```

---

### **Fase 2: Gerenciamento Avançado** (1 mês)
Terminais nomeados e controle fino.

#### Ferramentas Adicionais:
```typescript
// Terminal nomeado
terminal_create({
  name: string;
  cwd?: string;
  env?: Record;
})
→ { terminalId: string; name: string }

// Executar em terminal específico
terminal_run({
  terminalId: string;
  command: string;
})
→ { processId: string; status: string }

// Aguardar padrão no output
terminal_wait({
  processId: string;
  pattern: string;      // String ou regex
  timeout?: number;
})
→ { found: boolean; match?: string; timeElapsed: number }

// Destruir terminal
terminal_destroy(terminalId: string)
→ { success: boolean; processesKilled: number }
```

#### Melhorias:
- Buffer de logs persistente (últimas 1000 linhas)
- Detecção de server ready (`Server listening on port 3000`)
- Auto-restart para processos que crasham (opcional)

---

### **Fase 3: Multi-Terminal** (2-3 meses)
Controle completo estilo IDE.

#### Recursos Avançados:
```typescript
// Input interativo
terminal_input({
  processId: string;
  input: string;
})
→ { sent: boolean }

// Anexar/desanexar
terminal_attach(terminalId: string)
terminal_detach(terminalId: string)

// Histórico completo
terminal_history(terminalId: string)
→ { commands: string[]; outputs: string[] }
```

#### Tech Stack Upgrade:
- **`node-pty`** - Pseudo-terminal real (TTY completo)
- Event emitters para streaming
- Persistência de estado (SQLite ou JSON)

---

### **Fase 4: Container Ready** (Futuro)
Execução isolada em containers.

#### Conceito:
```typescript
container_start({
  image?: string;       // Default: node:20
  volumes?: string[];
})
→ { containerId: string }

container_terminal({
  containerId: string;
  command: string;
})

container_stop(containerId: string)
```

Simplesmente rodar o próprio agente dentro do container.

---

## 📐 Estrutura de Arquivos

```
src/tools/
├── terminal/
│   ├── index.ts                    # Exports
│   ├── terminal-execute.ts         # Síncrono
│   ├── terminal-background.ts      # Async
│   ├── terminal-status.ts          # Status
│   ├── terminal-logs.ts            # Logs
│   ├── terminal-stop.ts            # Kill
│   ├── terminal-list.ts            # Lista
│   └── manager.ts                  # Process Manager
└── terminal.ts (deprecated)        # Marcar como deprecated
```

---

## ✅ Critérios de Sucesso - Fase 1

### Funcional:
- [ ] LLM executa comando síncrono com timeout
- [ ] LLM inicia `npm run dev` em background
- [ ] LLM verifica status do processo
- [ ] LLM lê logs do processo
- [ ] LLM para o processo
- [ ] LLM lista todos processos ativos

### Técnico:
- [ ] Processos não travam o agente
- [ ] Timeout funciona corretamente
- [ ] Kill mata processo + filhos
- [ ] Logs são capturados continuamente
- [ ] Múltiplos processos simultâneos
- [ ] Cleanup automático ao encerrar CLI

### Qualidade:
- [ ] Testes unitários (>80% coverage)
- [ ] Error handling robusto
- [ ] Logs estruturados
- [ ] Documentação com exemplos
- [ ] Segue princípios SOLID

---

## 🔒 Considerações de Segurança

### Fase 1:
- **Confiança no LLM** - Sem whitelist
- **Human-in-the-loop** - Aprovação em comandos destrutivos (via agent flow)

### Fases Futuras:
- Sandbox via container
- Filesystem isolado
- Network limits
- Resource limits (CPU, RAM)

---

## 📚 Referências

### Bibliotecas:
- [execa](https://github.com/sindresorhus/execa) - Process execution
- [tree-kill](https://github.com/pkrumins/node-tree-kill) - Kill process tree
- [node-pty](https://github.com/microsoft/node-pty) - Pseudo terminal

### Inspirações:
- [Devin](https://www.cognition.ai/devin) - Multi-terminal control
- [Replit Agent](https://replit.com) - Sandbox environment
- [PM2](https://pm2.keymetrics.io/) - Process manager

---

**Última atualização:** 2025-11-29  
**Status:** 📋 Planejamento - Fase 1  
**Próximo passo:** Implementar Fase 1
