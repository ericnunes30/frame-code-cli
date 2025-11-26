import { ToolBase, IToolParams } from 'frame-agent-sdk';
import { glob } from 'glob';
import * as fs from 'fs';
import { logger } from '../core/logger';
const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const toolLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.info(...args); };
const errorLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.error(...args); };

interface SearchParams extends IToolParams {
  query: string;
  fileType?: string;
}

class SearchParams {
  static schemaProperties = {
    query: 'string',
    'fileType?': 'string',
  } as const;
}

export const searchTool = new class extends ToolBase<SearchParams, { success: boolean; results: Array<{ file: string; matches: string[] }> }> {
  public readonly name = 'search';
  public readonly description = 'Pesquisar por palavras-chave em toda a base de código';
  public readonly parameterSchema = SearchParams;

  public async execute(params: SearchParams): Promise<{ success: boolean; results: Array<{ file: string; matches: string[] }> }> {
    try {
      let pattern = '**/*';
      if (params.fileType) {
        pattern += params.fileType;
      } else {
        pattern += '*';
      }

      const files = await glob(pattern, {
        cwd: process.cwd(),
        ignore: ['node_modules/**', 'dist/**', '.git/**'],
        nodir: true,
      });

      const results: Array<{ file: string; matches: string[] }> = [];
      for (const file of files) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          if (content.includes(params.query)) {
            const lines = content.split('\n');
            const matches: string[] = [];
            lines.forEach((line, index) => {
              if (line.includes(params.query)) {
                matches.push(`L${index + 1}: ${line.trim()}`);
              }
            });
            results.push({ file, matches });
          }
        } catch {
          // ignore unreadable files
        }
      }

      toolLog('=== TOOL RESULT ===');
      toolLog('Search tool result:', JSON.stringify(results, null, 2));
      toolLog('===================');

      return { success: true, results };
    } catch (error: any) {
      errorLog('Erro na busca:', error);
      throw new Error(`Falha ao executar a busca: ${error.message}`);
    }
  }
}();
