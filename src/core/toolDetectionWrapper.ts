import { createToolDetectionNode, type GraphNode, type GraphNodeResult, type IToolCall } from 'frame-agent-sdk';
import { formatToolCallForTerminal } from './messageFormatter';
import { logger } from './logger';

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
    
    // Se uma tool call foi detectada, formatar e exibir
    if (result.lastToolCall) {
      try {
        formatToolCallForTerminal(result.lastToolCall);
      } catch (error) {
        logger.error('Erro ao formatar tool call para terminal:', error);
      }
    }
    
    // Retornar o resultado original
    return result;
  };
}