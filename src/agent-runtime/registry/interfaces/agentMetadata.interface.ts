/**
 * Interfaces para o Sistema de Registro de Agentes
 *
 * Define a estrutura de dados para metadados de agentes
 * carregados de arquivos .md com YAML frontmatter.
 *
 * @module core/agents/agentMetadata
 */

import type { AgentType } from '../enums/agentType.enum';

/**
 * Política de restrição de ferramentas para um agente.
 *
 * Permite whitelist/blacklist de tools disponíveis para o agente.
 * Se allow e deny são fornecidos, deny tem precedência.
 */
export interface ToolPolicy {
    /** Lista de ferramentas permitidas (whitelist) */
    allow?: string[];

    /** Lista de ferramentas negadas (blacklist) */
    deny?: string[];
}

/**
 * Metadados completos de um agente.
 *
 * Extraído do arquivo .md (YAML frontmatter + corpo do markdown).
 */
export interface IAgentMetadata {
    /** Identificador único do agente (kebab-case) */
    name: string;

    /** Tipo do agente (main-agent ou sub-agent) */
    type: AgentType;

    /** Se este agente pode funcionar como supervisor */
    canBeSupervisor: boolean;

    /** Descrição de quando usar este agente */
    description: string;

    /** Palavras-chave para busca e descoberta */
    keywords: string[];

    /** Lista de nomes de ferramentas disponíveis */
    tools: string[];

    /** Política de restrição de ferramentas */
    toolPolicy?: ToolPolicy;

    /** Lista de sub-agentes que este agente pode chamar via call_flow */
    subAgents?: (string[] | 'all');

    /** Lista de supervisores que podem usar este sub-agente via call_flow */
    availableFor?: ('all' | string[]);

    /** Modelo LLM a usar (sobrescreve config global) */
    model?: string;

    /** Temperatura para geração (sobrescreve config global) */
    temperature?: number;

    /** Máximo de tokens na resposta (sobrescreve config global) */
    maxTokens?: number;

    /** Caminho opcional para arquivo com prompt base */
    systemPromptPath?: string;

    /** Prompt do sistema (corpo do markdown) */
    systemPrompt: string;

    /** Backstory do agente (seção # Agent Identity) - opcional no frontmatter */
    backstory?: string;

    /** Instruções adicionais do agente (seção ## Prompt Instructions) - opcional no frontmatter */
    additionalInstructions?: string;

    /** Caminho completo do arquivo .md */
    path: string;

    /** Categoria (single-agents ou multi-agents) */
    category?: string;

    /** Habilita compressão de contexto (sobrescreve config global) */
    compressionEnabled?: boolean;

    /** Habilita tratamento customizado de erro no toolExecutorNode */
    customErrorHandling?: boolean;

    /** Modo de fluxo para agentes (ex: hierarchical para supervisores) */
    flowMode?: string;

    /** Indica se o agente deve usar regras do projeto AGENTS.md (default: true) */
    useProjectRules?: boolean;
}

/**
 * Metadados minimizados para exibição em listagens.
 */
export interface IAgentMetadataSummary {
    name: string;
    type: AgentType;
    description: string;
    keywords: string[];
    canBeSupervisor: boolean;
}

/**
 * Opções de configuração para criar um agente a partir de metadados.
 */
export interface IAgentCreationOptions {
    /** Opções de telemetria para o GraphEngine */
    telemetry?: {
        trace?: boolean;
        traceFile?: string;
    };

    /** Sobrescrever configurações de LLM */
    llmOverrides?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
}

/**
 * Resultado do registro de um agente.
 */
export interface IAgentRegistrationResult {
    name: string;
    success: boolean;
    error?: string;
}
