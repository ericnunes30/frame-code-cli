import {
    GraphEngine,
    GraphDefinition,
    createAgentNode,
    createToolExecutorNode,
    createReactValidationNode,
    createToolDetectionNode,
    AgentLLMConfig,
    GraphStatus,
    type GraphNode,
    type IGraphState
} from 'frame-agent-sdk';
import { loadSystemPrompt } from '../../core/utils/loadSystemPrompt';
import { CompressionManager } from '../../core/services/CompressionManager';
import { createCliContextHooks } from '../../core/utils/cliContextHooks';
import { logger } from '../../core/services/logger';
import { toolRegistry } from '../../core/services/tools';
import { loadConfig } from '../../core/services/config';
import type { TelemetryOptions, TraceSink } from 'frame-agent-sdk';

export async function createAgentGraph(
  modelName?: string,
  telemetry?: { trace: TraceSink; telemetry: TelemetryOptions; traceContext?: { agent?: { label?: string } } }
): Promise<GraphEngine> {
    // Carregar configuraÃ§Ã£o
    const config = await loadConfig();

    // Criar CompressionManager para gerenciar compressÃ£o (se habilitado)
    let compressionManager: CompressionManager | undefined;
    let compressionPrompt = '';

    if (config.compression?.enabled !== false) {
        compressionManager = new CompressionManager({ ...config.compression, persistKey: 'single-agent' });
        compressionPrompt = compressionManager.getCompressionPrompt();

        logger.info('[AgentFlow] CompressionManager inicializado');
        logger.debug('[AgentFlow] Config de compressÃ£o:', config.compression);
    }

    // Skills nÃ£o sÃ£o mais carregadas no prompt inicial
    // Usamos sistema de progressive disclosure via list_skills e enable_skill
    const activeSkills: any[] = [];

    // Carregar prompt do sistema - apenas o conteÃºdo bruto do arquivo
    let systemPrompt = '';
    try {
        // Usar loadSystemPrompt.loadFileContent para carregar apenas o conteÃºdo do arquivo
        // Passando o compressionPrompt como contexto
        systemPrompt = loadSystemPrompt.loadFileContent('system-prompt-code.md', compressionPrompt);

        logger.info('[DEBUG] System prompt carregado via loadFileContent');
    } catch (error) {
        logger.error(`Erro ao carregar system prompt:`, error);
        systemPrompt = 'VocÃª Ã© um assistente de desenvolvimento Ãºtil.';
    }

    // Usar modelo do parÃ¢metro ou da configuraÃ§Ã£o
    const model = modelName || config.defaults?.model || 'gpt-4o-mini';

    // ConfiguraÃ§Ã£o do LLM usando config centralizada
    // defaults.maxContextTokens serÃ¡ usado pelo GraphEngine para criar ChatHistoryManager
    const llmConfig: AgentLLMConfig = {
        model: model,
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseURL,
        defaults: {
            maxTokens: config.defaults?.maxTokens, // Para output por call ao LLM
            maxContextTokens: config.defaults?.maxContextTokens, // Para memÃ³ria/contexto
            temperature: config.defaults?.temperature,
        }
    };

    // DefiniÃ§Ã£o dos NÃ³s

    // 1. NÃ³ do Agente
    const agentNode = createAgentNode({
        llm: llmConfig,
        promptConfig: {
            mode: 'react' as any,
            agentInfo: {
                name: 'Code Agent (Autonomous & Resilient)',
                goal: 'Engenheiro de Software SÃªnior AutÃ´nomo.',
                backstory: 'VocÃª Ã© um desenvolvedor de elite focado em Engenharia e Arquitetura de Software.\nSua filosofia de trabalho Ã© baseada em trÃªs pilares:\n1. Ceticismo Construtivo: VocÃª nÃ£o confia que o cÃ³digo funciona sÃ³ porque vocÃª o escreveu; vocÃª exige provas (evidÃªncia/logs).\n2. Integridade de Dados: VocÃª trata o sistema de arquivos do projeto atual como sagrado. Jamais destrÃ³i para consertar.\n3. Metodologia CientÃ­fica: VocÃª planeja, executa, mede e, se falhar, ajusta a hipÃ³tese (estratÃ©gia) em vez de forÃ§ar a mesma soluÃ§Ã£o.\nVocÃª Ã© especialista em navegar por bases de cÃ³digo desconhecidas seguindo as regras do arquivo AGENTS.md.'
            },
            additionalInstructions: systemPrompt,
            tools: toolRegistry.listTools()
        },
        contextHooks: createCliContextHooks(compressionManager),
        autoExecuteTools: false,
        temperature: config.defaults?.temperature,
        maxTokens: config.defaults?.maxTokens, // Para output por call ao LLM
    });

    // 2. NÃ³ de ValidaÃ§Ã£o ReAct
    const reactValidationNode = createReactValidationNode();

    // 3. NÃ³ de DetecÃ§Ã£o de Tools (com wrapper para formataÃ§Ã£o)
    const toolDetectionNode = createToolDetectionNode();

    // 4. NÃ³ de ExecuÃ§Ã£o de Tools com tratamento de erros
    const baseToolExecutorNode = createToolExecutorNode();

    const toolExecutorNode: GraphNode = async (state: IGraphState, engine: GraphEngine) => {
        logger.info(`[CustomToolExecutor] Executando nÃ³ customizado com tratamento de erros`);

        // Verificar se hÃ¡ erro de execuÃ§Ã£o da ferramenta
        if (state.status === GraphStatus.ERROR) {
            logger.info('[CustomToolExecutor] Erro detectado na execuÃ§Ã£o da ferramenta, preparando feedback para o agente');

            // Extrair mensagem de erro dos logs
            const errorMessage = state.logs?.join('\n') || 'Erro desconhecido na execuÃ§Ã£o da ferramenta';
            const toolName = state.lastToolCall?.toolName || 'desconhecida';

            // Adicionar mensagem de erro formatada ao contexto do agente
            engine.addMessage({
                role: 'system',
                content: `âŒ Erro na execuÃ§Ã£o da ferramenta "${toolName}":\n\n${errorMessage}\n\nPor favor, corrija os parÃ¢metros e tente novamente.`
            });

            logger.info(`[CustomToolExecutor] Mensagem de erro adicionada ao contexto: ${errorMessage.substring(0, 100)}...`);

            // Retornar estado modificado para permitir recuperaÃ§Ã£o
            return {
                ...state,
                status: GraphStatus.RUNNING, // Resetar status para continuar execuÃ§Ã£o
                lastToolCall: undefined, // Limpar a chamada com erro
                // Adicionar metadata para controle do erro
                metadata: {
                    ...(state.metadata || {}),
                    lastToolError: {
                        toolName,
                        errorMessage,
                        timestamp: new Date().toISOString()
                    }
                }
            };
        }

        // Se nÃ£o houver erro, executar o nÃ³ base normalmente
        return baseToolExecutorNode(state, engine);
    };

    // DefiniÃ§Ã£o do Grafo
    const graphDefinition: GraphDefinition = {
        entryPoint: 'agent',
        endNodeName: 'end',
        nodes: {
            agent: agentNode,
            validate: reactValidationNode,
            detect: toolDetectionNode,
            execute: toolExecutorNode,
            end: async (state, engine) => {
                logger.info('[DEBUG] NÃ³ end executado - finalizando grafo');
                return {
                    ...state,
                    status: GraphStatus.FINISHED,
                    shouldEnd: true
                };
            }
        },
        edges: {
            agent: 'validate',
            validate: (state) => {
                // Verificar se a validaÃ§Ã£o ReAct passou
                const validationPassed = (state.metadata as any)?.validation?.passed !== false;

                if (validationPassed) {
                    return 'detect';
                } else {
                    // Se a validaÃ§Ã£o falhou, voltar para o agente com feedback
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

                // PADRONIZADO: Usa o mesmo critÃ©rio do primeiro roteamento (validaÃ§Ã£o)
                const validationPassed = (state.metadata as any)?.validation?.passed !== false;

                if (hasToolCall) {
                    const toolName = state.lastToolCall?.toolName;
                    logger.info(`[DEBUG] Tool call detectada: ${toolName}`);

                    // Verificar se Ã© uma ferramenta final
                    if (toolName === 'final_answer') {
                        logger.info('[DEBUG] Detectado final_answer, redirecionando para fim');
                        return 'end';
                    }

                    if (toolName === 'ask_user') {
                        logger.info('[DEBUG] Detectado ask_user, redirecionando para fim');
                        return 'end';
                    }

                    logger.info('[DEBUG] Tool call comum, indo para execuÃ§Ã£o');
                    return 'execute';
                }

                // PADRONIZADO: Segue exatamente o mesmo padrÃ£o do roteamento de validaÃ§Ã£o
                if (!validationPassed) {
                    return 'agent';
                }

                logger.info('Nenhuma tool call, finalizando');
                return 'end';
            },
            execute: (state) => {
                logger.info(`[DEBUG] Execute node - Ãšltima tool: ${state.lastToolCall?.toolName}`);

                // Se foi ask_user ou final_answer, nÃ£o voltar para agent
                if (state.lastToolCall?.toolName === 'final_answer' || state.lastToolCall?.toolName === 'ask_user') {
                    logger.info('[DEBUG] Tool final executada, encerrando fluxo');
                    return 'end';
                }

                logger.info('[DEBUG] Voltando para agent node');
                return 'agent';
            },
            end: 'end' // Aresta de fallback para o nÃ³ end
        }
    };

    // Criar GraphEngine passando llmConfig para configurar ChatHistoryManager
    const graphEngine = new GraphEngine(
      graphDefinition,
      telemetry
        ? {
            trace: telemetry.trace,
            telemetry: telemetry.telemetry,
            traceContext: telemetry.traceContext,
          }
        : undefined,
      llmConfig
    );

    logger.info('[AgentFlow] Retornando GraphEngine');
    return graphEngine;
}
