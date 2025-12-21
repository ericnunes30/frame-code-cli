# Módulo de Agents - Frame Code CLI

O módulo de agents é responsável por criar e gerenciar o fluxo do agente, incluindo a integração com o sistema de skills.

## Componentes Principais

### 1. createAgentGraph

Função principal que cria o grafo do agente com integração de skills:

```typescript
export async function createAgentGraph(modelName?: string) {
    // Carregar configuração
    const config = await loadConfig();

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
}
```

## Integração com Skills

O sistema de skills é integrado ao fluxo do agente da seguinte forma:

1. **Carregamento de Configuração**: As configurações de skills são carregadas junto com as demais configurações do CLI
2. **Inicialização do SkillLoader**: Se as skills estiverem habilitadas, o `SkillLoader` é inicializado
3. **Carregamento de Skills**: Todos os skills são carregados do diretório configurado
4. **Injeção no Prompt**: Os skills são injetados no prompt do agente através do `PromptBuilder`

## Estrutura do Grafo

O grafo do agente é composto por:

- **agent**: Nó principal do agente
- **validate**: Nó de validação ReAct
- **detect**: Nó de detecção de tools
- **execute**: Nó de execução de tools
- **end**: Nó de finalização

O sistema de skills influencia diretamente o nó **agent**, fornecendo contexto adicional através do prompt do sistema.

## Fluxo multi-agent (supervisor + planner + executor)

O code-cli suporta um fluxo hierarquico com tres agentes:

- **Supervisor**: agente principal que decide quando delegar via call_flow.
- **Planner**: gera o plano e grava em shared.plan.
- **Executor**: executa o plano e retorna shared.output.

O supervisor esta em src/agents/multi-agents/plan-executor/agentSupervisorFlow.ts e pode ser executado
via o comando CLI multi-agent.
