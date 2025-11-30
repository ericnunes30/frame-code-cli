import { toolRegistry, AskUserTool, FinalAnswerTool, ApprovalTool, TodoListTool } from 'frame-agent-sdk';
import {
  searchTool,
  fileCreateTool,
  applySearchReplaceTool,
  fileReadTool,
  terminalTool,
} from '../tools';
import { registerMcpTools } from '../tools/mcp/register';
import { logger } from './logger';

// Flag para controlar se as ferramentas já foram inicializadas
let toolsInitialized = false;

/**
 * Inicializa todas as ferramentas (síncronas e assíncronas)
 * Deve ser chamado antes de usar o toolRegistry
 */
export async function initializeTools(): Promise<void> {
  if (toolsInitialized) {
    return;
  }

  // Registrar as ferramentas padrão do CLI no registry global
  toolRegistry.register(searchTool);
  toolRegistry.register(fileCreateTool);
  toolRegistry.register(applySearchReplaceTool);
  toolRegistry.register(fileReadTool);
  toolRegistry.register(terminalTool);

  // Registrar ferramentas nativas do SDK usadas pelo modo react
  try { toolRegistry.register(new AskUserTool()); } catch { }
  try { toolRegistry.register(new FinalAnswerTool()); } catch { }
  try { toolRegistry.register(new ApprovalTool()); } catch { }
  try { toolRegistry.register(new TodoListTool()); } catch { }

  // Registrar ferramentas MCP (aguardar conclusão)
  try {
    await registerMcpTools();
  } catch (err) {
    logger.error('Erro ao registrar MCP tools:', err);
  }

  toolsInitialized = true;
}

// Exportar o registry para uso em outros módulos
export { toolRegistry };