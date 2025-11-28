import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/logger';
const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const toolLog = (...args: any[]) => {
  if (SHOW_TOOL_LOGS_INLINE) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    logger.info(message);
  }
};
const errorLog = (...args: any[]) => {
  if (SHOW_TOOL_LOGS_INLINE) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    logger.error(message);
  }
};

const TOOL_ID = '[file_create]';

interface FileCreateParams extends IToolParams {
  filePath: string;
  content: string;
}

class FileCreateParams {
  static schemaProperties = {
    filePath: 'string',
    content: 'string',
  } as const;
}

export const fileCreateTool = new class extends ToolBase<FileCreateParams, { success: boolean; message: string }> {
  public readonly name = 'file_create';
  public readonly description = 'Criar novos arquivos com conteúdo (aceita "/" e "\\" em caminhos)';
  public readonly parameterSchema = FileCreateParams;

  public async execute(params: FileCreateParams): Promise<{ success: boolean; message: string }> {
    try {
      toolLog(`${TOOL_ID} ▶ Criando arquivo`);
      toolLog(`${TOOL_ID} → Caminho: ${params.filePath}`);

      const dir = path.dirname(params.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        toolLog(`${TOOL_ID} ✓ Diretório criado: ${dir}`);
      }

      fs.writeFileSync(params.filePath, params.content);

      toolLog(`${TOOL_ID} ✓ Arquivo criado`);
      return { success: true, message: `✓ Arquivo criado com sucesso: ${params.filePath}` };
    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Falha ao criar arquivo (${message})`);
      throw new Error(`✗ Erro ao criar arquivo ${params.filePath}: ${message} (use "/" ou "\\")`);
    }
  }
}();
