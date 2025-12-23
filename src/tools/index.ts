// Importar tools migradas do SDK
import { 
  FileReadTool, 
  FileEditTool, 
  FileCreateTool, 
  TerminalTool, 
  SearchTool 
} from 'frame-agent-sdk';

// Re-exportar tools para compatibilidade
export const fileReadTool = FileReadTool;
export const fileEditTool = FileEditTool;
export const terminalTool = TerminalTool;
export const searchTool = SearchTool;
export const fileCreateTool = FileCreateTool;

// Tools locais (não migradas)
export { fileOutlineTool } from './file-outline';
export { listSkillsTool, enableSkillTool } from './skills';
export { listDirectoryTool } from './list-directory';
export { readImageTool } from './read-image';
