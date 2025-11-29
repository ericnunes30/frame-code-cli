import { IToolCall } from 'frame-agent-sdk';

/**
 * Formata uma chamada de ferramenta para exibição no terminal
 * @param toolCall A chamada de ferramenta a ser formatada
 */
export function formatToolCallForTerminal(toolCall: IToolCall): void {
  // Para final_answer, apenas exibimos o conteúdo da resposta
  if (toolCall.toolName === 'final_answer') {
    const answer = (toolCall.params as any)?.answer || 'Resposta não especificada';
    console.log('');
    console.log('🤖 Agente:');
    console.log(`   ${answer}`);
    console.log('');
    return;
  }
  
  // Para ask_user, exibimos como pergunta
  if (toolCall.toolName === 'ask_user') {
    const question = (toolCall.params as any)?.question || 'Pergunta não especificada';
    console.log('');
    console.log('🤖 Agente:');
    console.log(`   Pergunta: ${question}`);
    console.log('');
    return;
  }
  
  // Para outras ferramentas, exibimos o pensamento e a ação
  console.log('');
  console.log('🤖 Agente:');
  console.log(`   O usuário quer que eu execute a ferramenta \`${toolCall.toolName}\` para isso.`);
  console.log(`   - Action: ${toolCall.toolName} = ${JSON.stringify(toolCall.params || {})}`);
  console.log('');
}

/**
 * Formata uma mensagem do assistant para exibição no terminal
 * @param content O conteúdo da mensagem
 */
export function formatAssistantMessage(content: string): void {
  console.log('');
  console.log('🤖 Agente:');
  console.log(`   ${content}`);
  console.log('');
}