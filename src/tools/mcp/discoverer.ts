import * as fs from 'fs';
import * as path from 'path';
import { MCPBase } from '@ericnunes/frame-agent-sdk';
import { McpConfigWithMetadata } from '../../tools/mcp/mcpMetadata';
import { McpJsonConfig, McpJsonEntry } from './mcpConfig.interface';
import { logger } from '../../infrastructure/logging/logger';

/**
 * Informações de uma ferramenta MCP descoberta
 */
export interface IMcpToolInfo {
  name: string;
  description: string;
}

/**
 * Conecta ao MCP e descobre suas ferramentas
 *
 * @param config - Configuração do MCP
 * @returns Lista de ferramentas disponíveis no MCP
 * @throws Error se falhar ao conectar ou descobrir ferramentas
 */
export async function discoverMcpTools(config: McpConfigWithMetadata): Promise<IMcpToolInfo[]> {
  const mcp = new MCPBase(config);

  try {
    logger.debug(`[McpDiscover] Conectando ao MCP ${config.id} (${config.name})...`);
    await mcp.connect();

    logger.debug(`[McpDiscover] Descobrindo ferramentas do MCP ${config.id}...`);
    const tools = await mcp.createTools();

    // MCPBase não tem método disconnect, apenas connect
    // A conexão é encerrada automaticamente quando o objeto é destruído

    const result = tools.map(t => ({
      name: t.name,
      description: t.description
    }));

    logger.info(`[McpDiscover] MCP "${config.name}" descoberto com ${result.length} ferramentas`);

    return result;
  } catch (error: any) {
    logger.error(`[McpDiscover] Erro ao descobrir ferramentas do MCP ${config.id}:`, error);

    throw new Error(`Falha ao descobrir ferramentas do MCP "${config.name}": ${error.message}`);
  }
}

/**
 * Carrega configurações MCP de .code/mcp.json
 *
 * @returns Array de configurações MCP do usuário
 */
export function loadUserCodeMcpConfigs(): McpConfigWithMetadata[] {
  const mcpJsonPath = path.join(process.cwd(), '.code/mcp.json');

  if (!fs.existsSync(mcpJsonPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(mcpJsonPath, 'utf-8');
    const config: McpJsonConfig = JSON.parse(content);

    return (config.mcps || []).map((entry: McpJsonEntry): McpConfigWithMetadata => {
      const configEntry: McpConfigWithMetadata = {
        ...entry,
        mcp: entry.mcp || {}
      };

      // Expande variáveis de ambiente no command e args
      if (entry.command) {
        configEntry.command = expandEnvInString(entry.command);
      }
      if (entry.args) {
        configEntry.args = entry.args.map(arg => expandEnvInString(arg));
      }

      return configEntry;
    });
  } catch (error) {
    logger.error('[McpDiscoverer] Erro ao carregar .code/mcp.json:', error);
    return [];
  }
}

/**
 * Expande ${VAR} ou ${VAR:-default} em uma string usando variáveis de ambiente
 */
function expandEnvInString(value: string): string {
  return value.replace(/\$\{([^:}]+)(?::-([^}]*))?\}/g, (_, varName, defaultValue) => {
    // Se variável existe, usa seu valor
    // Se não existe e tem defaultValue, usa defaultValue
    // Se não existe e não tem defaultValue, retorna string vazia
    if (varName in process.env) {
      return process.env[varName] || '';
    }
    return defaultValue !== undefined ? defaultValue : '';
  });
}
