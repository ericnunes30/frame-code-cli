import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

export interface IConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
  defaults?: {
    model?: string;
    maxTokens?: number; // Output tokens por call
    maxContextTokens?: number; // Tokens de contexto/memória
    temperature?: number;
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

let envLoaded = false;

function ensureEnvLoaded(): void {
  if (envLoaded) return;

  dotenv.config();

  const localEnvPath = join(process.cwd(), '.env.local');
  if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  envLoaded = true;
}

export async function loadConfig(): Promise<IConfig> {
  // Carregar variáveis de ambiente
  ensureEnvLoaded();

  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL,
    defaults: {
      model: process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '4096'), // Output por call
      maxContextTokens: parseInt(process.env.LLM_MAX_TOKENS || '128000'), // Contexto/memória
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    },
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      threshold: parseFloat(process.env.COMPRESSION_THRESHOLD || '0.8'),
      maxCount: parseInt(process.env.COMPRESSION_MAX_COUNT || '5'),
      maxTokens: parseInt(process.env.COMPRESSION_MAX_TOKENS || '300'),
      model: process.env.COMPRESSION_MODEL,
      logging: process.env.COMPRESSION_LOGGING !== 'false',
      persist: process.env.COMPRESSION_PERSIST !== 'false'
    },
    tools: {
      mcpEnabled: process.env.MCP_TOOLS_ENABLED !== 'false',
      agentMode: process.env.AGENT_MODE === 'autonomous' ? 'autonomous' : 'interactive'
    }
  };
}

/**
 * Versão síncrona da loadConfig para uso em contextos onde async não é possível
 * NOTA: Esta função usa require('dotenv').config() que é síncrono
 */
export function loadConfigSync(): IConfig {
  // Carregar variáveis de ambiente de forma síncrona
  ensureEnvLoaded();

  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL,
    defaults: {
      model: process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '4096'), // Output por call
      maxContextTokens: parseInt(process.env.LLM_MAX_TOKENS || '128000'), // Contexto/memória
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    },
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      threshold: parseFloat(process.env.COMPRESSION_THRESHOLD || '0.8'),
      maxCount: parseInt(process.env.COMPRESSION_MAX_COUNT || '5'),
      maxTokens: parseInt(process.env.COMPRESSION_MAX_TOKENS || '300'),
      model: process.env.COMPRESSION_MODEL,
      logging: process.env.COMPRESSION_LOGGING !== 'false',
      persist: process.env.COMPRESSION_PERSIST !== 'false'
    },
    tools: {
      mcpEnabled: process.env.MCP_TOOLS_ENABLED !== 'false',
      agentMode: process.env.AGENT_MODE === 'autonomous' ? 'autonomous' : 'interactive'
    }
  };
}
