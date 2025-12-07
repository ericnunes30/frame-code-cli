import { ITool } from 'frame-agent-sdk';

/**
 * Interface para configuração do filtro de ferramentas
 */
export interface ToolFilterConfig {
  mode: 'autonomous' | 'interactive';
  mcpToolsEnabled: boolean;
  excludedTools: string[];
}

/**
 * Obtém configuração do ambiente para filtragem de ferramentas
 */
export function getToolFilterConfig(): ToolFilterConfig {
  return {
    mode: process.env.AGENT_MODE === 'autonomous' ? 'autonomous' : 'interactive',
    mcpToolsEnabled: process.env.MCP_TOOLS_ENABLED !== 'false',
    excludedTools: getExcludedToolsList()
  };
}

/**
 * Obtém lista de ferramentas que devem ser excluídas
 */
function getExcludedToolsList(): string[] {
  const excluded = process.env.EXCLUDED_TOOLS || '';
  return excluded.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
}

/**
 * Verifica se uma ferramenta deve ser incluída com base na configuração
 */
export function shouldIncludeTool(tool: ITool, config: ToolFilterConfig): boolean {
  // Verificar se a ferramenta está na lista de exclusão
  if (config.excludedTools.includes(tool.name)) {
    return false;
  }

  // No modo autônomo, não incluir askUser
  if (config.mode === 'autonomous' && tool.name === 'askUser') {
    return false;
  }

  // Se as ferramentas MCP estão desabilitadas, não incluir ferramentas MCP
  if (!config.mcpToolsEnabled && tool.name.startsWith('mcp_')) {
    return false;
  }

  // Excluir especificamente a approvalTool
  if (tool.name === 'approval') {
    return false;
  }

  return true;
}

/**
 * Filtra um array de ferramentas com base na configuração
 */
export function filterTools(tools: ITool[], config?: ToolFilterConfig): ITool[] {
  const filterConfig = config || getToolFilterConfig();
  return tools.filter(tool => shouldIncludeTool(tool, filterConfig));
}
