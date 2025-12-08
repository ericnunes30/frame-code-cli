import {
    GraphEngine,
    GraphDefinition,
    createAgentNode,
    createToolExecutorNode,
    createReactValidationNode,
    AgentLLMConfig,
    AgentMode
} from 'frame-agent-sdk';
import { CLIPromptBuilder } from '../core/utils/CLIPromptBuilder';
import { createToolDetectionWrapper } from '../core/utils/toolWrapper';
import { SkillLoader } from '../core/utils/skillLoader';
import { CompressionManager } from '../core/services/CompressionManager';
import { GraphExecutionWrapper } from '../core/utils/graphExecutionWrapper';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/services/logger';
import { toolRegistry } from '../core/services/tools';
import { loadConfig } from '../core/services/config';

export async function createAgentGraph(modelName?: string): Promise<GraphEngine | import('../core/utils/graphExecutionWrapper').GraphExecutionWrapper> {
    // Carregar configuração
    const config = await loadConfig();

    // Criar CompressionManager para gerenciar compressão (se habilitado)
    let compressionManager: any = null;
    let compressionPrompt = '';
    
    if (config.compression?.enabled !== false) {
        compressionManager = new CompressionManager(config.compression);
        compressionPrompt = compressionManager.getCompressionPrompt();
        
        logger.info('[AgentFlow] CompressionManager inicializado');
        logger.debug('[AgentFlow] Config de compressão:', config.compression);
    }

    // Carregar skills se habilitado
    let activeSkills: any[] = [];
    if (config.skills?.enabled !== false) {
      const skillLoader = new SkillLoader(config.skills?.directory);
      activeSkills = await skillLoader.loadAllSkills();
    }

    // Carregar prompt do sistema usando PromptBuilder (com logs de debug)
    let systemPrompt = '';
    try {
        // Carregar prompt específico para CLI
        const promptPath = path.join(__dirname, '../prompts/system-prompt-cli.md');
        const cliPrompt = fs.readFileSync(promptPath, 'utf-8');

        // Usar CLIPromptBuilder para gerar prompt com contexto de compressão
        systemPrompt = CLIPromptBuilder.buildSystemPrompt({
            mode: 'react' as any,
            agentInfo: {
                name: 'CLIAssistant',
                goal: 'Ajudar desenvolvedores com tarefas de codificação e responder perguntas técnicas',
                backstory: 'Você é um assistente de desenvolvimento experiente, focado em fornecer ajuda prática e eficiente.'
            },
            additionalInstructions: cliPrompt,
            compressionHistory: compressionPrompt, // Adicionar contexto de compressão
            tools: toolRegistry.listTools(),
            skills: activeSkills
        });

        logger.info('[DEBUG] System prompt CLI gerado via PromptBuilder com compressão');
    } catch (error) {
        logger.error(`Erro ao gerar prompt do sistema CLI:`, error);
        systemPrompt = 'Você é um assistente de desenvolvimento útil.';
    }

    // Usar modelo do parâmetro ou da configuração
    const model = modelName || config.defaults?.model || 'gpt-4o-mini';

    // Configuração do LLM usando config centralizada
    // defaults.maxContextTokens será usado pelo GraphEngine para criar ChatHistoryManager
    const llmConfig: AgentLLMConfig = {
        model: model,
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseURL,
        defaults: {
            maxTokens: config.defaults?.maxContextTokens, // Para memória/contexto
            temperature: config.defaults?.temperature,
        }
    };

    // Definição dos Nós

    // 1. Nó do Agente
    const agentNode = createAgentNode({
        llm: llmConfig,
        mode: 'react' as AgentMode,
        agentInfo: {
            name: 'Code Agent',
            goal: 'Planejar e Executar tarefas de codificação (E em alguns casos interagir com usuários)',
            backstory: 'Você é um desenvolvedor Sênior especializado em multiplas áreas.'
        },
        additionalInstructions: systemPrompt,
        tools: toolRegistry.listTools(),
        autoExecuteTools: false,
        temperature: config.defaults?.temperature,
        maxTokens: config.defaults?.maxTokens, // Para output por call ao LLM
    });

    // 2. Nó de Validação ReAct
    const reactValidationNode = createReactValidationNode();

    // 3. Nó de Detecção de Tools (com wrapper para formatação)
    const toolDetectionNode = createToolDetectionWrapper();

    // 4. Nó de Execução de Tools
    const toolExecutorNode = createToolExecutorNode();

    // Definição do Grafo
    const graphDefinition: GraphDefinition = {
        entryPoint: 'agent',
        endNodeName: 'end',
        nodes: {
            agent: agentNode,
            validate: reactValidationNode,
            detect: toolDetectionNode,
            execute: toolExecutorNode,
            end: async (state, engine) => {
                logger.info('[DEBUG] Nó end executado - finalizando grafo');
                return {
                    ...state,
                    status: 'finished' as any,
                    shouldEnd: true
                };
            }
        },
        edges: {
            agent: 'validate',
            validate: (state) => {
                // Verificar se a validação ReAct passou
                const validationPassed = (state.metadata as any)?.validation?.passed !== false;
                
                if (validationPassed) {
                    return 'detect';
                } else {
                    // Se a validação falhou, voltar para o agente com feedback
                    return 'agent';
                }
            },
            detect: (state) => {
                logger.info(`[DEBUG] Detect node - Estado atual: ${JSON.stringify({
                    hasToolCall: !!state.lastToolCall,
                    toolName: state.lastToolCall?.toolName,
                    messageCount: state.messages?.length || 0
                })}`);

                const hasToolCall = !!state.lastToolCall;
                
                // PADRONIZADO: Usa o mesmo critério do primeiro roteamento (validação)
                const validationPassed = (state.metadata as any)?.validation?.passed !== false;

                if (hasToolCall) {
                    const toolName = state.lastToolCall?.toolName;
                    logger.info(`[DEBUG] Tool call detectada: ${toolName}`);

                    // Verificar se é uma ferramenta final
                    if (toolName === 'final_answer') {
                        logger.info('[DEBUG] Detectado final_answer, redirecionando para fim');
                        return 'end';
                    }

                    if (toolName === 'ask_user') {
                        logger.info('[DEBUG] Detectado ask_user, redirecionando para fim');
                        return 'end';
                    }

                    logger.info('[DEBUG] Tool call comum, indo para execução');
                    return 'execute';
                }
                
                // PADRONIZADO: Segue exatamente o mesmo padrão do roteamento de validação
                if (!validationPassed) {
                    return 'agent';
                }
                
                logger.info('Nenhuma tool call, finalizando');
                return 'end';
            },
            execute: (state) => {
                logger.info(`[DEBUG] Execute node - Última tool: ${state.lastToolCall?.toolName}`);

                // Se foi ask_user ou final_answer, não voltar para agent
                if (state.lastToolCall?.toolName === 'final_answer' || state.lastToolCall?.toolName === 'ask_user') {
                    logger.info('[DEBUG] Tool final executada, encerrando fluxo');
                    return 'end';
                }

                logger.info('[DEBUG] Voltando para agent node');
                return 'agent';
            },
            end: 'end' // Aresta de fallback para o nó end
        }
    };

    // Criar GraphEngine passando llmConfig para configurar ChatHistoryManager
    const graphEngine = new GraphEngine(graphDefinition, undefined, llmConfig);

    // Se compressão estiver habilitada, retornar wrapper com tratamento automático
    if (compressionManager) {
        logger.info('[AgentFlow] Criando GraphExecutionWrapper com compressão habilitada');
        const wrapper = new GraphExecutionWrapper(
            graphEngine, 
            compressionManager
        );
        return wrapper;
    }

    // Caso contrário, retornar GraphEngine diretamente (comportamento original)
    logger.info('[AgentFlow] Retornando GraphEngine sem compressão');
    return graphEngine;
}