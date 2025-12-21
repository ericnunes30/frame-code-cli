import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { logger } from '../services/logger';
import { createAgentGraph } from '../../agents/single-agents/agentCode';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from '../services/tools';
import { loadConfig } from '../services/config';
import { readCliInput } from '../utils/readCliInput';
import { createCliTelemetry } from '../telemetry';

export interface AutonomousOptions {
  inputFile?: string;
  outputFile?: string;
  logFile?: string;
  verbose?: boolean;
  additionalInput?: string;
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

    // Inicializar ferramentas
    await initializeTools();

    const { trace, telemetry } = createCliTelemetry();

    // Criar grafo do agente
    const graph = await createAgentGraph(undefined, {
      trace,
      telemetry,
      traceContext: { agent: { label: 'Agente' } }
    });

    // Estado inicial
    const initialState = {
      messages: [{ role: 'user', content: input }],
      data: {},
      status: GraphStatus.RUNNING
    };

    // Executar grafo
    const result = await graph.execute(initialState);

    if (result.status === GraphStatus.ERROR) {
      throw new Error(`Erro durante execuÃ§Ã£o: ${result.state.logs?.join('\n') || 'Erro desconhecido'}`);
    }

    if (result.status !== GraphStatus.FINISHED) {
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

    const lastAssistantMessage = result.state.messages
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

  command
    .description('Executar frame-code-cli em modo autÃ´nomo sem interaÃ§Ã£o humana')
    .argument('[additional-input]', 'Texto adicional com prioridade sobre o arquivo de entrada')
    .option('-i, --input-file <file>', 'Arquivo de entrada com o prompt')
    .option('-o, --output-file <file>', 'Arquivo de saÃ­da para a resposta')
    .option('-l, --log-file <file>', 'Arquivo de log detalhado')
    .option('-v, --verbose', 'Modo verboso com logs detalhados')
    .action(async (additionalInput: string, options: AutonomousOptions) => {
      try {
        // Carregar configuraÃ§Ã£o
        await loadConfig();

        const input = await readCliInput({ inputFile: options.inputFile, additionalInput });

        // Ler input do arquivo primeiro

        // Adicionar input adicional se fornecido
        if (additionalInput) {
          logger.info(`[Autonomous] Adicionando input prioritÃ¡rio: ${additionalInput.substring(0, 100)}...`);
        }

        // Processar
        logger.debug('[Autonomous] Iniciando processamento do input');
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

