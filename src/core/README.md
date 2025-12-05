# Módulo Core - Frame Code CLI

O módulo core do Frame Code CLI contém componentes essenciais para o funcionamento da aplicação, incluindo o carregamento de skills.

## Componentes Principais

### 1. SkillLoader

O `SkillLoader` é responsável por carregar skills do filesystem e integrá-los ao fluxo do agente.

```typescript
import { SkillLoader } from '../core/skillLoader';

// Criar um SkillLoader
const skillLoader = new SkillLoader('./.code-skills');

// Carregar todos os skills
const allSkills = await skillLoader.loadAllSkills();

// Obter skills relevantes para um contexto
const relevantSkills = await skillLoader.getSkillsForContext('mensagem do usuário');
```

### 2. Configuração de Skills

As skills podem ser configuradas através do arquivo de configuração `.env` ou `.env.local`:

```env
# Configurações de skills
SKILLS_ENABLED=true
SKILLS_DIRECTORY=.code-skills
SKILLS_MAX_TOKENS=4000
SKILLS_RELEVANCE_THRESHOLD=0.3
```

Ou através do objeto `skills` no arquivo de configuração:

```typescript
{
  skills: {
    enabled: true,
    directory: '.code-skills',
    maxTokens: 4000,
    relevanceThreshold: 0.3
  }
}
```

## Estrutura de Diretórios

```
.code-skills/
├── CONTEXT.md                    # Contexto geral do projeto (opcional)
├── skills/
│   ├── solid-principles.md       # Skill de exemplo
│   └── testing-patterns.md       # Skill de exemplo
└── config.yaml                   # Configuração local (opcional)
```

## Integração com o Fluxo do Agente

O `SkillLoader` é integrado ao fluxo do agente em `agentFlow.ts`:

```typescript
// Carregar skills se habilitado
let activeSkills: any[] = [];
if (config.skills?.enabled !== false) {
  const skillLoader = new SkillLoader(config.skills?.directory);
  activeSkills = await skillLoader.loadAllSkills();
}

// Incluir skills no prompt do agente
systemPrompt = PromptBuilder.buildSystemPrompt({
    mode: 'react' as any,
    agentInfo: {
        name: 'GeneratorAgent',
        goal: 'Executar tarefas de codificação e responder perguntas',
        backstory: 'Você é um desenvolvedor júnior focado em programação.'
    },
    additionalInstructions: fallbackPrompt,
    tools: toolRegistry.listTools(),
    skills: activeSkills
});
```