import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import { logger } from '../core/logger';
const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const toolLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.info(...args); };
const errorLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.error(...args); };

const TOOL_ID = '[file_edit]';

interface FileEditParams extends IToolParams {
  filePath: string;
  content: string;
}

class FileEditParams {
  static schemaProperties = {
    filePath: 'string',
    content: 'string',
  } as const;
}

export const fileEditTool = new class extends ToolBase<FileEditParams, { success: boolean; message: string }> {
  public readonly name = 'file_edit';
  public readonly description = 'Editar arquivos existentes (aceita "/" e "\\" em caminhos)';
  public readonly parameterSchema = FileEditParams;

  public async execute(params: FileEditParams): Promise<{ success: boolean; message: string }> {
    try {
      toolLog(`${TOOL_ID} ▶ Editando arquivo`);
      toolLog(`${TOOL_ID} → Caminho: ${params.filePath}`);

      if (!fs.existsSync(params.filePath)) {
        const message = `Arquivo não encontrado: ${params.filePath} (verifique uso de "/" ou "\\")`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(message);
      }

      fs.writeFileSync(params.filePath, params.content);

      toolLog(`${TOOL_ID} ✓ Arquivo atualizado`);
      return { success: true, message: `✓ Conteúdo atualizado em: ${params.filePath}` };
    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Erro ao editar arquivo (${message})`);
      throw new Error(`✗ Erro ao editar arquivo ${params.filePath}: ${message}`);
    }
  }
}();
