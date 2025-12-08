import type { IGraphState } from 'frame-agent-sdk';
import { ChatHistoryManager, TokenizerService } from 'frame-agent-sdk';
import type { Message } from 'frame-agent-sdk';
import { LLMCompressionService } from './LLMCompressionService';
import { logger } from './logger';
import { loadConfig, loadConfigSync } from './config';

/**
 * Interface para configuração do CompressionManager
 */
export interface ICompressionConfig {
  enabled: boolean;
  threshold: number;          // Threshold (0.0 - 1.0) para disparar compressão
  maxCount: number;          // Máximo de compressões acumulativas
  maxTokens: number;         // Tokens máximos por compressão
  model?: string;            // Modelo para compressão (opcional)
  logging: boolean;          // Habilitar logs detalhados
  persist: boolean;          // Persistir entre sessões
}

/**
 * Gerenciador de compressão de contexto para CLI
 * Implementa compressão acumulativa com limite máximo e mesclagem automática
 */
export class CompressionManager {
  private readonly llmService: LLMCompressionService;
  private readonly compressionConfig: ICompressionConfig;
  private readonly maxCompressoes: number;
  
  // Array de compressões acumulativas
  private compressoes: string[] = [];
  private compressionCount = 0;
  
  // Gerenciador de histórico para controle de tokens
  private chatHistoryManager?: ChatHistoryManager;
  private tokenizerService?: TokenizerService;

  constructor(config?: Partial<ICompressionConfig>) {
    // Carregar configuração padrão do ambiente
    const defaultConfig = loadConfigSync();
    
    this.compressionConfig = {
      enabled: true,
      threshold: 0.8,
      maxCount: 5,
      maxTokens: 300,
      logging: true,
      persist: true,
      ...config
    };

    this.maxCompressoes = this.compressionConfig.maxCount;
    
    // Inicializar serviço LLM
    this.llmService = new LLMCompressionService();
    
    // Verificar configuração
    if (!this.llmService.isConfigured()) {
      logger.warn('[CompressionManager] LLM não configurado corretamente');
      logger.debug('[CompressionManager] Config info:', this.llmService.getConfigInfo());
    }

    // Inicializar serviços de tokenização
    this.initializeTokenization(defaultConfig.defaults?.maxContextTokens || 240000);

    // Tentar carregar compressões persistidas
    if (this.compressionConfig.persist) {
      this.loadPersistedCompressions();
    }

    logger.info('[CompressionManager] Inicializado', {
      enabled: this.compressionConfig.enabled,
      maxCompressoes: this.maxCompressoes,
      threshold: this.compressionConfig.threshold,
      currentCompressions: this.compressoes.length
    });
  }

  /**
   * Inicializa serviços de tokenização para controle de uso
   */
  private initializeTokenization(maxContextTokens: number): void {
    try {
      this.tokenizerService = new TokenizerService('gpt-4');
      this.chatHistoryManager = new ChatHistoryManager({
        maxContextTokens,
        tokenizer: this.tokenizerService
      });
      
      logger.debug('[CompressionManager] Serviços de tokenização inicializados');
    } catch (error) {
      logger.error('[CompressionManager] Erro ao inicializar tokenização:', error);
    }
  }

  /**
   * Trata estouro de tokens do GraphEngine
   */
  async handleTokenOverflow(error: Error, state: IGraphState): Promise<IGraphState> {
    if (!this.compressionConfig.enabled) {
      throw error;
    }

    logger.error('[CompressionManager] Estouro de tokens detectado, iniciando compressão emergencial');
    logger.debug('[CompressionManager] Erro original:', error.message);

    try {
      // Extrair mensagens do estado
      const messages = this.extractMessagesFromState(state);
      
      // Realizar compressão emergencial
      await this.performEmergencyCompression(messages);
      
      // Construir novo estado com histórico comprimido
      const compressedState = await this.buildCompressedState(state);
      
      logger.info('[CompressionManager] Compressão emergencial concluída, retentando execução');
      return compressedState;
    } catch (compressionError) {
      logger.error('[CompressionManager] Falha na compressão emergencial:', compressionError);
      // Propagar erro original se compressão falhar
      throw error;
    }
  }

  /**
   * Verifica se compressão proativa é necessária
   */
  async checkProactiveCompression(state: IGraphState): Promise<boolean> {
    if (!this.compressionConfig.enabled || !this.chatHistoryManager) {
      return false;
    }

    try {
      const messages = this.extractMessagesFromState(state);
      
      // Usar TokenizerService diretamente para contar tokens
      const currentTokens = this.tokenizerService!.countTokens(messages);
      const maxTokens = 240000; // Usar o limite configurado
      const usageRatio = currentTokens / maxTokens;

      const shouldCompress = usageRatio >= this.compressionConfig.threshold;

      if (this.compressionConfig.logging) {
        logger.debug(`[CompressionManager] Uso de tokens: ${currentTokens}/${maxTokens} (${(usageRatio * 100).toFixed(1)}%)`);
        
        if (shouldCompress) {
          logger.info(`[CompressionManager] Threshold atingido (${(this.compressionConfig.threshold * 100)}%), compressão proativa recomendada`);
        }
      }

      return shouldCompress;
    } catch (error) {
      logger.error('[CompressionManager] Erro na verificação proativa:', error);
      return false;
    }
  }

  /**
   * Realiza compressão proativa
   */
  async performProactiveCompression(state: IGraphState): Promise<IGraphState> {
    logger.info('[CompressionManager] Iniciando compressão proativa');

    try {
      const messages = this.extractMessagesFromState(state);
      await this.performEmergencyCompression(messages);
      
      return await this.buildCompressedState(state);
    } catch (error) {
      logger.error('[CompressionManager] Erro na compressão proativa:', error);
      throw error;
    }
  }

  /**
   * Realiza compressão emergencial do contexto
   */
  private async performEmergencyCompression(messages: Message[]): Promise<void> {
    if (!this.llmService.isConfigured()) {
      throw new Error('LLM não configurado para compressão');
    }

    // Proteger mensagens importantes
    const protectedMessages = this.extractProtectedMessages(messages);
    const contextToCompress = this.extractCompressibleContext(messages);

    if (contextToCompress.trim().length === 0) {
      logger.warn('[CompressionManager] Nenhum contexto para comprimir');
      return;
    }

    try {
      let newCompression: string;

      if (this.compressionCount === 0) {
        // Primeira compressão
        newCompression = await this.llmService.compressInitial(contextToCompress);
        this.compressionCount = 1;
        this.compressoes.push(newCompression);
      } else {
        // Compressão incremental
        newCompression = await this.llmService.compressIncremental(this.compressoes, contextToCompress);
        
        // Verificar limite de compressões
        if (this.compressoes.length >= this.maxCompressoes) {
          await this.mergeOldestCompressions();
        }
        
        this.compressionCount++;
        this.compressoes.push(newCompression);
      }

      // Persistir se habilitado
      if (this.compressionConfig.persist) {
        this.persistCompressions();
      }

      logger.info(`[CompressionManager] Compressão #${this.compressionCount} realizada com sucesso`);
      
    } catch (error) {
      logger.error('[CompressionManager] Erro durante compressão emergencial:', error);
      throw error;
    }
  }

  /**
   * Mescla as duas compressões mais antigas quando atinge o limite
   */
  private async mergeOldestCompressions(): Promise<void> {
    if (this.compressoes.length < 2) {
      return;
    }

    logger.info('[CompressionManager] Mesclando compressões mais antigas');

    let oldest1: string | undefined;
    let oldest2: string | undefined;
    
    try {
      oldest1 = this.compressoes.shift();
      oldest2 = this.compressoes.shift();
      
      if (!oldest1 || !oldest2) {
        throw new Error('Não há compressões suficientes para mesclar');
      }
      
      const merged = await this.llmService.mergeCompressions(oldest1, oldest2);
      
      // Inserir compressão mesclada no início
      this.compressoes.unshift(merged);
      
      logger.info('[CompressionManager] Compressões mescladas com sucesso');
    } catch (error) {
      logger.error('[CompressionManager] Erro ao mesclar compressões:', error);
      // Re-inserir compressões originais se mesclagem falhar
      if (oldest1 && oldest2) {
        this.compressoes.unshift(oldest2, oldest1);
      }
      throw error;
    }
  }

  /**
   * Extrai mensagens protegidas que não devem ser comprimidas
   */
  private extractProtectedMessages(messages: Message[]): Message[] {
    const protectedMessages: Message[] = [];
    
    // System prompt (primeira mensagem)
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      protectedMessages.push(systemMessage);
    }
    
    // Primeira mensagem do usuário
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      protectedMessages.push(userMessages[0]);
    }
    
    // Última mensagem do usuário
    if (userMessages.length > 1) {
      protectedMessages.push(userMessages[userMessages.length - 1]);
    }
    
    return protectedMessages;
  }

  /**
   * Extrai contexto que pode ser comprimido
   */
  private extractCompressibleContext(messages: Message[]): string {
    const protectedIndices = new Set<number>();
    
    // Marcar índices protegidos
    messages.forEach((msg, index) => {
      if (msg.role === 'system') {
        protectedIndices.add(index);
      } else if (msg.role === 'user') {
        const userMessages = messages.filter(m => m.role === 'user');
        if (index === messages.indexOf(userMessages[0]) || index === messages.lastIndexOf(userMessages[userMessages.length - 1])) {
          protectedIndices.add(index);
        }
      }
    });
    
    // Extrair mensagens não protegidas
    const compressibleMessages = messages.filter((_, index) => !protectedIndices.has(index));
    
    return compressibleMessages
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Extrai mensagens do estado do grafo
   */
  private extractMessagesFromState(state: IGraphState): Message[] {
    return state.messages || [];
  }

  /**
   * Constrói estado comprimido para retomada da execução
   */
  private async buildCompressedState(originalState: IGraphState): Promise<IGraphState> {
    const originalMessages = this.extractMessagesFromState(originalState);
    const protectedMessages = this.extractProtectedMessages(originalMessages);
    
    // Construir novo histórico com compressão
    const newMessages: Message[] = [...protectedMessages];
    
    // Adicionar contexto de compressão como mensagem do sistema
    if (this.compressoes.length > 0) {
      const compressionContext = this.getCompressionPrompt();
      newMessages.unshift({
        role: 'system',
        content: compressionContext
      });
    }
    
    return {
      ...originalState,
      messages: newMessages
    };
  }

  /**
   * Obtém o prompt de compressão para o PromptBuilder
   */
  getCompressionPrompt(): string {
    if (this.compressoes.length === 0) {
      return '';
    }

    return `CONTEXTO ACUMULADO DA SESSÃO:
${this.compressoes.join('\n')}`;
  }

  /**
   * Obtém histórico de compressões para debugging
   */
  getCompressionHistory(): string[] {
    return [...this.compressoes];
  }

  /**
   * Obtém estatísticas atuais de compressão
   */
  getCompressionStats(): Record<string, any> {
    return {
      compressionCount: this.compressionCount,
      currentCompressions: this.compressoes.length,
      maxCompressions: this.maxCompressoes,
      enabled: this.compressionConfig.enabled,
      threshold: this.compressionConfig.threshold,
      compressionHistory: this.compressoes.map((comp, index) => ({
        index: index + 1,
        preview: comp.substring(0, 100) + (comp.length > 100 ? '...' : ''),
        length: comp.length
      }))
    };
  }

  /**
   * Limpa todas as compressões
   */
  clearCompressions(): void {
    this.compressoes = [];
    this.compressionCount = 0;
    
    if (this.compressionConfig.persist) {
      this.clearPersistedCompressions();
    }
    
    logger.info('[CompressionManager] Compressões limpas');
  }

  /**
   * Persiste compressões em arquivo
   */
  private persistCompressions(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const persistPath = path.join(process.cwd(), '.frame-code-compressions.json');
      
      const data = {
        compressoes: this.compressoes,
        compressionCount: this.compressionCount,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(persistPath, JSON.stringify(data, null, 2));
      logger.debug('[CompressionManager] Compressões persistidas');
    } catch (error) {
      logger.error('[CompressionManager] Erro ao persistir compressões:', error);
    }
  }

  /**
   * Carrega compressões persistidas
   */
  private loadPersistedCompressions(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const persistPath = path.join(process.cwd(), '.frame-code-compressions.json');
      
      if (fs.existsSync(persistPath)) {
        const data = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
        this.compressoes = data.compressoes || [];
        this.compressionCount = data.compressionCount || 0;
        
        logger.info(`[CompressionManager] Carregadas ${this.compressoes.length} compressões persistidas`);
      }
    } catch (error) {
      logger.error('[CompressionManager] Erro ao carregar compressões persistidas:', error);
    }
  }

  /**
   * Limpa arquivo de persistência
   */
  private clearPersistedCompressions(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const persistPath = path.join(process.cwd(), '.frame-code-compressions.json');
      
      if (fs.existsSync(persistPath)) {
        fs.unlinkSync(persistPath);
        logger.debug('[CompressionManager] Arquivo de persistência removido');
      }
    } catch (error) {
      logger.error('[CompressionManager] Erro ao limpar persistência:', error);
    }
  }

  /**
   * Força compressão manual do estado atual
   */
  async forceCompression(state: IGraphState): Promise<IGraphState> {
    logger.info('[CompressionManager] Forçando compressão manual');
    
    if (!this.compressionConfig.enabled) {
      throw new Error('Compressão está desabilitada');
    }
    
    return await this.performProactiveCompression(state);
  }
}
