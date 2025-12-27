/**
 * Interface para configuração de MCPs via .code/mcp.json
 *
 * Permite que usuários configurem MCPs personalizados sem modificar o código-fonte.
 */

/**
 * Entrada de configuração de um MCP no .code/mcp.json
 */
export interface McpJsonEntry {
  /** Identificador único do MCP */
  id: string;
  /** Tipo de transporte: stdio ou sse */
  transport: 'stdio';
  /** Comando para executar (para stdio) */
  command?: string;
  /** Argumentos do comando */
  args?: string[];
  /** Namespace para as tools (prefixo mcp:{namespace}/) */
  namespace?: string;
  /** Nome legível do MCP */
  name?: string;
  /** Versão do MCP */
  version?: string;
  /** Metadados arbitrários */
  capabilities?: Record<string, unknown>;
  /** Controle de registro/visibilidade */
  mcp?: {
    /** Se false, não registra automaticamente (descoberta progressiva) */
    enable?: boolean;
    /** Se true, oculta da list_capabilities */
    excludeFromList?: boolean;
  };
  /** Variáveis de ambiente (expande ${VAR}) */
  env?: Record<string, string>;
  /** Container Docker name (para funções helper como isXxxMcpRunning) */
  container?: string;
}

/**
 * Estrutura do arquivo .code/mcp.json
 */
export interface McpJsonConfig {
  mcps: McpJsonEntry[];
}
