import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { logger } from '../../infrastructure/logging/logger';
import { GraphStatus } from '@ericnunes/frame-agent-sdk';
import { initializeTools } from '../../tools';
import { loadConfig } from '../../infrastructure/config';
import { readCliInput } from '../input/reader';
import { createCliTelemetry } from '../../infrastructure/telemetry';
import { cleanupAttachmentsRoot, getAttachmentsCleanupConfigFromEnv, stageImageAttachments } from '../input/images/attachments';
import { AgentRegistry, getDefaultAgent, initializeAgents } from '../../agent-runtime';

export interface AutonomousOptions {
  inputFile?: string;
  outputFile?: string;
  logFile?: string;
  verbose?: boolean;
  additionalInput?: string;
  agent?: string;
  image?: string[];
  imageDetail?: 'low' | 'high' | 'auto';
  _runId?: string;
  _imagePaths?: string[];
}

/**
 * Processa input autÃ´nomo sem interaÃ§Ã£o humana
 */
export async function processAutonomousInput(input: string, options: AutonomousOptions): Promise<string> {
  try {
    logger.info('[Autonomous] Iniciando processamento autÃ´nomo');

    if (options.verbose) {
      logger.info(`[Autonomous] Input recebido: ${input.substring(0, 200)}...`);
    }

    const { trace, telemetry } = createCliTelemetry();

    // Obter agente do registro
    const registry = AgentRegistry.getInstance();

    // Determinar qual agente usar
    let agentName: string;
    if (options.agent) {
      // Validar se o agente existe
      if (!registry.has(options.agent)) {
        throw new Error(`Agente "${options.agent}" não encontrado. Agentes disponíveis: ${registry.listSummaries().map(a => a.name).join(', ')}`);
      }

      // Validar se é main-agent (sub-agentes não podem ser usados diretamente)
      const agent = registry.getMetadata(options.agent);
      if (agent?.type !== 'main-agent') {
        throw new Error(`Agente "${options.agent}" é do tipo "sub-agent" e não pode ser usado diretamente. Use um main-agent: ${registry.listByType('main-agent').map(a => a.name).join(', ')}`);
      }

      agentName = options.agent;
      logger.info(`[Autonomous] Usando agente especificado: ${agentName}`);
    } else {
      // Usar agente padrão
      agentName = getDefaultAgent('code-agent');
      logger.info(`[Autonomous] Usando agente padrão: ${agentName}`);
    }

    const graph = await registry.createEngine(agentName, {
      trace,
      telemetry
    });

    const imagePaths = options._imagePaths ?? [];
    const imageDetail = options.imageDetail ?? 'auto';

    const imageHint =
      imagePaths.length > 0
        ? `Imagens disponiveis (paths locais):\n${imagePaths.map((p) => `- ${p}`).join('\n')}\n\nSe precisar enxergar, chame a tool read_image com source=\"path\" e path do arquivo.`
        : '';

    // Estado inicial
    const messages: any[] = [];

    // Só adiciona imageHint se houver imagens
    if (imageHint && imageHint.trim().length > 0) {
      messages.push({ role: 'system', content: imageHint });
    }

    // Mensagem do usuário
    messages.push({ role: 'user', content: input });

    // Debug: logar as mensagens
    logger.debug('[Autonomous] Mensagens iniciais:', JSON.stringify(messages, null, 2));

    const initialState = {
      messages,
      data: {
        ...(options._runId ? { runId: options._runId } : {}),
        ...(imagePaths.length ? { imagePaths, imageDetail } : {})
      },
      status: GraphStatus.RUNNING
    };

    // Executar grafo
    const result = await graph.execute(initialState);

    // Debug: log do status final
    logger.debug(`[Autonomous] Status final: ${result.status}`);
    logger.debug(`[Autonomous] lastToolCall:`, (result.state as any).lastToolCall);

    if (result.status === GraphStatus.ERROR) {
      throw new Error(`Erro durante execuÃ§Ã£o: ${result.state.logs?.join('\n') || 'Erro desconhecido'}`);
    }

    if (result.status !== GraphStatus.FINISHED) {
      logger.warn(`[Autonomous] Status nÃ£o finalizado: ${result.status}`);
      return 'Processamento concluÃ­do com status: ' + result.status;
    }

    // Extrair Ãºltima mensagem do assistente
    const lastToolCall = (result.state as any).lastToolCall as any;
    if (lastToolCall?.toolName === 'final_answer') {
      const answer = lastToolCall?.params?.answer;
      if (typeof answer === 'string' && answer.trim().length > 0) {
        return answer;
      }
    }

    const lastAssistantMessage: any = result.state.messages
      .filter((msg: any) => msg.role === 'assistant')
      .pop();

    return lastAssistantMessage?.content || 'Processamento concluÃ­do sem resposta';
  } catch (error) {
    logger.error('[Autonomous] Erro no processamento:', error);
    throw error;
  }
}

/**
 * Comando autÃ´nomo para processamento sem interaÃ§Ã£o humana
 */
export function createAutonomousCommand(): Command {
  const command = new Command('autonomous');

  const collect = (value: string, previous: string[]) => {
    return [...(previous ?? []), value];
  };

  command
    .description('Executar frame-code-cli em modo autÃ´nomo sem interaÃ§Ã£o humana')
    .argument('[agent]', 'Agente a ser usado (ex: supervisor, code-agent, chrome-mcp-agent)')
    .argument('[additional-input]', 'Texto adicional com prioridade sobre o arquivo de entrada')
    .option('-i, --input-file <file>', 'Arquivo de entrada com o prompt')
    .option('-o, --output-file <file>', 'Arquivo de saÃ­da para a resposta')
    .option('-l, --log-file <file>', 'Arquivo de log detalhado')
    .option('-v, --verbose', 'Modo verboso com logs detalhados')
    .option('-a, --agent <name>', 'Agente a ser usado (alternativa ao argumento posicional)')
    .option('--image <path>', 'Caminho de imagem local (pode repetir)', collect, [] as string[])
    .option('--image-detail <low|high|auto>', 'Nivel de detalhe para imagem (low|high|auto)', 'auto')
    .action(async (agentArg: string, additionalInput: string, options: AutonomousOptions) => {
      try {
        // Carregar configuraÃ§Ã£o
        await loadConfig();

        // Inicializar ferramentas
        await initializeTools();

        // Inicializar agentes
        await initializeAgents();
        const registry = AgentRegistry.getInstance();

        // Determinar agente e input
        // O primeiro argumento pode ser o agente ou o input
        let resolvedAgent: string | undefined = options.agent;
        let resolvedInput = additionalInput;

        // Se não foi especificado --agent, verificar se o primeiro argumento é um agente
        if (!resolvedAgent && agentArg) {
          // Verificar se agentArg corresponde a um agente main-agent
          const agentMetadata = registry.getMetadata(agentArg);
          if (agentMetadata && agentMetadata.type === 'main-agent') {
            resolvedAgent = agentArg;
            // O input agora é apenas o additionalInput (se houver)
          } else {
            // agentArg não é um agente válido, treat como input
            resolvedInput = agentArg;
          }
        }

        // Se o agente foi especificado via --agent mas não temos input adicional,
        // usar agentArg como input (pois commander não diferencia argumentos)
        if (resolvedAgent && !resolvedInput && agentArg) {
          resolvedInput = agentArg;
        }

        // Setar o agente resolvido nas opções
        if (resolvedAgent) {
          options.agent = resolvedAgent;
        }

        const input = await readCliInput({ inputFile: options.inputFile, additionalInput: resolvedInput });

        // Validar que o input não está vazio
        if (!input || input.trim().length === 0) {
          throw new Error('Input vazio. Forneça uma tarefa para executar.');
        }

        if (options.image && options.image.length > 0) {
          await cleanupAttachmentsRoot(getAttachmentsCleanupConfigFromEnv());
          const staged = await stageImageAttachments({ imagePaths: options.image });
          options._runId = staged.runId;
          options._imagePaths = staged.stagedPaths;
        }

        // Log do agente sendo usado
        if (options.agent) {
          logger.info(`[Autonomous] Usando agente: ${options.agent}`);
        } else {
          logger.info(`[Autonomous] Usando agente padrão`);
        }

        // Adicionar input adicional se fornecido
        if (resolvedInput) {
          logger.info(`[Autonomous] Input prioritário: ${resolvedInput.substring(0, 100)}...`);
        }

        // Processar
        logger.debug('[Autonomous] Iniciando processamento do input');
        logger.debug(`[Autonomous] Input: "${input.substring(0, 200)}"`);
        const result = await processAutonomousInput(input, options);
        logger.debug(`[Autonomous] Processamento concluÃ­do, resultado: ${result.substring(0, 50)}...`);

        // Escrever output
        if (options.outputFile) {
          logger.info(`[Autonomous] Escrevendo output em: ${options.outputFile}`);
          writeFileSync(options.outputFile, result, 'utf-8');
        } else {
          // Imprimir no stdout
          logger.debug('[Autonomous] Imprimindo resultado no console');
          console.log(result);
        }

        // Escrever log detalhado se solicitado
        if (options.logFile) {
          const logContent = 'Logs detalhados nÃ£o implementados';
          writeFileSync(options.logFile, logContent, 'utf-8');
        }

        logger.info('[Autonomous] Processamento autÃ´nomo concluÃ­do com sucesso');
        process.exit(0);

      } catch (error) {
        logger.error('[Autonomous] Erro fatal:', error);

        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

        if (options.outputFile) {
          logger.debug(`[Autonomous] Escrevendo erro no arquivo: ${options.outputFile}`);
          writeFileSync(options.outputFile, `## Erro durante processamento\n\n${errorMessage}`, 'utf-8');
        } else {
          logger.debug('[Autonomous] Imprimindo erro no console');
          console.error('Erro:', errorMessage);
        }

        process.exit(1);
      }
    });

  return command;
}
