import { AgentLLMConfig } from 'frame-agent-sdk';
import { logger } from './logger';
import { loadConfig, loadConfigSync } from './config';

/**
 * Serviço especializado para compressão de contexto usando LLM
 * Implementa compressão inicial, incremental e mesclagem de compressões
 */
export class LLMCompressionService {
  private readonly llmConfig: AgentLLMConfig;
  private readonly modelName: string;

  constructor(llmConfig?: AgentLLMConfig) {
    if (llmConfig) {
      this.llmConfig = llmConfig;
      this.modelName = llmConfig.model;
    } else {
      // Carregar configuração padrão do ambiente
      const config = loadConfigSync();
      this.llmConfig = {
        model: config.defaults?.model || 'gpt-4o-mini',
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseURL,
        defaults: {
          maxTokens: config.defaults?.maxTokens,
          temperature: config.defaults?.temperature,
        }
      };
      this.modelName = this.llmConfig.model;
    }
  }

  /**
   * Realiza a primeira compressão do contexto completo
   */
  async compressInitial(context: string): Promise<string> {
    const prompt = this.buildInitialCompressionPrompt(context);
    
    logger.info('[LLMCompressionService] Iniciando compressão inicial');
    logger.debug(`[LLMCompressionService] Contexto tem ${context.length} caracteres`);
    
    try {
      const result = await this.callLLM(prompt);
      logger.info('[LLMCompressionService] Compressão inicial concluída');
      return result;
    } catch (error) {
      logger.error('[LLMCompressionService] Erro na compressão inicial:', error);
      throw new Error(`Falha na compressão inicial: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Realiza compressão incremental baseada nas compressões anteriores
   */
  async compressIncremental(compressoes: string[], newContext: string): Promise<string> {
    const compressionCount = compressoes.length + 1;
    const prompt = this.buildIncrementalCompressionPrompt(compressoes, newContext, compressionCount);
    
    logger.info(`[LLMCompressionService] Iniciando compressão incremental #${compressionCount}`);
    logger.debug(`[LLMCompressionService] Baseado em ${compressoes.length} compressões anteriores`);
    
    try {
      const result = await this.callLLM(prompt);
      logger.info(`[LLMCompressionService] Compressão incremental #${compressionCount} concluída`);
      return result;
    } catch (error) {
      logger.error(`[LLMCompressionService] Erro na compressão incremental #${compressionCount}:`, error);
      throw new Error(`Falha na compressão incremental: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Mescla duas compressões antigas em uma única
   */
  async mergeCompressions(comp1: string, comp2: string): Promise<string> {
    const prompt = this.buildMergeCompressionPrompt(comp1, comp2);
    
    logger.info('[LLMCompressionService] Iniciando mesclagem de compressões');
    
    try {
      const result = await this.callLLM(prompt);
      logger.info('[LLMCompressionService] Mesclagem de compressões concluída');
      return result;
    } catch (error) {
      logger.error('[LLMCompressionService] Erro na mesclagem de compressões:', error);
      throw new Error(`Falha na mesclagem de compressões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Constrói o prompt para compressão inicial
   */
  private buildInitialCompressionPrompt(context: string): string {
    return `Você é um especialista em sumarizar conversas de desenvolvimento.

Comprima este contexto completo em uma sumarização concisa (máx 300 tokens):
${context}

Formato obrigatório: "COMPRESSÃO 1: [sua sumarização]"

Preserve:
- Objetivos principais do projeto/sessão
- Contexto técnico essencial
- Primeiras decisões ou requisitos
- Arquivos ou tecnologias mencionadas

Responda APENAS com a compressão no formato especificado, sem comentários adicionais.`;
  }

  /**
   * Constrói o prompt para compressão incremental
   */
  private buildIncrementalCompressionPrompt(compressoes: string[], newContext: string, compressionNumber: number): string {
    const compressoesText = compressoes
      .map((comp, index) => `COMPRESSÃO ${index + 1}: ${comp}`)
      .join('\n');

    return `Você está gerenciando o contexto acumulado de uma longa conversa de desenvolvimento.

Compressões anteriores acumuladas:
${compressoesText}

Novo contexto recente:
${newContext}

Crie uma nova compressão que INTEGRE TODAS as informações anteriores com o novo contexto.

Formato obrigatório: "COMPRESSÃO ${compressionNumber}: [nova sumarização integrada]"

Mantenha:
- Progresso acumulado do projeto
- Decisões importantes de todas as etapas
- Problemas resolvidos e pendências
- Continuidade do contexto técnico

Responda APENAS com a compressão no formato especificado, sem comentários adicionais.`;
  }

  /**
   * Constrói o prompt para mesclagem de compressões
   */
  private buildMergeCompressionPrompt(comp1: string, comp2: string): string {
    return `Mescla estas duas compressões antigas em uma única sumarização coesa:

COMPRESSÃO A: ${comp1}
COMPRESSÃO B: ${comp2}

Crie uma nova compressão combinada (máx 400 tokens) que preserve o essencial de ambas.
Formato: "COMPRESSÃO COMBINADA: [sumarização unificada]"

Responda APENAS com a compressão combinada no formato especificado, sem comentários adicionais.`;
  }

  /**
   * Realiza chamada ao LLM para compressão
   */
  private async callLLM(prompt: string): Promise<string> {
    // Import dinâmico para evitar dependências circulares
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: this.llmConfig.apiKey,
      baseURL: this.llmConfig.baseUrl,
    });

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500, // Limitar output da compressão
        temperature: 0.3, // Baixa temperatura para consistência
      });

      const content = response.choices[0]?.message?.content?.trim();
      
      if (!content) {
        throw new Error('Resposta vazia do LLM');
      }

      // Validar formato da resposta
      if (!content.includes('COMPRESSÃO')) {
        logger.warn('[LLMCompressionService] Formato da resposta não parece válido:', content);
      }

      return content;
    } catch (error) {
      logger.error('[LLMCompressionService] Erro na chamada ao LLM:', error);
      throw error;
    }
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return !!(this.llmConfig.apiKey && this.llmConfig.model);
  }

  /**
   * Obtém informações de configuração para debugging
   */
  getConfigInfo(): Record<string, any> {
    return {
      model: this.modelName,
      provider: this.llmConfig.provider,
      hasApiKey: !!this.llmConfig.apiKey,
      hasBaseUrl: !!this.llmConfig.baseUrl,
      maxTokens: this.llmConfig.defaults?.maxTokens,
      temperature: this.llmConfig.defaults?.temperature,
    };
  }
}
