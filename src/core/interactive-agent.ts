import { HybridAgent } from './hybrid-agent';
import { log, errorLog } from '../utils/config-loader';
import { 
  searchTool, 
  fileCreateTool, 
  fileEditTool, 
  fileReadTool, 
  terminalTool
} from '../tools';

/**
 * Cria e gerencia um agente híbrido adaptativo com interface interativa
 * Esta versão usa o HybridAgent do frame_agent para o ciclo ReAct completo
 */
export class InteractiveAgent {
  private agent: HybridAgent;
  private showState: boolean;

  constructor(showState: boolean = false) {
    this.showState = showState;
    const apiKey = process.env['OPENAI_API_KEY'];
    const model = process.env['MODEL'] || 'gpt-4o-mini';
    
    // Criar configuração para o HybridAgent
    const config = {
      defaultProvider: 'openai',
      defaultModel: model,
      providers: {
        openai: {
          apiKey: apiKey,
          baseURL: process.env['OPENAI_BASE_URL']
        }
      }
    };
    
    // Criar agente híbrido com a nova arquitetura
    this.agent = new HybridAgent(config);
    
    // Registrar tools padrão
    this.registerDefaultTools();
  }

  /**
   * Registra as tools padrão no agente
   */
  private registerDefaultTools(): void {
    // Na nova arquitetura, as tools são registradas automaticamente pelo LLM
    // então não precisamos fazer nada aqui, mas mantemos o método para compatibilidade
    
    // Registrar tools manualmente se necessário
    this.agent.registerTool(searchTool);
    this.agent.registerTool(fileCreateTool);
    this.agent.registerTool(fileEditTool);
    this.agent.registerTool(fileReadTool);
    this.agent.registerTool(terminalTool);
  }

  /**
   * Envia uma mensagem única ao agente
   */
  async sendMessage(message: string): Promise<string> {
    const response = await this.agent.sendMessage(message);
    
    // Mostrar estado se solicitado
    if (this.showState) {
      log(`[Estado híbrido: ${this.agent.getHybridState()}]`);
    }
    
    // Verificar se a resposta já foi exibida pelo AdaptiveExecutor
    if (process.env.RESPONSE_ALREADY_DISPLAYED === 'true') {
      // Resetar a flag e não retornar a resposta duplicada
      delete process.env.RESPONSE_ALREADY_DISPLAYED;
      return response; // Still return for programmatic use but avoid duplicate display
    }
    
    return response;
  }

  /**
   * Inicia uma sessão interativa (REPL)
   */
  async startInteractiveSession(instructions?: string): Promise<void> {
    // Adicionar instruções do sistema, se fornecidas
    // Na nova arquitetura, isso seria feito de forma diferente, mas mantemos para compatibilidade
    
    log('Modo híbrido adaptativo interativo.');
    log('O agente alternará automaticamente entre conversação e uso de ferramentas conforme necessário.');
    if (this.showState) {
      log('Estado híbrido será mostrado após cada resposta.');
    }
    log('Digite "exit" para sair.');
    log('Comandos especiais: /help para ajuda');
    
    // Implementar REPL
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = () => {
      rl.question('> ', async (input: string) => {
        if (input.toLowerCase() === 'exit') {
          log('Saindo do modo híbrido...');
          rl.close();
          return;
        }
        
        // Comandos especiais
        if (input === '/help') {
          log('Comandos disponíveis:');
          log('/help - Mostrar esta ajuda');
          log('exit - Sair do programa');
          askQuestion();
          return;
        }
        
        try {
          // Enviar mensagem ao agente híbrido
          const response = await this.agent.sendMessage(input);
          
          // Verificar se a resposta já foi exibida pelo AdaptiveExecutor
          if (process.env.RESPONSE_ALREADY_DISPLAYED !== 'true') {
            log(response);
          } else {
            // Resetar a flag para próximas execuções
            delete process.env.RESPONSE_ALREADY_DISPLAYED;
          }
          
          // Mostrar estado se solicitado
          if (this.showState) {
            log(`[Estado híbrido: ${this.agent.getHybridState()}]`);
          }
        } catch (error) {
          errorLog('Erro ao enviar mensagem:', error);
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  }

  /**
   * Obtém o estado híbrido atual do agente
   */
  getHybridState(): 'chat' | 'react' {
    return this.agent.getHybridState();
  }

  /**
   * Registra uma tool personalizada
   */
  registerTool(tool: any): void {
    this.agent.registerTool(tool);
  }

  /**
   * Limpa o histórico do agente
   */
  clearHistory(): void {
    this.agent.clearHistory();
  }
}