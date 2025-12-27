# Sistema de Agentes (.code-skills/agents/)

Este sistema permite criar novos agentes apenas adicionando arquivos `.md` com YAML frontmatter, sem escrever código TypeScript.

## Estrutura de Diretórios

```
.code-skills/
└── agents/                     # ← Arquivos .md de agentes
    ├── code-agent.md
    ├── chrome-mcp-agent.md
    └── README.md
```

## Como Criar um Novo Agente

### Criar arquivo `nome-do-agente.md`

```bash
cat > .code-skills/agents/meu-agent.md << 'EOF'
---
name: meu-agent
type: main-agent
canBeSupervisor: false
description: Descrição do meu agente
keywords: [minha, especialidade]
tools: [search, file_read, file_write, final_answer]
temperature: 0.3
maxTokens: 4096
---

# Meu Agente

Você é especialista em...
EOF
```

### Usar imediatamente

O agente será descoberto automaticamente no próximo startup da CLI:

```bash
npm run interactive
```

## Campos do YAML Frontmatter

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Identificador único (kebab-case) |
| `type` | enum | Sim | `main-agent` ou `sub-agent` |
| `canBeSupervisor` | boolean | Não | Se pode funcionar como supervisor (default: false) |
| `description` | string | Sim | Descrição de quando usar |
| `keywords` | string[] | Não | Palavras-chave para busca |
| `tools` | string[] | Sim | Lista de ferramentas disponíveis |
| `toolPolicy` | object | Não | Política de restrição { allow, deny } |
| `subAgents` | string[]\|'all' | Não | Lista de sub-agentes que pode chamar via `call_flow` |
| `model` | string | Não | Modelo LLM (default: da config) |
| `temperature` | number | Não | Temperatura (default: 0.7) |
| `maxTokens` | number | Não | Máximo de tokens (default: da config) |
| `systemPrompt` | string | Não | Arquivo .md com prompt base |
| `compressionEnabled` | boolean | Não | Habilita compressão (default: true) |

## Exemplos

### Exemplo 1: Agente de Database

```yaml
---
name: database-agent
type: main-agent
description: Especialista em banco de dados SQL
keywords: [database, sql, postgres, mysql]
tools: [search, file_read, file_write, terminal, final_answer]
temperature: 0.2
compressionEnabled: false
---

# Database Agent

Você é um especialista em bancos de dados relacionais...
```

### Exemplo 2: Agente Supervisor

```yaml
---
name: supervisor
type: sub-agent
canBeSupervisor: true
description: Orquestra sub-agentes para tarefas complexas
tools: [call_flow, final_answer, ask_user]
toolPolicy:
  allow: [call_flow, final_answer, ask_user]
flowMode: hierarchical
---

# Agente Supervisor

Você orquestra o trabalho de sub-agentes especializados...
```

### Exemplo 3: Agente com SubAgentes Específicos

```yaml
---
name: supervisor
type: main-agent
canBeSupervisor: true
description: Orquestra planner e implementer
tools: [call_flow, final_answer, ask_user]
subAgents: [planner, implementer]
---

# Supervisor

Você orquestra planner e implementer para completar tarefas complexas.
```

### Exemplo 4: Agente com Todos os SubAgentes

```yaml
---
name: meta-supervisor
type: main-agent
description: Orquestra qualquer sub-agente disponível
tools: [call_flow, final_answer]
subAgents: all
---

# Meta Supervisor

Você pode chamar qualquer sub-agente disponível no sistema.
```

### Exemplo 5: Sub-Agente (não pode ser usado diretamente)

```yaml
---
name: planner
type: sub-agent
description: Cria planos de execução
tools: [search, file_read, final_answer]
---

# Planner

Você é especializado em criar planos detalhados de execução.
```

## Comportamento do Campo `subAgents`

| Valor | Comportamento |
|-------|---------------|
| **Omitido ou vazio** | Agente não pode chamar sub-agentes (remove `call_flow` se estiver em `tools`) |
| `subAgents: []` | Mesmo que omitido - nenhum sub-agente permitido |
| `subAgents: ['agent1', 'agent2']` | Apenas agent1 e agent2 podem ser chamados (devem ser do tipo `sub-agent`) |
| `subAgents: 'all'` | Todos os sub-agentes podem ser chamados |

**Importante:** Apenas agentes do tipo `sub-agent` podem ser chamados via `call_flow`. Agentes do tipo `main-agent` não podem ser usados como sub-agentes.

## Correções Automáticas

O sistema aplica algumas correções automáticas para garantir configurações válidas:

### 1. Sub-agentes não têm `ask_user`

Se um agente do tipo `sub-agent` incluir `ask_user` no campo `tools`, o sistema **remove automaticamente** essa ferramenta.

**Motivo:** Sub-agentes são chamados por outros agentes e nunca devem interagir diretamente com o usuário. Se um sub-agente precisar de esclarecimentos, ele deve retornar um pedido ao agente supervisor.

**Log informativo:**
```
[planner] ask_user removido automaticamente: sub-agentes não interagem diretamente com o usuário
```

### 2. `call_flow` sem sub-agentes

Se um agente especificar `call_flow` nas `tools` mas não tiver sub-agentes configurados (`subAgents` vazio ou omitido), o `call_flow` é **removido automaticamente**.

**Motivo:** `call_flow` sem sub-agentes não faria nada.

**Log informativo:**
```
[supervisor] call_flow removido: nenhum sub-agente permitido
```

## Integração com CLI

Os comandos `interactive` e `autonomous` usam automaticamente os agentes registrados:

```bash
# Usa agente padrão (chrome-mcp-agent)
npm run interactive

# No futuro: especificar agente
npm run interactive --agent code-agent
```

## Agentes TypeScript Existentes

Os agentes originais em TypeScript continuam funcionando:

- `src/agents/single-agents/agentCode.ts` → Code Agent
- `src/agents/single-agents/agentChromeMcp.ts` → Chrome MCP Agent
- `src/agents/multi-agents/plan-executor/` → Planner, Implementer, Supervisor

Esses podem ser migrados para `.md` gradualmente.
