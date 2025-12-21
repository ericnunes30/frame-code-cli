import { toolRegistry, AskUserTool, FinalAnswerTool, ApprovalTool, ToDoIstTool, ITool } from 'frame-agent-sdk';
import {
  searchTool,
  fileCreateTool,
  fileEditTool,
  fileReadTool,
  terminalTool,
  fileOutlineTool,
  listSkillsTool,
  enableSkillTool,
  listDirectoryTool
} from '../../tools';
import { registerMcpTools } from '../../tools/mcp/register';
import { logger } from './logger';
import { loadConfigSync } from './config';
import { shouldIncludeTool, getToolFilterConfig } from '../utils/toolRegistryFilter';

// Flag para controlar se as ferramentas já foram inicializadas
let toolsInitialized = false;

/**
 * Inicializa todas as ferramentas (síncronas e assíncronas)
 * Deve ser chamado antes de usar o toolRegistry
 */
export async function initializeTools(options?: { allowAskUser?: boolean }): Promise<void> {
  if (toolsInitialized) {
    return;
  }

  // Carregar configuração
  loadConfigSync();
  const filterConfig = (() => {
    const base = getToolFilterConfig();
    if (typeof options?.allowAskUser === 'boolean') {
      return { ...base, allowAskUser: options.allowAskUser };
    }
    return base;
  })();

  // Criar lista de todas as ferramentas disponíveis
  const allTools: ITool[] = [
    searchTool,
    listDirectoryTool,
    fileCreateTool,
    fileEditTool,
    fileReadTool,
    terminalTool,
    fileOutlineTool,
    listSkillsTool,
    enableSkillTool,
    new FinalAnswerTool(),
    new ToDoIstTool()
  ];

  // Adicionar askUser apenas se não estiver no modo autônomo
  if (filterConfig.allowAskUser) {
    allTools.push(new AskUserTool());
  }

  // Filtrar ferramentas com base na configuração
  const filteredTools = allTools.filter(tool => shouldIncludeTool(tool, filterConfig));

  // Registrar ferramentas filtradas
  filteredTools.forEach(tool => {
    try {
      toolRegistry.register(tool);
    } catch (error) {
      logger.warn(`Falha ao registrar ferramenta ${tool.name}:`, error);
    }
  });

  // Registrar ferramentas MCP apenas se estiverem habilitadas
  if (filterConfig.mcpToolsEnabled) {
    try {
      await registerMcpTools();
    } catch (err) {
      logger.error('Erro ao registrar MCP tools:', err);
    }
  }

  toolsInitialized = true;
}

// Exportar o registry para uso em outros módulos
export { toolRegistry };
