import { createToolDetectionNode, type GraphNode, type GraphNodeResult, type IToolCall } from 'frame-agent-sdk';
import { formatToolCallForTerminal } from './formatter';
import { logger } from '../services/logger';
import { toolRegistry } from '../services/tools';

/**
 * Cria um wrapper para o ToolDetectionNode que formata e exibe chamadas de ferramentas
 * @returns Um GraphNode que detecta e formata chamadas de ferramentas
 */
export function createToolDetectionWrapper(): GraphNode {
  // Criar o ToolDetectionNode original
  const originalToolDetectionNode = createToolDetectionNode();

  // Retornar um wrapper que intercepta o resultado
  return async (state, engine): Promise<GraphNodeResult> => {
    // Executar o ToolDetectionNode original
    const result = await originalToolDetectionNode(state, engine);

    // Se uma tool call foi detectada, formatar e exibir (apenas se não for final_answer ou ask_user)
    if (result.lastToolCall) {
      logger.debug(`[ToolWrapper] Tool call detectada: ${result.lastToolCall.toolName}`);

      // Não formatar final_answer e ask_user para evitar duplicação com Thought/Action
      if (result.lastToolCall.toolName !== 'final_answer' && result.lastToolCall.toolName !== 'ask_user') {
        try {
          formatToolCallForTerminal(result.lastToolCall);
          logger.debug(`[ToolWrapper] Tool call formatada e exibida: ${result.lastToolCall.toolName}`);
        } catch (error) {
          logger.error('Erro ao formatar tool call para terminal:', error);
        }
      } else {
        logger.debug(`[ToolWrapper] Pulando formatação de ${result.lastToolCall.toolName} para evitar duplicação`);
      }
    } else {
      logger.debug('[ToolWrapper] Nenhuma tool call detectada');
    }

    // Retornar o resultado original
    return result;
  };
}