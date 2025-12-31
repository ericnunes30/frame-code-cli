import { toolRegistry, AskUserTool, FinalAnswerTool, ApprovalTool, CallFlowTool, FlowRegistryImpl, FlowRunnerImpl, ITool } from '@ericnunes/frame-agent-sdk';
import {
  searchTool,
  fileCreateTool,
  fileEditTool,
  fileReadTool,
  terminalTool,
  toDoIstTool,
  fileOutlineTool,
  listCapabilitiesTool,
  enableCapabilityTool,
  listDirectoryTool,
  readImageTool,
  sleepTool
} from '../native';
import { registerMcpTools } from '../mcp/register';
import { logger } from '../../infrastructure/logging/logger';
import { loadConfigSync } from '../../infrastructure/config';
import { shouldIncludeTool, getToolFilterConfig } from './toolFilter';

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
    readImageTool,
    fileCreateTool,
    fileEditTool,
    fileReadTool,
    terminalTool,
    sleepTool,
    fileOutlineTool,
    listCapabilitiesTool,
    enableCapabilityTool,
    toDoIstTool,
    new FinalAnswerTool(),
    // Registrar CallFlowTool com FlowRegistry vazio inicial
    // Será configurado com sub-agentes específicos em cada agente que usar
    new CallFlowTool(new FlowRunnerImpl(new FlowRegistryImpl(), {}))
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
