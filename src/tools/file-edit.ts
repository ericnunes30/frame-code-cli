import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import fastDiff from 'fast-diff';
import { logger } from '../core/logger';

// Constantes para os tipos de operação do fast-diff
const DIFF_EQUAL = 0;
const DIFF_DELETE = -1;
const DIFF_INSERT = 1;

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

const TOOL_ID = '[apply_search_replace]';

interface SearchReplaceEdit {
  search: string;
  replace: string;
}

interface ApplySearchReplaceParams extends IToolParams {
  filePath: string;
  edits: SearchReplaceEdit[];
}

class ApplySearchReplaceParams {
  static schemaProperties = {
    filePath: 'string',
    edits: 'array',
  } as const;
}

interface ApplySearchReplaceResult {
  success: boolean;
  message: string;
  changesApplied: number;
}

export const applySearchReplaceTool = new class extends ToolBase<ApplySearchReplaceParams, ApplySearchReplaceResult> {
  public readonly name = 'apply_search_replace';
  public readonly description = 'Aplica múltiplas substituições de texto em arquivos (busca e substituição cirúrgica)';
  public readonly parameterSchema = ApplySearchReplaceParams;

  public async execute(params: ApplySearchReplaceParams): Promise<ApplySearchReplaceResult> {
    try {
      toolLog(`${TOOL_ID} ▶ Aplicando substituições`);
      toolLog(`${TOOL_ID} → Caminho: ${params.filePath}`);
      toolLog(`${TOOL_ID} → Edições: ${params.edits.length}`);

      if (!fs.existsSync(params.filePath)) {
        const message = `Arquivo não encontrado: ${params.filePath}`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(message);
      }

      if (!params.edits || params.edits.length === 0) {
        const message = 'Nenhuma edição fornecida';
        errorLog(`${TOOL_ID} ✗ ${message}`);
        throw new Error(message);
      }

      const originalContent = fs.readFileSync(params.filePath, 'utf-8');
      let currentContent = originalContent;
      let changesApplied = 0;

      for (const edit of params.edits) {
        if (!edit.search || edit.search.trim() === '') {
          errorLog(`${TOOL_ID} ✗ Search vazio na edição`);
          continue;
        }

        const searchIndex = currentContent.indexOf(edit.search);
        if (searchIndex === -1) {
          toolLog(`${TOOL_ID} → Pattern não encontrado: "${edit.search.substring(0, 50)}..."`);
          continue;
        }

        const beforeContent = currentContent;
        currentContent = currentContent.replace(edit.search, edit.replace);

        // Usa fast-diff para calcular e mostrar as diferenças
        const diff = fastDiff(beforeContent, currentContent);
        let hasChanges = false;

        for (const [operation, text] of diff) {
          if (operation !== DIFF_EQUAL) {
            hasChanges = true;
            const opSymbol = operation === DIFF_INSERT ? '+' : '-';
            const preview = text.substring(0, 50).replace(/\n/g, '\\n');
            toolLog(`${TOOL_ID}   ${opSymbol} ${preview}${text.length > 50 ? '...' : ''}`);
          }
        }

        if (hasChanges) {
          changesApplied++;
          toolLog(`${TOOL_ID} → Substituição aplicada com sucesso`);
        }
      }

      if (changesApplied === 0) {
        const message = 'Nenhuma substituição foi aplicada (patterns não encontrados)';
        toolLog(`${TOOL_ID} ⚠ ${message}`);
        return {
          success: false,
          message: `⚠ ${message}`,
          changesApplied: 0
        };
      }

      // Mostra um resumo final das diferenças usando fast-diff
      const finalDiff = fastDiff(originalContent, currentContent);
      let addedLines = 0;
      let removedLines = 0;

      for (const [operation, text] of finalDiff) {
        if (operation === DIFF_INSERT) {
          addedLines += text.split('\n').length - 1;
        } else if (operation === DIFF_DELETE) {
          removedLines += text.split('\n').length - 1;
        }
      }

      fs.writeFileSync(params.filePath, currentContent);

      toolLog(`${TOOL_ID} ✓ ${changesApplied} substituição(ões) aplicada(s)`);
      toolLog(`${TOOL_ID} → Linhas adicionadas: ${addedLines}`);
      toolLog(`${TOOL_ID} → Linhas removidas: ${removedLines}`);

      return {
        success: true,
        message: `✓ ${changesApplied} substituição(ões) aplicada(s) em: ${params.filePath} (+${addedLines}/-${removedLines} linhas)`,
        changesApplied
      };
    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Erro ao aplicar substituições (${message})`);
      throw new Error(`✗ Erro ao aplicar substituições em ${params.filePath}: ${message}`);
    }
  }
}();
