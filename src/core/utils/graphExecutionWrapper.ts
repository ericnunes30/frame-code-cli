import type { IGraphState } from 'frame-agent-sdk';
import { GraphEngine, GraphStatus } from 'frame-agent-sdk';
import { CompressionManager } from '../services/CompressionManager';
import { logger } from '../services/logger';

/**
 * Verifica se um erro é relacionado a estouro de tokens/contexto
 */
export function isTokenOverflowError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const tokenErrorKeywords = [
    'maximum context length',
    'too many tokens',
    'context length exceeded',
    'token limit',
    'maximum tokens',
    'context window',
    'tokens exceed'
  ];

  return tokenErrorKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Wrapper para execução do GraphEngine com tratamento automático de compressão
 */
export class GraphExecutionWrapper {
  private readonly graphEngine: GraphEngine;
  private readonly compressionManager: CompressionManager;

  constructor(graphEngine: GraphEngine, compressionManager: CompressionManager) {
    this.graphEngine = graphEngine;
    this.compressionManager = compressionManager;
  }

  /**
   * Executa o grafo com tratamento automático de erros de token
   */
  async execute(state: IGraphState, maxRetries: number = 2): Promise<{ status: GraphStatus; state: IGraphState }> {
    let currentState = state;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        // Verificação proativa apenas em retentativas (attempts > 0)
        if (attempts > 0) {
          // Verificar se precisa de compressão proativa em retentativas
          if (await this.compressionManager.checkProactiveCompression(currentState)) {
            logger.info(`[GraphExecutionWrapper] Realizando compressão proativa (tentativa ${attempts + 1})`);
            currentState = await this.compressionManager.performProactiveCompression(currentState);
          }
        }

        // Executar o grafo
        const result = await this.graphEngine.execute(currentState);

        if (attempts > 0) {
          logger.info(`[GraphExecutionWrapper] Execução bem-sucedida após ${attempts} tentativas`);
        }

        return result;

      } catch (error) {
        const isTokenError = error instanceof Error && isTokenOverflowError(error);

        if (!isTokenError || attempts >= maxRetries) {
          // Se não for erro de tokens ou excedeu tentativas, propagar erro
          logger.error(`[GraphExecutionWrapper] Erro na execução (tentativa ${attempts + 1}):`, error);
          throw error;
        }

        // Erro de tokens detectado - tentar compressão emergencial
        logger.warn(`[GraphExecutionWrapper] Erro de tokens detectado (tentativa ${attempts + 1}):`, error instanceof Error ? error.message : error);

        try {
          currentState = await this.compressionManager.handleTokenOverflow(error as Error, currentState);
          logger.info(`[GraphExecutionWrapper] Compressão emergencial realizada, tentando novamente`);
        } catch (compressionError) {
          logger.error('[GraphExecutionWrapper] Falha na compressão emergencial:', compressionError);
          // Se compressão falhar, propagar erro original
          throw error;
        }
      }

      attempts++;
    }

    // Este código não deveria ser alcançado, mas está aqui para segurança
    throw new Error(`Número máximo de tentativas (${maxRetries}) excedido`);
  }

  /**
   * Obtém o GraphEngine subjacente
   */
  getGraphEngine(): GraphEngine {
    return this.graphEngine;
  }

  /**
   * Obtém o CompressionManager
   */
  getCompressionManager(): CompressionManager {
    return this.compressionManager;
  }

  /**
   * Verifica se a compressão está habilitada
   */
  isCompressionEnabled(): boolean {
    return this.compressionManager.getCompressionStats().enabled;
  }

  /**
   * Obtém estatísticas atuais
   */
  getStats(): Record<string, any> {
    return {
      compression: this.compressionManager.getCompressionStats(),
      graphEngine: {
        // Adicionar estatísticas do GraphEngine se disponível
      }
    };
  }
}

/**
 * Função utilitária para criar um wrapper com configuração automática
 */
export async function createGraphExecutionWrapper(
  graphEngine: GraphEngine,
  compressionConfig?: Partial<import('../services/CompressionManager').ICompressionConfig>
): Promise<GraphExecutionWrapper> {
  const compressionManager = new CompressionManager(compressionConfig);
  return new GraphExecutionWrapper(graphEngine, compressionManager);
}
