// Definição da interface AgentConfig
export interface AgentConfig {
  name?: string;
  instructions?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
}

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Criar uma função de logging condicional com base na variável de ambiente DEBUG ou ENABLE_LOGGING
// Esta função é específica para o agent CLI
export const debugLog = (...args: any[]) => {
  if (process.env['DEBUG'] === 'true' || process.env['ENABLE_LOGGING'] === 'true' || process.env['ENABLE_DEBUG'] === 'true') {
    console.log('[DEBUG]', ...args);
  }
};

// Função de logging geral que pode ser desativada com ENABLE_LOGGING=false
export const log = (...args: any[]) => {
  // Se ENABLE_LOGGING não estiver definido ou for true, mostrar logs
  // Se ENABLE_LOGGING for false, não mostrar logs
  const enableLogging = process.env['ENABLE_LOGGING'] !== 'false';
  if (enableLogging) {
    console.log(...args);
  }
};

// Função de logging de erro que pode ser desativada com ENABLE_LOGGING=false
export const errorLog = (...args: any[]) => {
  // Se ENABLE_LOGGING não estiver definido ou for true, mostrar erros
  // Se ENABLE_LOGGING for false, não mostrar erros
  const enableLogging = process.env['ENABLE_LOGGING'] !== 'false';
  if (enableLogging) {
    console.error(...args);
  }
};

// Função de logging de aviso que pode ser desativada com ENABLE_LOGGING=false
export const warnLog = (...args: any[]) => {
  // Se ENABLE_LOGGING não estiver definido ou for true, mostrar avisos
  // Se ENABLE_LOGGING for false, não mostrar avisos
  const enableLogging = process.env['ENABLE_LOGGING'] !== 'false';
  if (enableLogging) {
    console.warn(...args);
  }
};

// Função de logging para ferramentas que pode ser configurada com ENABLE_TOOL_LOGGING
export const toolLog = (...args: any[]) => {
  // Se ENABLE_TOOL_LOGGING não estiver definido, usar o valor de ENABLE_LOGGING
  // Se ENABLE_TOOL_LOGGING for true, mostrar logs das ferramentas
  // Se ENABLE_TOOL_LOGGING for false, não mostrar logs das ferramentas
  const enableToolLogging = process.env['ENABLE_TOOL_LOGGING'] !== 'false';
  if (enableToolLogging) {
    console.log(...args);
  }
};

export async function loadConfig(): Promise<AgentConfig> {
  // Ler o system prompt do arquivo markdown
  let defaultInstructions = 'Você é um assistente útil que ajuda os usuários através da linha de comando.';
  try {
    // Tentar primeiro o caminho relativo ao src (para desenvolvimento)
    let systemPromptPath = path.join(__dirname, '..', 'system_prompt.md');
    
    // Se não encontrar, tentar o caminho relativo ao diretório atual
    if (!fs.existsSync(systemPromptPath)) {
      systemPromptPath = path.join(process.cwd(), 'src', 'system_prompt.md');
    }
    
    // Se ainda não encontrar, tentar no diretório dist
    if (!fs.existsSync(systemPromptPath)) {
      systemPromptPath = path.join(__dirname, '..', 'dist', 'system_prompt.md');
    }
    
    // Se ainda não encontrar, tentar caminho absoluto
    if (!fs.existsSync(systemPromptPath)) {
      systemPromptPath = '/mnt/g/novosApps/agentes/frame_agent_cli/dist/system_prompt.md';
    }
    
    if (fs.existsSync(systemPromptPath)) {
      defaultInstructions = fs.readFileSync(systemPromptPath, 'utf-8');
    } else {
      console.warn('Arquivo system_prompt.md não encontrado em nenhum dos caminhos esperados');
    }
  } catch (error) {
    console.warn('Erro ao ler arquivo system_prompt.md:', error);
  }

  // Configurações padrão
  const defaultConfig: AgentConfig = {
    name: 'Frame Agent CLI',
    instructions: defaultInstructions,
    provider: (process.env['DEFAULT_PROVIDER'] as any) || 'openai-generic', // provider configurável
    temperature: 0.7,
    maxTokens: 4096,
  };

  // Sobrescrever com variáveis de ambiente
  const envConfig: Partial<AgentConfig> = {};
  
  if (process.env['PROVIDER']) {
    envConfig.provider = process.env['PROVIDER'] as any;
  }
  
  if (process.env['TEMPERATURE']) {
    envConfig.temperature = parseFloat(process.env['TEMPERATURE'] as string);
  }
  
  if (process.env['MAX_TOKENS']) {
    envConfig.maxTokens = parseInt(process.env['MAX_TOKENS'] as string);
  }
  
  if (process.env['INSTRUCTIONS']) {
    envConfig.instructions = process.env['INSTRUCTIONS'];
  }

  // Verificar se existe arquivo de configuração
  const configPath = path.join(process.cwd(), '.frame-agent-config.json');
  let fileConfig: Partial<AgentConfig> = {};
  
  if (fs.existsSync(configPath)) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(configFile);
    } catch (error) {
      console.warn('Erro ao ler arquivo de configuração:', error);
    }
  }

  // Mesclar configurações (prioridade: arquivo > ambiente > padrão)
  return {
    ...defaultConfig,
    ...envConfig,
    ...fileConfig,
  };
}