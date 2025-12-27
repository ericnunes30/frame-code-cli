/**
 * Interface para configuração da aplicação.
 *
 * Define o contrato para acesso a configurações.
 */
export interface IConfig {
    provider: string;
    apiKey: string;
    baseURL?: string;
    vision?: {
        supportsVision?: boolean;
        provider?: string;
        apiKey?: string;
        baseURL?: string;
        model?: string;
    };
    defaults?: {
        model?: string;
        maxTokens?: number; // Output tokens por call
        maxContextTokens?: number; // Tokens de contexto/memória
        temperature?: number;
        topP?: number;
    };
    skills?: {
        enabled?: boolean;
        directory?: string;
        maxTokens?: number;
        relevanceThreshold?: number;
    };
    compression?: {
        enabled?: boolean;
        threshold?: number;          // Threshold (0.0 - 1.0) para disparar compressão
        maxCount?: number;          // Máximo de compressões acumulativas
        maxTokens?: number;         // Tokens máximos por compressão
        model?: string;            // Modelo para compressão (opcional)
        logging?: boolean;          // Habilitar logs detalhados
        persist?: boolean;          // Persistir entre sessões
    };
    tools?: {
        mcpEnabled?: boolean;
        agentMode?: 'autonomous' | 'interactive';
    };
}
