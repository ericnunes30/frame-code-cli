import { createToolDetectionNode, type GraphNode, type GraphNodeResult, type IToolCall } from 'frame-agent-sdk';
import { formatToolCallForTerminal } from './messageFormatter';
import { logger } from './logger';
import { toolRegistry } from './tools';

/**
 * Cria um wrapper para o ToolDetectionNode que formata e exibe chamadas de ferramentas
 * @returns Um GraphNode que detecta e formata chamadas de ferramentas
 */
export function createToolDetectionWrapper(): GraphNode {
  // Criar o ToolDetectionNode original
  const originalToolDetectionNode = createToolDetectionNode();

  // Retornar um wrapper que intercepta o resultado
  return async (state, engine): Promise<GraphNodeResult> => {
    // Capturar a última mensagem ANTES da detecção para debug
    let lastMessageContent: any = null;
    let lastMessageRole: string = '';

    if (state.messages && state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      lastMessageRole = lastMessage.role;
      lastMessageContent = lastMessage.content;
    }

    // Executar o ToolDetectionNode original
    const result = await originalToolDetectionNode(state, engine);

    // Se uma tool call foi detectada, formatar e exibir
    if (result.lastToolCall) {
      try {
        formatToolCallForTerminal(result.lastToolCall);
      } catch (error) {
        logger.error('Erro ao formatar tool call para terminal:', error);
      }
    } else if (lastMessageRole === 'assistant' && lastMessageContent) {
      // Se NÃO detectou tool call mas havia mensagem do assistant
        // Isso indica possível erro de validação (SDK não lança exceção)
        logger.debug('[ToolDetectionWrapper] ⚠️ Nenhuma tool call detectada, mas há mensagem do assistant');
        logger.debug('[ToolDetectionWrapper] INPUT COMPLETO DA ÚLTIMA MENSAGEM:');
        logger.debug('[ToolDetectionWrapper] Role:', lastMessageRole);
        logger.debug('[ToolDetectionWrapper] Content:', JSON.stringify(lastMessageContent, null, 2));
        
    }

    // Retornar o resultado original
    return result;
  };
}