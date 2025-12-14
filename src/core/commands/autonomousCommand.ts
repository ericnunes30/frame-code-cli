import { Command } from 'commander';
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { logger } from '../services/logger';
import { createAgentGraph } from '../../agents/agentCode';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from '../services/tools';
import { loadConfig } from '../services/config';

export interface AutonomousOptions {
  inputFile?: string;
  outputFile?: string;
  logFile?: string;
  verbose?: boolean;
  additionalInput?: string;
}

/**
 * Processa input autônomo sem interação humana
 */
export async function processAutonomousInput(input: string, options: AutonomousOptions): Promise<string> {
  try {
    logger.info('[Autonomous] Iniciando processamento autônomo');

    if (options.verbose) {
      logger.info(`[Autonomous] Input recebido: ${input.substring(0, 200)}...`);
    }

    // Inicializar ferramentas
    await initializeTools();

    // Criar grafo do agente
    const graph = await createAgentGraph();

    // Verificar se compressão está habilitada
    const isCompressionEnabled = graph && typeof graph === 'object' && 'isCompressionEnabled' in graph;
    if (isCompressionEnabled) {
      logger.info('[Autonomous] Executando com compressão inteligente habilitada');
      const stats = graph.getStats?.();
      if (stats?.compression?.enabled) {
        logger.info(`[Autonomous] Memória: ${stats.compression.currentCompressions}/${stats.compression.maxCompressions} compressões`);
      }
    }

    // Estado inicial
    const initialState = {
      messages: [{ role: 'user', content: input }],
      data: {},
      status: GraphStatus.RUNNING
    };

    // Executar grafo
    const result = await graph.execute(initialState);

    if (result.status === GraphStatus.ERROR) {
      throw new Error(`Erro durante execução: ${result.state.logs?.join('\n') || 'Erro desconhecido'}`);
    }

    if (result.status !== GraphStatus.FINISHED) {
      return 'Processamento concluído com status: ' + result.status;
    }

    // Extrair última mensagem do assistente
    const lastAssistantMessage = result.state.messages
      .filter((msg: any) => msg.role === 'assistant')
      .pop();

    return lastAssistantMessage?.content || 'Processamento concluído sem resposta';
  } catch (error) {
    logger.error('[Autonomous] Erro no processamento:', error);
    throw error;
  }
}

/**
 * Comando autônomo para processamento sem interação humana
 */
export function createAutonomousCommand(): Command {
  const command = new Command('autonomous');

  command
    .description('Executar frame-code-cli em modo autônomo sem interação humana')
    .argument('[additional-input]', 'Texto adicional com prioridade sobre o arquivo de entrada')
    .option('-i, --input-file <file>', 'Arquivo de entrada com o prompt')
    .option('-o, --output-file <file>', 'Arquivo de saída para a resposta')
    .option('-l, --log-file <file>', 'Arquivo de log detalhado')
    .option('-v, --verbose', 'Modo verboso com logs detalhados')
    .action(async (additionalInput: string, options: AutonomousOptions) => {
      try {
        // Carregar configuração
        await loadConfig();

        let input: string = '';

        // Ler input do arquivo primeiro
        if (options.inputFile) {
          logger.info(`[Autonomous] Lendo input de: ${options.inputFile}`);
          input = readFileSync(options.inputFile, 'utf-8');
        }

        // Adicionar input adicional se fornecido
        if (additionalInput) {
          logger.info(`[Autonomous] Adicionando input prioritário: ${additionalInput.substring(0, 100)}...`);
          if (input) {
            input += '\n\n' + additionalInput; // Adiciona ao final do arquivo
          } else {
            input = additionalInput; // Usa apenas o texto adicional se não há arquivo
          }
        }

        // Se não tem nem arquivo nem texto adicional, ler do stdin
        if (!input) {
          logger.info('[Autonomous] Lendo input do stdin');
          const chunks: Buffer[] = [];
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

          await new Promise<void>((resolve) => {
            process.stdin.on('end', () => {
              input = Buffer.concat(chunks).toString('utf-8');
              resolve();
            });
          });
        }

        // Processar
        logger.debug('[Autonomous] Iniciando processamento do input');
        const result = await processAutonomousInput(input, options);
        logger.debug(`[Autonomous] Processamento concluído, resultado: ${result.substring(0, 50)}...`);

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
          const logContent = 'Logs detalhados não implementados';
          writeFileSync(options.logFile, logContent, 'utf-8');
        }

        logger.info('[Autonomous] Processamento autônomo concluído com sucesso');
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