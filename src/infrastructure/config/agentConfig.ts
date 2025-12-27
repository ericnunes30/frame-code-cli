/**
 * Loader de configuração de agentes por arquivo.
 *
 * Carrega e processa o arquivo .code/config.json para permitir
 * configuração específica de modelos por agente.
 *
 * @module infrastructure/config/agentConfig
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../infrastructure/logging/logger';
import type {
    AgentConfigFile,
    AgentModelConfig,
    ResolvedAgentConfig
} from './agentConfig.interface';

/**
 * Cache do arquivo de configuração carregado.
 */
let configFileCache: AgentConfigFile | null = null;

/**
 * Regex para encontrar variáveis de ambiente no formato ${VAR} ou ${VAR:-default}.
 */
const ENV_VAR_REGEX = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

/**
 * Substitui variáveis de ambiente em uma string.
 *
 * Suporta os formatos:
 * - ${VAR} - substituído pelo valor da variável ou vazio se não existir
 * - ${VAR:-default} - substituído pelo valor da variável ou 'default' se não existir
 *
 * @param value - String que pode conter variáveis de ambiente
 * @returns String com variáveis substituídas
 */
function substituteEnvVars(value: string): string {
    if (typeof value !== 'string') {
        return value;
    }

    return value.replace(ENV_VAR_REGEX, (_match, varName, defaultValue) => {
        const envValue = process.env[varName];
        if (envValue !== undefined) {
            return envValue;
        }
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        return '';
    });
}

/**
 * Converte um valor para número se for uma string numérica.
 *
 * @param value - Valor a ser convertido
 * @returns Número ou valor original
 */
function toNumberIfPossible(value: unknown): unknown {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+\.?\d*$/.test(trimmed)) {
            return parseFloat(trimmed);
        }
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
    }
    return value;
}

/**
 * Substitui variáveis de ambiente recursivamente em um objeto.
 *
 * @param config - Objeto de configuração
 * @returns Objeto com variáveis substituídas e convertidas para tipos apropriados
 */
function substituteEnvVarsRecursive<T>(config: T): T {
    if (typeof config === 'string') {
        const substituted = substituteEnvVars(config);
        return toNumberIfPossible(substituted) as T;
    }

    if (Array.isArray(config)) {
        return config.map(item => substituteEnvVarsRecursive(item)) as T;
    }

    if (config !== null && typeof config === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(config)) {
            result[key] = substituteEnvVarsRecursive(value);
        }
        return result as T;
    }

    return config;
}

/**
 * Carrega o arquivo .code/config.json.
 *
 * @returns Objeto de configuração ou null se arquivo não existir
 */
function loadConfigFile(): AgentConfigFile | null {
    if (configFileCache !== null) {
        return configFileCache;
    }

    const configPath = path.join(process.cwd(), '.code', 'config.json');

    if (!fs.existsSync(configPath)) {
        logger.debug('[agentConfig] Arquivo .code/config.json não encontrado, usando apenas ENV');
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content) as AgentConfigFile;

        configFileCache = parsed;
        logger.debug('[agentConfig] Arquivo .code/config.json carregado com sucesso');

        return parsed;
    } catch (error) {
        logger.error('[agentConfig] Erro ao carregar .code/config.json:', error);
        return null;
    }
}

/**
 * Obtém a configuração de um agente específico.
 *
 * A configuração é construída mesclando:
 * 1. defaults do config.json (base)
 * 2. configuração específica do agente (sobrescreve defaults)
 *
 * Variáveis de ambiente são substituídas em todos os valores string.
 *
 * @param agentName - Nome do agente conforme definido no frontmatter
 * @returns Configuração resolvida para o agente
 */
export function loadAgentConfig(agentName: string): ResolvedAgentConfig {
    const configFile = loadConfigFile();

    // Se não existe arquivo de configuração, retorna configuração vazia
    if (!configFile) {
        return {
            fromConfigFile: false
        };
    }

    // Mesclar defaults com configuração específica do agente
    const agentSpecific = configFile.agents?.[agentName];
    const merged: AgentModelConfig = {
        ...(configFile.defaults || {}),
        ...(agentSpecific || {})
    };

    // Substituir variáveis de ambiente recursivamente
    const resolved = substituteEnvVarsRecursive<AgentModelConfig>(merged);

    return {
        ...resolved,
        fromConfigFile: true
    };
}

/**
 * Limpa o cache do arquivo de configuração.
 *
 * Útil para testes ou quando o arquivo é modificado em runtime.
 */
export function clearConfigCache(): void {
    configFileCache = null;
}

/**
 * Recarrega o arquivo de configuração.
 *
 * Limpa o cache e recarrega o arquivo do disco.
 */
export function reloadConfig(): void {
    clearConfigCache();
    loadConfigFile();
}
