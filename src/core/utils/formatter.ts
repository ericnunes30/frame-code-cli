import { IToolCall } from 'frame-agent-sdk';
import { logger } from '../services/logger';

/**
 * Formata uma chamada de ferramenta para exibição no terminal
 * @param toolCall A chamada de ferramenta a ser formatada
 */
export function formatToolCallForTerminal(toolCall: IToolCall): void {
  logger.debug(`[Formatter] Formatando toolCall: ${toolCall.toolName}`);

  // Para final_answer, apenas exibimos o conteúdo da resposta
  if (toolCall.toolName === 'final_answer') {
    const answer = (toolCall.params as any)?.answer || 'Resposta não especificada';
    logger.debug(`[Formatter] Exibindo final_answer: ${answer.substring(0, 50)}...`);
    console.log('');
    console.log('🤖 Agente:');
    console.log(`   ${answer}`);
    console.log('');
    return;
  }

  // Para ask_user, exibimos como pergunta
  if (toolCall.toolName === 'ask_user') {
    const question = (toolCall.params as any)?.question || 'Pergunta não especificada';
    logger.debug(`[Formatter] Exibindo ask_user: ${question}`);
    console.log('');
    console.log('🤖 Agente:');
    console.log(`   Pergunta: ${question}`);
    console.log('');
    return;
  }

  // Para outras ferramentas, exibimos o pensamento real e a ação
  logger.debug(`[Formatter] Exibindo toolCall genérica: ${toolCall.toolName}`);
  console.log('');
  console.log('🤖 Agente:');
  if (toolCall.thought) {
    console.log(`   Thought: ${toolCall.thought}`);
  } else {
    console.log(`   Thought: Executando ferramenta ${toolCall.toolName}`);
  }
  console.log(`   - Action: ${toolCall.toolName} = ${JSON.stringify(toolCall.params || {})}`);
  console.log('');
}

/**
 * Formata uma mensagem do assistant para exibição no terminal
 * @param content O conteúdo da mensagem
 */
export function formatAssistantMessage(content: string): void {
  logger.debug(`[Formatter] Formatando mensagem do assistente: ${content.substring(0, 50)}...`);
  console.log('');
  console.log('🤖 Agente:');
  console.log(`   ${content}`);
  console.log('');
}