/**
 * Interface para configuração de modelo específica de um agente.
 *
 * Define os campos suportados pelo SDK (AgentLLMConfig) que podem
 * ser configurados por agente no arquivo .code/config.json.
 *
 * @module infrastructure/config/agentConfig.interface
 */

/**
 * Configuração de modelo para um agente específico.
 *
 * Corresponde aos campos suportados pelo AgentLLMConfig do SDK.
 */
export interface AgentModelConfig {
    /**
     * Nome do provedor explícito (opcional).
     *
     * Se fornecido, força o uso deste provedor ignorando inferência pelo modelo.
     *
     * @example
     * ```json
     * { "provider": "openai" }
     * { "provider": "anthropic" }
     * ```
     */
    provider?: string;

    /**
     * Nome do modelo de linguagem a ser utilizado.
     *
     * Identificador específico do modelo conforme suportado
     * pelo provedor (ex: 'gpt-4', 'claude-3-sonnet', 'llama-2').
     *
     * @example
     * ```json
     * { "model": "gpt-4" }
     * { "model": "claude-3-5-sonnet-20241022" }
     * ```
     */
    model?: string;

    /**
     * Chave de API para autenticação no provedor.
     *
     * Suporta referência a variável de ambiente usando sintaxe ${VAR}.
     *
     * @example
     * ```json
     * { "apiKey": "${OPENAI_API_KEY}" }
     * { "apiKey": "${ANTHROPIC_API_KEY}" }
     * ```
     */
    apiKey?: string;

    /**
     * URL base para o endpoint da API.
     *
     * Permite usar APIs customizadas ou provedores compatíveis.
     * Suporta referência a variável de ambiente.
     *
     * @example
     * ```json
     * { "baseUrl": "https://api.openai.com/v1" }
     * { "baseUrl": "${LLM_BASE_URL:-https://api.openai.com/v1}" }
     * ```
     */
    baseUrl?: string;

    /**
     * Temperatura para controle de criatividade (0.0 a 1.0).
     *
     * @example
     * ```json
     * { "temperature": 0.2 }  // Para tarefas técnicas
     * { "temperature": 0.7 }  // Para conversas naturais
     * ```
     */
    temperature?: number;

    /**
     * Máximo de tokens de saída.
     *
     * @example
     * ```json
     * { "maxTokens": 1000 }   // Resposta padrão
     * { "maxTokens": 8192 }   // Resposta detalhada
     * ```
     */
    maxTokens?: number;

    /**
     * Máximo de tokens para o contexto (memória).
     *
     * @example
     * ```json
     * { "maxContextTokens": 128000 }  // GPT-4o
     * { "maxContextTokens": 200000 }  // Claude 3.5 Sonnet
     * ```
     */
    maxContextTokens?: number;

    /**
     * Núcleo de sampling (0.0 a 1.0).
     *
     * @example
     * ```json
     * { "topP": 0.1 }   // Respostas conservadoras
     * { "topP": 0.9 }   // Respostas diversificadas
     * ```
     */
    topP?: number;

    /**
     * Capacidades declaradas do modelo/provider.
     */
    capabilities?: {
        /**
         * Suporte a visão (imagens).
         */
        supportsVision?: boolean;
    };
}

/**
 * Estrutura do arquivo .code/config.json.
 */
export interface AgentConfigFile {
    /**
     * Configurações padrão aplicadas a todos os agentes.
     *
     * Sobrescrito por configuração específica do agente.
     */
    defaults?: Partial<AgentModelConfig>;

    /**
     * Configurações específicas por agente.
     *
     * A chave é o nome do agente conforme definido no frontmatter (.md).
     */
    agents?: Record<string, AgentModelConfig>;
}

/**
 * Configuração resolvida para um agente (defaults + específico).
 *
 * Todos os campos são opcionais pois dependem do que está definido
 * no config.json e devem ser combinados com outras fontes (ENV, hardcoded).
 */
export interface ResolvedAgentConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    maxContextTokens?: number;
    topP?: number;
    capabilities?: {
        supportsVision?: boolean;
    };
    /**
     * Indica se a configuração foi encontrada no arquivo.
     */
    fromConfigFile: boolean;
}
