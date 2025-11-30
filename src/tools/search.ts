import { ToolBase, IToolParams } from 'frame-agent-sdk';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/logger';
import * as v from 'valibot';

const toolLog = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  logger.info(message);
};

const errorLog = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  logger.error(message);
};

export enum SearchTypeEnum {
  /**
   * Busca apenas no conteúdo dos arquivos (texto dentro dos arquivos)
   * Use quando o usuário estiver procurando por um termo ou código específico dentro dos arquivos
   * Exemplo: "Procure onde está definida a função 'processData'"
   * Parâmetro para LLM: searchType: "content"
   */
  CONTENT = 'content',
  
  /**
   * Busca apenas nos nomes dos arquivos
   * Use quando o usuário estiver procurando por um arquivo específico ou padrão de nome
   * Exemplo: "Procure o arquivo 'logger.ts'"
   * Parâmetro para LLM: searchType: "filename"
   */
  FILENAME = 'filename',
  
  /**
   * Busca tanto no conteúdo quanto nos nomes dos arquivos
   * Use quando o usuário não especificar claramente o tipo de busca
   * Exemplo: "Procure referências a 'config'"
   * Parâmetro para LLM: searchType: "both"
   */
  BOTH = 'both'
}

export enum MatchCaseEnum {
  SENSITIVE = 'sensitive',
  INSENSITIVE = 'insensitive'
}

export enum SearchModeEnum {
  SIMPLE = 'simple',
  REGEX = 'regex'
}

interface SearchParams extends IToolParams {
  query: string;
  searchType?: SearchTypeEnum;
  fileType?: string;
  searchMode?: SearchModeEnum;
  matchCase?: MatchCaseEnum;
  directory?: string;
  maxResults?: number;
  excludePatterns?: string[];
}

interface SearchResult {
  file: string;
  matches: string[];
  matchCount: number;
}

interface SearchResponse {
  success: boolean;
  message: string;
  results: SearchResult[];
  totalMatches: number;
  totalFilesScanned: number;
}

const SearchParamsSchema = v.object({
  query: v.pipe(v.string(), v.minLength(1, 'Query não pode estar vazia')),
  searchType: v.optional(v.enum_(SearchTypeEnum)),
  fileType: v.optional(v.string()),
  searchMode: v.optional(v.enum_(SearchModeEnum)),
  matchCase: v.optional(v.enum_(MatchCaseEnum)),
  directory: v.optional(v.string()),
  maxResults: v.optional(v.pipe(v.number(), v.minValue(1))),
  excludePatterns: v.optional(v.array(v.string()))
});

class SearchParams {
  static schemaProperties = {
    query: 'string',
    'searchType?': 'string',
    'fileType?': 'string',
    'searchMode?': 'string',
    'matchCase?': 'string',
    'directory?': 'string',
    'maxResults?': 'number',
    'excludePatterns?': 'array'
  } as const;
}

class AdvancedSearchTool extends ToolBase<SearchParams, SearchResponse> {
  public readonly name = 'search';
  public readonly description = 'Ferramenta avançada de busca com suporte a conteúdo, nomes de arquivos, regex e filtros';
  public readonly parameterSchema = SearchParams;

  private readonly defaultExcludePatterns = ['node_modules/**', 'dist/**', '.git/**'];

  private validateAndParseParams(params: SearchParams): v.InferOutput<typeof SearchParamsSchema> {
    const result = v.safeParse(SearchParamsSchema, params);
    
    if (!result.success) {
      const errors = v.flatten(result.issues);
      throw new Error(`Parâmetros inválidos: ${JSON.stringify(errors)}`);
    }

    return result.output;
  }

  private buildGlobPattern(fileType?: string): string {
    if (!fileType) {
      return '**/*';
    }

    if (fileType.startsWith('.')) {
      return `**/*${fileType}`;
    }

    return `**/*.${fileType}`;
  }

  private buildIgnorePatterns(excludePatterns?: string[]): string[] {
    const patterns = [...this.defaultExcludePatterns];
    
    if (excludePatterns) {
      patterns.push(...excludePatterns);
    }

    return patterns;
  }

  private normalizeQuery(query: string, matchCase: MatchCaseEnum): string {
    if (matchCase === MatchCaseEnum.INSENSITIVE) {
      return query.toLowerCase();
    }
    return query;
  }

  private createRegex(query: string, searchMode: SearchModeEnum, matchCase: MatchCaseEnum): RegExp {
    if (searchMode === SearchModeEnum.SIMPLE) {
      const flags = matchCase === MatchCaseEnum.INSENSITIVE ? 'gi' : 'g';
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escapedQuery, flags);
    }

    const flags = matchCase === MatchCaseEnum.INSENSITIVE ? 'gi' : 'g';
    
    try {
      return new RegExp(query, flags);
    } catch (error) {
      throw new Error(`Regex inválido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private searchInContent(content: string, regex: RegExp, searchMode: SearchModeEnum): string[] {
    const matches: string[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (searchMode === SearchModeEnum.SIMPLE) {
        if (regex.test(line)) {
          matches.push(`L${index + 1}: ${line.trim()}`);
        }
      } else {
        const lineMatches = line.match(regex);
        if (lineMatches) {
          matches.push(`L${index + 1}: ${line.trim()} (${lineMatches.length} matches)`);
        }
      }
    });

    return matches;
  }

  private searchInFilename(filename: string, regex: RegExp): boolean {
    return regex.test(filename);
  }

  public async execute(params: SearchParams): Promise<SearchResponse> {
    const validatedParams = this.validateAndParseParams(params);
    
    const {
      query,
      searchType = SearchTypeEnum.BOTH,
      fileType,
      searchMode = SearchModeEnum.SIMPLE,
      matchCase = MatchCaseEnum.INSENSITIVE,
      directory = process.cwd(),
      maxResults = 100,
      excludePatterns
    } = validatedParams;
    
    // Determinar quais tipos de busca realizar (definido uma vez para todo o processo)
    const shouldSearchContent = searchType === SearchTypeEnum.CONTENT || searchType === SearchTypeEnum.BOTH;
    const shouldSearchFilename = searchType === SearchTypeEnum.FILENAME || searchType === SearchTypeEnum.BOTH;

    try {
      const pattern = this.buildGlobPattern(fileType);
      const ignorePatterns = this.buildIgnorePatterns(excludePatterns);
      const searchRegex = this.createRegex(query, searchMode, matchCase);

      // Garantir que o diretório seja absoluto
      const absoluteDirectory = path.isAbsolute(directory)
        ? directory
        : path.resolve(process.cwd(), directory);

      // Verificar se o diretório existe
      try {
        await fs.promises.access(absoluteDirectory, fs.constants.R_OK);
      } catch (error) {
        errorLog(`Diretório não acessível: ${absoluteDirectory}`, error);
        throw new Error(`Diretório não encontrado ou sem permissão: ${directory}`);
      }

      const files = await glob(pattern, {
        cwd: absoluteDirectory,
        ignore: ignorePatterns,
        nodir: true,
        absolute: true
      });
      
      // Logs detalhados para diagnóstico
      toolLog('Search debug info:', {
        query,
        searchType,
        directory,
        absoluteDirectory,
        pattern,
        filesFound: files.length,
        cwd: process.cwd(),
        pathSeparator: path.sep,
        first10Files: files.slice(0, 10).map(f => ({
          originalPath: f,
          normalizedPath: f.replace(/\\/g, '/'),
          basename: path.basename(f)
        }))
      });

      const results: SearchResult[] = [];
      let totalMatches = 0;
      let filesScanned = 0;

      toolLog(`Iniciando busca em ${files.length} arquivos`);
      toolLog(`Modo de busca: ${searchType}`);
      toolLog(`Buscar em nomes: ${shouldSearchFilename}, Buscar em conteúdo: ${shouldSearchContent}`);

      for (const file of files) {
        if (results.length >= maxResults) {
          break;
        }
   
        filesScanned++;
        const fileName = path.basename(file);
        let fileMatches: string[] = [];
        let matchCount = 0;
  
        try {
          toolLog(`Processando arquivo: ${file}`);
          
          // Usar as variáveis pré-definidas para determinar quais buscas realizar
          if (shouldSearchFilename && this.searchInFilename(fileName, searchRegex)) {
            fileMatches.push(`Nome do arquivo: ${fileName}`);
            matchCount++;
            toolLog(`Encontrado nome de arquivo: ${fileName}`);
          }

          if (shouldSearchContent) {
            const content = await fs.promises.readFile(file, 'utf-8');
            toolLog(`Lendo conteúdo de ${file}, tamanho: ${content.length} caracteres`);
            const contentMatches = this.searchInContent(content, searchRegex, searchMode);
            
            if (contentMatches.length > 0) {
              fileMatches.push(...contentMatches);
              matchCount += contentMatches.length;
              toolLog(`Encontrados ${contentMatches.length} matches no conteúdo de ${file}`);
            } else {
              toolLog(`Nenhum match encontrado no conteúdo de ${file}`);
            }
          }

          if (matchCount > 0) {
            results.push({
              file,
              matches: fileMatches,
              matchCount
            });
            totalMatches += matchCount;
            toolLog(`Arquivo ${file} adicionado com ${matchCount} matches`);
          } else {
            toolLog(`Arquivo ${file} não teve matches`);
          }
        } catch (error) {
          errorLog(`Erro ao processar arquivo ${file}:`, error);
        }
      }

      const message = `Busca concluída. Encontrados ${totalMatches} matches em ${results.length} arquivos (${filesScanned} arquivos escaneados)`;

      toolLog('=== TOOL RESULT ===');
      toolLog('Search tool result:', JSON.stringify({ message, results: results.length, totalMatches, filesScanned }, null, 2));
      toolLog('===================');

      return {
        success: true,
        message,
        results,
        totalMatches,
        totalFilesScanned: filesScanned
      };
    } catch (error: any) {
      errorLog('Erro na busca avançada:', error);
      
      return {
        success: false,
        message: `Falha ao executar a busca: ${error.message}`,
        results: [],
        totalMatches: 0,
        totalFilesScanned: 0
      };
    }
  }
}

export const searchTool = new AdvancedSearchTool();