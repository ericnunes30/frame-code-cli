import { MCPBase, toolRegistry } from 'frame-agent-sdk';
import { logger } from '../core/logger';
import { mcpConfig } from './mcp-config';

export async function registerMcpTools(): Promise<void> {
  const mcp = new MCPBase(mcpConfig);

  try {
    logger.info(`Conectando ao MCP ${mcpConfig.id}...`);
    await mcp.connect();

    const tools = await mcp.createTools();
    if (!tools.length) {
      logger.warn('Nenhuma ferramenta MCP encontrada');
      return;
    }

    tools.forEach((tool: any) => {
      toolRegistry.register(tool);
      logger.debug(`Registrada ferramenta MCP: ${tool.name}`);
    });

    logger.info(`✅ ${tools.length} ferramentas MCP registradas: ${tools.map((t: any) => t.name).join(', ')}`);
  } catch (error: any) {
    logger.error(`❌ Falha crítica ao registrar ferramentas MCP: ${error.message}`);
    logger.debug('Stack trace:', error.stack);

    if (error.code === 'ECONNREFUSED') {
      logger.error('Verifique se o container Docker está rodando');
    }
  }
}