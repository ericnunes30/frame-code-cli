import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';
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
  startLine?: number;
  endLine?: number;
  lineNumbers?: boolean;
}

class FileReadParams {
  static schemaProperties = {
    filePath: 'string',
    startLine: 'number?',
    endLine: 'number?',
    lineNumbers: 'boolean?'
  } as const;
}

export const fileReadTool = new class extends ToolBase<FileReadParams, string> {
  public readonly name = 'file_read';
  public readonly description = 'Ler conteúdo de arquivos com suporte a leitura por linha (aceita "/" e "\\" em caminhos)';
  public readonly parameterSchema = FileReadParams;

  private validarParametros(params: FileReadParams): void {
    if (!params.filePath || params.filePath.trim() === '') {
      throw new Error('✗ Caminho do arquivo é obrigatório');
    }

    if (params.startLine !== undefined && params.startLine < 1) {
      throw new Error('✗ startLine deve ser maior ou igual a 1');
    }

    if (params.endLine !== undefined && params.endLine < 1) {
      throw new Error('✗ endLine deve ser maior ou igual a 1');
    }

    if (params.startLine !== undefined && params.endLine !== undefined && params.startLine > params.endLine) {
      throw new Error('✗ startLine não pode ser maior que endLine');
    }
  }

  private lerArquivoCompleto(filePath: string, lineNumbers: boolean): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!lineNumbers) {
      return content;
    }

    const lines = content.split('\n');
    return lines.map((line, index) => `${index + 1} | ${line}`).join('\n');
  }

  private lerPorLinhas(filePath: string, startLine?: number, endLine?: number, lineNumbers?: boolean): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const resultado: string[] = [];
    
    const start = startLine ? Math.max(1, startLine) - 1 : 0;
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;
    
    for (let i = start; i < end; i++) {
      const lineContent = lines[i];
      const formattedLine = lineNumbers ? `${i + 1} | ${lineContent}` : lineContent;
      resultado.push(formattedLine);
    }
    
    return resultado.join('\n');
  }

  public async execute(params: FileReadParams): Promise<string> {
    try {
      log(`${TOOL_ID} ▶ Lendo arquivo`);
      log(`${TOOL_ID} → Caminho: ${params.filePath}`);
      log(`${TOOL_ID} → Parâmetros: startLine=${params.startLine}, endLine=${params.endLine}, lineNumbers=${params.lineNumbers}`);

      this.validarParametros(params);

      const resolvedPath = path.resolve(params.filePath);
      
      if (!fs.existsSync(resolvedPath)) {
        const message = `Arquivo não encontrado: ${resolvedPath}`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(`✗ ${message}`);
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        const message = `Caminho não é um arquivo: ${resolvedPath}`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(`✗ ${message}`);
      }

      let content: string;

      if (params.startLine === undefined && params.endLine === undefined) {
        content = this.lerArquivoCompleto(resolvedPath, params.lineNumbers || false);
      } else {
        content = this.lerPorLinhas(resolvedPath, params.startLine, params.endLine, params.lineNumbers || false);
      }

      const lineCount = content.split('\n').length;
      log(`${TOOL_ID} ✓ Leitura concluída (${lineCount} linha(s), ${content.length} caractere(s))`);
      
      return content;
    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Erro ao ler arquivo (${message})`);
      throw new Error(`✗ Erro ao ler arquivo ${params.filePath}: ${message}`);
    }
  }
}();