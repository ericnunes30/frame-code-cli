# Frame Agent CLI

Interface de linha de comando para o SDK `@ericnunes/frame_agent` para interagir com agentes (Hybrid e MoA) via terminal.

Nota: projeto em desenvolvimento (uso recomendado em ambiente de dev/teste).

## Instalação

Global (npm registry):

```bash
npm install -g frame-code-cli
```

Local (monorepo):

```bash
# build SDK e CLI
cd frame_agent && npm run build
cd ../frame-code-cli && npx tsc -p tsconfig.json

# link global do CLI
npm link
```

## Comandos

- `frame-agent chat` — inicia uma sessão interativa
  - Opções:
    - `-m, --mode <mode>`: `hybrid` (padrão) ou `moa`
    - `-s, --system-prompt <prompt>`: system prompt customizado

- `frame-agent ask <question>` — executa uma pergunta única
  - Opções:
    - `-m, --mode <mode>`: `hybrid` ou `moa`
    - `-s, --system-prompt <prompt>`

Exemplos:

```bash
# Sessão interativa (MoA)
frame-agent chat --mode moa

# Pergunta única (Hybrid)
frame-agent ask --mode hybrid "Crie um arquivo README.md com um sumário"
```

## Variáveis de ambiente (.env)

```env
# Provedor padrão
DEFAULT_PROVIDER=openai-compatible

# Provedor OpenAI Compatible
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://...
OPENAI_COMPATIBLE_MODEL=gpt-4o

# Estratégia de memória
MEMORY_STRATEGY=dynamic    # ou fixed
MEMORY_MAX_TOKENS=4096     # para dynamic
MEMORY_WINDOW_SIZE=10      # para fixed

# Encadeamento pós-MoA (executar tools via Hybrid/ReAct)
ENABLE_MOA_HYBRID_TOOLS=true

# Mock de tools (sem chaves) — apenas para testes locais
CLI_REACT_MOCK=false
```

## Saída formatada

As respostas aparecem no padrão:

```
LLM
Pensamento...
└── ação/<tool>           # quando houver
```

Com `ENABLE_MOA_HYBRID_TOOLS=true` e tools disponíveis, você verá a cadeia completa de pensamentos/ações após o MoA.

## Especialistas do MoA (backend)

O CLI registra dinamicamente 4 especialistas na fase de Planning do MoA:

- arquiteto (backend): boundaries C4/DDD e plano de etapas
- seguranca: ameaças, trust boundaries, segredos/permissões, validação, hardening
- banco: esquema, índices, migrations, query-shapes
- devops: scripts idempotentes, CI/CD, envs/segredos, rollback

Cada especialista responde em JSON (schema):

```json
{
  "role": "<papel>",
  "scope": "backend",
  "decisions": [],
  "plan": [],
  "risks": [],
  "actions": [],
  "needs": []
}
```

Os prompts incluem um apêndice com o catálogo de tools e instruem a propor ações (em `actions`) com o formato exato dos parâmetros quando fizer sentido para a tarefa.

## Dicas

- Para ver ferramentas em ação após o MoA, ligue `ENABLE_MOA_HYBRID_TOOLS=true`.
- Sem chaves, use `CLI_REACT_MOCK=true` para simular execução de tools.
- `hybrid` decide quando entrar em ReAct e executar tools; `moa` coordena especialistas e (com a flag) pode encadear tools ao final.

## Licença

MIT
# frame-code-cli
