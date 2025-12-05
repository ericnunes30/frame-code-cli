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
}

export async function loadConfig(): Promise<IConfig> {
  // Carregar variáveis de ambiente
  dotenv.config();

  // Verificar se existe arquivo .env.local
  const localEnvPath = join(process.cwd(), '.env.local');
  if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL,
    defaults: {
      model: process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '4096'), // Output por call
      maxContextTokens: parseInt(process.env.LLM_MAX_TOKENS || '128000'), // Contexto/memória
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    }
  };
}

/**
 * Versão síncrona da loadConfig para uso em contextos onde async não é possível
 * NOTA: Esta função usa require('dotenv').config() que é síncrono
 */
export function loadConfigSync(): IConfig {
  // Carregar variáveis de ambiente de forma síncrona
  const dotenv = require('dotenv');
  dotenv.config();

  // Verificar se existe arquivo .env.local
  const { existsSync } = require('fs');
  const { join } = require('path');
  const localEnvPath = join(process.cwd(), '.env.local');
  if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL,
    defaults: {
      model: process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '4096'), // Output por call
      maxContextTokens: parseInt(process.env.LLM_MAX_TOKENS || '128000'), // Contexto/memória
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    }
  };
}