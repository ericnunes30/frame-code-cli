import { LLM, ChatMessage } from '@ericnunes/frame_agent';

/**
 * Classe HybridAgent adaptada para a nova arquitetura do frame_agent
 * 
 * Esta classe fornece uma interface compatível com a versão anterior
 * do HybridAgent, mas usando a nova arquitetura baseada no LLM.
 */
export class HybridAgent {
  private llm: LLM;
  private state: 'chat' | 'react' = 'chat';
  private history: ChatMessage[] = [];

  constructor(config: any) {
    // Criar uma instância do LLM com as configurações fornecidas
    this.llm = new LLM(config);
  }

  /**
   * Registra uma tool no agente
   */
  registerTool(tool: any): void {
    // Na nova arquitetura, as tools são gerenciadas automaticamente pelo LLM
    // então não precisamos fazer nada aqui, mas mantemos o método para compatibilidade
  }

  /**
   * Envia uma mensagem para o agente
   */
  async sendMessage(message: string): Promise<string> {
    try {
      // Usar o modo híbrido do LLM
      const response = await this.llm.hybrid(message, undefined, undefined, undefined, undefined, this.history);
      
      // Adicionar a interação ao histórico
      this.history.push({ role: 'user', content: message });
      this.history.push({ role: 'assistant', content: response.content });
      
      return response.content;
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtém o estado atual do agente
   */
  getHybridState(): 'chat' | 'react' {
    return this.state;
  }

  /**
   * Define o estado do agente
   */
  setState(state: 'chat' | 'react'): void {
    this.state = state;
  }

  /**
   * Limpa o histórico do agente
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Prepara uma requisição para o LLM com base no estado atual
   */
  prepareRequestForLLM(
    task: string, 
    history: ChatMessage[], 
    dynamicConfig?: any
  ): { request: any; state: 'chat' | 'react' } {
    // Este método é mantido para compatibilidade, mas não faz muito
    // na nova arquitetura, o LLM cuida disso internamente
    return {
      request: {},
      state: this.state
    };
  }
}