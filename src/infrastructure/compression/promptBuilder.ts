import { PromptBuilder } from '@ericnunes/frame-agent-sdk';
import type { AgentInfo, PromptMode, ToolSchema } from '@ericnunes/frame-agent-sdk';

import { logger } from '../logging/logger';

/**
 * Interface extendida para configuração do PromptBuilder da CLI
 * Inclui suporte a contexto de compressão de memória
 */
export interface ICLIPromptBuilderConfig {
  /** Modo do agente */
  mode: PromptMode;

  /** Informações do agente */
  agentInfo: AgentInfo;

  /** Instruções adicionais do usuário */
  additionalInstructions?: string;

  /** Histórico de compressão de contexto */
  compressionHistory?: string;

  /** Tools disponíveis */
  tools?: ToolSchema[];

  /** Nomes das tools para conversão automática */
  toolNames?: string[];

  /** Lista de tarefas */
  taskList?: {
    items: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>
  };

  /** Skills disponíveis */

}

/**
 * Wrapper genérico do PromptBuilder com suporte a compressão de memória
 * Não contém prompts específicos - apenas adiciona contexto de compressão ao que for passado
 */
export class CLIPromptBuilder {
  /**
   * Formata o contexto de compressão com instruções claras para o LLM
   */
  private static formatCompressionContext(compressionHistory: string): string {
    return [
      '---',
      '',
      '## Context History',
      '',
      'O contexto anterior desta sessão foi comprimido para preservar informações importantes:',
      '',
      compressionHistory.trim(),
      '',
      'Use este contexto histórico para entender o que já foi discutido e continuar a conversa de forma coerente.'
    ].join('\n');
  }

  /**
   * Constrói System Prompt com suporte a contexto de compressão
   */
  static buildSystemPrompt(config: ICLIPromptBuilderConfig): string {
    const { mode, agentInfo, additionalInstructions, compressionHistory, tools, toolNames, taskList } = config;

    // Se houver contexto de compressão, formatar com instruções claras
    let finalAdditionalInstructions = additionalInstructions || '';

    if (compressionHistory && compressionHistory.trim().length > 0) {
      const formattedCompressionContext = this.formatCompressionContext(compressionHistory);

      // Adicionar contexto de compressão formatado no final das instruções adicionais
      if (finalAdditionalInstructions.trim().length > 0) {
        finalAdditionalInstructions = finalAdditionalInstructions + '\n\n' + formattedCompressionContext;
      } else {
        finalAdditionalInstructions = formattedCompressionContext;
      }
    }

    // Usar o PromptBuilder original com as instruções finais
    return PromptBuilder.buildSystemPrompt({
      mode,
      agentInfo,
      additionalInstructions: finalAdditionalInstructions,
      tools,
      toolNames,
      taskList
      // skills removido pois não existe no tipo PromptBuilderConfig do SDK
    });
  }

  /**
   * Constrói System Prompt apenas com contexto de compressão (sem instruções adicionais)
   */
  static buildSystemPromptWithCompression(
    mode: PromptMode,
    agentInfo: AgentInfo,
    compressionHistory: string,
    options?: {
      tools?: ToolSchema[];
      toolNames?: string[];
      taskList?: any;

    }
  ): string {
    return this.buildSystemPrompt({
      mode,
      agentInfo,
      compressionHistory,
      ...options
    });
  }

  /**
   * Atualiza um prompt existente adicionando contexto de compressão
   */
  static addCompressionToPrompt(existingPrompt: string, compressionHistory: string): string {
    if (!compressionHistory || compressionHistory.trim().length === 0) {
      return existingPrompt;
    }

    const compressionSection = [
      '---',
      '',
      '## Context History',
      '',
      compressionHistory.trim()
    ].join('\n');

    // Tentar inserir antes da seção "Additional Instructions" se existir
    const additionalInstructionsIndex = existingPrompt.indexOf('## Additional Instructions');

    if (additionalInstructionsIndex > -1) {
      // Inserir antes da seção Additional Instructions
      const before = existingPrompt.substring(0, additionalInstructionsIndex);
      const after = existingPrompt.substring(additionalInstructionsIndex);
      return before + compressionSection + '\n\n' + after;
    } else {
      // Adicionar no final do prompt
      return existingPrompt + '\n\n' + compressionSection;
    }
  }

  /**
   * Remove contexto de compressão de um prompt existente
   */
  static removeCompressionFromPrompt(prompt: string): string {
    const compressionSectionStart = prompt.indexOf('## Context History');

    if (compressionSectionStart === -1) {
      return prompt; // Não há seção de compressão
    }

    // Encontrar o final da seção (próxima seção ou fim do prompt)
    const compressionSectionContent = prompt.substring(compressionSectionStart);
    const nextSectionIndex = compressionSectionContent.indexOf('\n---', 3);

    if (nextSectionIndex > -1) {
      // Remover apenas a seção de compressão
      const before = prompt.substring(0, compressionSectionStart);
      const after = compressionSectionContent.substring(nextSectionIndex + 4);
      return before + after;
    } else {
      // Remover desde o início da seção até o fim
      return prompt.substring(0, compressionSectionStart).trim();
    }
  }

  /**
   * Verifica se um prompt contém contexto de compressão
   */
  static hasCompressionContext(prompt: string): boolean {
    return prompt.includes('## Context History');
  }

  /**
   * Extrai o contexto de compressão de um prompt
   */
  static extractCompressionContext(prompt: string): string | null {
    const compressionSectionStart = prompt.indexOf('## Context History');

    if (compressionSectionStart === -1) {
      return null;
    }

    const compressionSectionContent = prompt.substring(compressionSectionStart + '## Context History'.length);
    const endOfSectionIndex = compressionSectionContent.indexOf('\n---');

    if (endOfSectionIndex > -1) {
      return compressionSectionContent.substring(1, endOfSectionIndex).trim();
    } else {
      return compressionSectionContent.substring(1).trim();
    }
  }

  /**
   * Constrói prompt para debugging mostrando todas as seções
   */
  static buildDebugPrompt(config: ICLIPromptBuilderConfig): string {
    const prompt = this.buildSystemPrompt(config);

    logger.debug('[CLIPromptBuilder] Prompt construído:', {
      mode: config.mode,
      hasCompression: !!config.compressionHistory,
      hasAdditionalInstructions: !!config.additionalInstructions,
      hasTools: !!(config.tools || config.toolNames),

      promptLength: prompt.length
    });

    return prompt;
  }
}

/**
 * Função utilitária para criar configuração de prompt padrão
 */
export function createDefaultPromptConfig(
  mode: PromptMode,
  agentInfo: AgentInfo,
  additionalInstructions?: string
): ICLIPromptBuilderConfig {
  return {
    mode,
    agentInfo,
    additionalInstructions
  };
}

/**
 * Função utilitária para criar configuração com compressão
 */
export function createCompressionPromptConfig(
  mode: PromptMode,
  agentInfo: AgentInfo,
  compressionHistory: string,
  additionalInstructions?: string
): ICLIPromptBuilderConfig {
  return {
    mode,
    agentInfo,
    additionalInstructions,
    compressionHistory
  };
}
