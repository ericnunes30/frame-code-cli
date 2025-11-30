import { ToolBase, IToolParams } from 'frame-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
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

const TOOL_ID = '[file_outline]';

/**
 * Interface para parâmetros da ferramenta file_outline
 */
interface FileOutlineParams extends IToolParams {
  filePath: string;
}

/**
 * Classe para validação de parâmetros da ferramenta file_outline
 */
class FileOutlineParams {
  static schemaProperties = {
    filePath: 'string',
  } as const;
}

/**
 * Enumeração de tipos de símbolos suportados
 */
enum SymbolType {
  CLASS = 'class',
  INTERFACE = 'interface',
  FUNCTION = 'function',
  METHOD = 'method',
  VARIABLE = 'variable',
  ENUM = 'enum',
  TYPE_ALIAS = 'type_alias'
}

/**
 * Interface para representar um símbolo na estrutura do arquivo
 */
interface SymbolInfo {
  name: string;
  type: SymbolType;
  line: number;
  signature: string;
  children?: SymbolInfo[];
}

/**
 * Interface para resultado da ferramenta
 */
interface FileOutlineResult {
  success: boolean;
  message: string;
  outline?: string;
  symbolsCount: number;
}

/**
 * Ferramenta para extrair a estrutura hierárquica de arquivos TypeScript/JavaScript
 * 
 * @description
 * Analisa arquivos TypeScript/JavaScript e extrai uma visão hierárquica dos símbolos
 * (classes, interfaces, funções, métodos) sem incluir o corpo das implementações
 */
export const fileOutlineTool = new class extends ToolBase<FileOutlineParams, FileOutlineResult> {
  public readonly name = 'file_outline';
  public readonly description = 'Extrai estrutura hierárquica de arquivos TypeScript/JavaScript (classes, interfaces, funções, métodos)';
  public readonly parameterSchema = FileOutlineParams;

  /**
   * Valida os parâmetros de entrada
   */
  private validarParametros(params: FileOutlineParams): void {
    if (!params.filePath || params.filePath.trim() === '') {
      throw new Error('✗ Caminho do arquivo é obrigatório');
    }
  }

  /**
   * Extrai assinatura de função/método
   */
  private extrairAssinaturaFuncao(node: any): string {
    const nome = node.id?.name || node.key?.name || 'anonymous';
    const parametros = node.params?.map((param: any) => {
      if (param.type === 'Identifier') {
        return param.name;
      }
      if (param.type === 'AssignmentPattern') {
        return `${param.left.name} = ${this.extrairValorPadrao(param.right)}`;
      }
      return 'param';
    }).join(', ') || '';

    const tipoRetorno = node.returnType ? `: ${this.extrairTipo(node.returnType.typeAnnotation)}` : '';

    return `${nome}(${parametros})${tipoRetorno}`;
  }

  /**
   * Extrai valor padrão de parâmetro
   */
  private extrairValorPadrao(node: any): string {
    if (node.type === 'Literal') {
      return node.raw || String(node.value);
    }
    if (node.type === 'Identifier') {
      return node.name;
    }
    return '...';
  }

  /**
   * Extrai tipo de anotação
   */
  private extrairTipo(node: any): string {
    if (node.type === 'TSAnyKeyword') return 'any';
    if (node.type === 'TSStringKeyword') return 'string';
    if (node.type === 'TSNumberKeyword') return 'number';
    if (node.type === 'TSBooleanKeyword') return 'boolean';
    if (node.type === 'TSVoidKeyword') return 'void';
    if (node.type === 'TSTypeReference' && node.typeName) {
      return node.typeName.name;
    }
    return 'unknown';
  }

  /**
   * Extrai símbolos de um nó da AST
   */
  private extrairSimbolos(node: any, simbolos: SymbolInfo[], nivel: number = 0): void {
    if (!node || typeof node !== 'object') return;

    // Classes
    if (node.type === 'ClassDeclaration' && node.id) {
      const simbolo: SymbolInfo = {
        name: node.id.name,
        type: SymbolType.CLASS,
        line: node.loc.start.line,
        signature: `class ${node.id.name}`,
        children: []
      };

      // Extrair métodos da classe
      if (node.body?.body) {
        node.body.body.forEach((member: any) => {
          if (member.type === 'MethodDefinition' && member.key) {
            const metodo: SymbolInfo = {
              name: member.key.name,
              type: SymbolType.METHOD,
              line: member.loc.start.line,
              signature: this.extrairAssinaturaFuncao(member)
            };
            simbolo.children?.push(metodo);
          }
        });
      }

      simbolos.push(simbolo);
      return;
    }

    // Interfaces
    if (node.type === 'TSInterfaceDeclaration' && node.id) {
      const simbolo: SymbolInfo = {
        name: node.id.name,
        type: SymbolType.INTERFACE,
        line: node.loc.start.line,
        signature: `interface ${node.id.name}`
      };
      simbolos.push(simbolo);
      return;
    }

    // Funções
    if (node.type === 'FunctionDeclaration' && node.id) {
      const simbolo: SymbolInfo = {
        name: node.id.name,
        type: SymbolType.FUNCTION,
        line: node.loc.start.line,
        signature: this.extrairAssinaturaFuncao(node)
      };
      simbolos.push(simbolo);
      return;
    }

    // Variáveis (const/let/var com funções)
    if ((node.type === 'VariableDeclaration') && node.declarations) {
      node.declarations.forEach((decl: any) => {
        if (decl.id && decl.init?.type === 'FunctionExpression' || decl.init?.type === 'ArrowFunctionExpression') {
          const simbolo: SymbolInfo = {
            name: decl.id.name,
            type: SymbolType.FUNCTION,
            line: node.loc.start.line,
            signature: this.extrairAssinaturaFuncao(decl.init)
          };
          simbolos.push(simbolo);
        }
      });
      return;
    }

    // Enums
    if (node.type === 'TSEnumDeclaration' && node.id) {
      const simbolo: SymbolInfo = {
        name: node.id.name,
        type: SymbolType.ENUM,
        line: node.loc.start.line,
        signature: `enum ${node.id.name}`
      };
      simbolos.push(simbolo);
      return;
    }

    // Type Aliases
    if (node.type === 'TSTypeAliasDeclaration' && node.id) {
      const simbolo: SymbolInfo = {
        name: node.id.name,
        type: SymbolType.TYPE_ALIAS,
        line: node.loc.start.line,
        signature: `type ${node.id.name}`
      };
      simbolos.push(simbolo);
      return;
    }

    // Recursão para filhos
    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach((child: any) => this.extrairSimbolos(child, simbolos, nivel));
        } else {
          this.extrairSimbolos(node[key], simbolos, nivel);
        }
      }
    }
  }

  /**
   * Formata a estrutura hierárquica para output
   */
  private formatarEstrutura(simbolos: SymbolInfo[], nivel: number = 0): string {
    const indentacao = '  '.repeat(nivel);
    let resultado = '';

    simbolos.forEach((simbolo, index) => {
      const prefixo = nivel === 0 ? '📁 ' : '📄 ';
      resultado += `${indentacao}${prefixo}${simbolo.signature} (${simbolo.type}, linha ${simbolo.line})\n`;
      
      if (simbolo.children && simbolo.children.length > 0) {
        resultado += this.formatarEstrutura(simbolo.children, nivel + 1);
      }
    });

    return resultado;
  }

  /**
   * Executa a ferramenta de extração de estrutura
   */
  public async execute(params: FileOutlineParams): Promise<FileOutlineResult> {
    try {
      toolLog(`${TOOL_ID} ▶ Extraindo estrutura do arquivo`);
      toolLog(`${TOOL_ID} → Caminho: ${params.filePath}`);

      this.validarParametros(params);

      const resolvedPath = path.resolve(params.filePath);
      
      if (!fs.existsSync(resolvedPath)) {
        const message = `Arquivo não encontrado: ${resolvedPath}`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        return {
          success: false,
          message: `✗ ${message}`,
          symbolsCount: 0
        };
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        const message = `Caminho não é um arquivo: ${resolvedPath}`;
        errorLog(`${TOOL_ID} ✗ ${message}`);
        return {
          success: false,
          message: `✗ ${message}`,
          symbolsCount: 0
        };
      }

      // Ler conteúdo do arquivo
      const conteudo = fs.readFileSync(resolvedPath, 'utf-8');
      
      if (!conteudo.trim()) {
        const message = 'Arquivo vazio';
        toolLog(`${TOOL_ID} ⚠ ${message}`);
        return {
          success: true,
          message: `✓ ${message}`,
          outline: 'Arquivo vazio - nenhum símbolo encontrado',
          symbolsCount: 0
        };
      }

      // Parse do código
      const ast = parse(conteudo, {
        loc: true,
        range: true,
        jsx: true
      });

      // Extrair símbolos
      const simbolos: SymbolInfo[] = [];
      this.extrairSimbolos(ast, simbolos);

      if (simbolos.length === 0) {
        const message = 'Nenhum símbolo encontrado no arquivo';
        toolLog(`${TOOL_ID} ⚠ ${message}`);
        return {
          success: true,
          message: `✓ ${message}`,
          outline: 'Nenhum símbolo encontrado (arquivo pode conter apenas código de execução)',
          symbolsCount: 0
        };
      }

      // Formatar output
      const outline = this.formatarEstrutura(simbolos);
      const symbolsCount = simbolos.reduce((count, simbolo) => {
        return count + 1 + (simbolo.children?.length || 0);
      }, 0);

      toolLog(`${TOOL_ID} ✓ Estrutura extraída (${symbolsCount} símbolo(s))`);
      
      return {
        success: true,
        message: `✓ Estrutura extraída com ${symbolsCount} símbolo(s)`,
        outline,
        symbolsCount
      };

    } catch (error: any) {
      const message = error?.message ?? 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ Erro ao extrair estrutura (${message})`);
      
      return {
        success: false,
        message: `✗ Erro ao extrair estrutura de ${params.filePath}: ${message}`,
        symbolsCount: 0
      };
    }
  }
}();