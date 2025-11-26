import {
    GraphEngine,
    GraphDefinition,
    createAgentNode,
    createToolDetectionNode,
    createToolExecutorNode,
    AgentLLMConfig,
    AgentMode
} from 'frame-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/logger';
import { toolRegistry } from '../core/tools';
import { loadConfig } from '../core/config';

export async function createAgentGraph(modelName?: string) {
    // Carregar configuração
    const config = await loadConfig();

    // Carregar prompt do sistema
    const promptPath = path.join(__dirname, '../prompts/system-prompt-generator.md');
    let systemPrompt = '';
    try {
        systemPrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
        logger.error(`Erro ao ler prompt do sistema em ${promptPath}:`, error);
        systemPrompt = 'Você é um assistente útil.';
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
            name: 'GeneratorAgent',
            goal: 'Executar tarefas de codificação e responder perguntas',
            backstory: 'Você é um desenvolvedor júnior focado em programação.'
        },
        additionalInstructions: systemPrompt,
        tools: toolRegistry.listTools(),
        autoExecuteTools: false,
        temperature: config.defaults?.temperature,
        maxTokens: config.defaults?.maxTokens, // Para output por call ao LLM
    });

    // 2. Nó de Detecção de Tools
    const toolDetectionNode = createToolDetectionNode();

    // 3. Nó de Execução de Tools
    const toolExecutorNode = createToolExecutorNode();

    // Definição do Grafo
    const graphDefinition: GraphDefinition = {
        entryPoint: 'agent',
        endNodeName: 'end',
        nodes: {
            agent: agentNode,
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
            agent: 'detect',
            detect: (state) => {
                logger.info(`[DEBUG] Detect node - Estado atual: ${JSON.stringify({
                    hasToolCall: !!state.lastToolCall,
                    toolName: state.lastToolCall?.toolName,
                    messageCount: state.messages?.length || 0
                })}`);

                const hasToolCall = !!state.lastToolCall;
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
    return new GraphEngine(graphDefinition, undefined, llmConfig);
}