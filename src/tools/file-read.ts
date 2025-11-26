import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import { logger } from '../core/logger';
const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const log = (...args: any[]) => {
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

const TOOL_ID = '[file_read]';

interface FileReadParams extends IToolParams {
  filePath: string;
}

class FileReadParams {
  static schemaProperties = {
    filePath: 'string',
  } as const;
}

export const fileReadTool = new class extends ToolBase<FileReadParams, string> {
  public readonly name = 'file_read';
  public readonly description = 'Ler conteúdo de arquivos (aceita "/" e "\\" em caminhos)';
  public readonly parameterSchema = FileReadParams;

  public async execute(params: FileReadParams): Promise<string> {
    try {
      log(`${TOOL_ID} ▶ Lendo arquivo`);
      log(`${TOOL_ID} → Caminho: ${params.filePath}`);

      if (!fs.existsSync(params.filePath)) {
        const message = `Arquivo não encontrado: ${params.filePath} (verifique uso de "/" ou "\\")`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(`✗ ${message}`);
      }

      const content = fs.readFileSync(params.filePath, 'utf-8');

      log(`${TOOL_ID} ✓ Leitura concluída (${content.length} caractere(s))`);
      return content;
    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Erro ao ler arquivo (${message})`);
      throw new Error(`✗ Erro ao ler arquivo ${params.filePath}: ${message}`);
    }
  }
}();
