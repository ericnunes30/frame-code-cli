import { MCPBaseConfig } from 'frame-agent-sdk';

/**
 * Metadata para controle de registro e visibilidade de MCPs
 *
 * @property enable - Se true (ou omitido), MCP é registrado automaticamente. Se false, tratado como skill (descoberta progressiva).
 * @property excludeFromList - Se true, MCP não aparece na list_capabilities (mas pode estar registrado).
 */
export interface McpConfigMetadata {
  enable?: boolean;           // default: true (registrado automaticamente)
  excludeFromList?: boolean;  // default: false (visível na list_capabilities)
}

/**
 * Config MCP estendida com metadata de controle
 */
export type McpConfigWithMetadata = MCPBaseConfig & {
  mcp?: McpConfigMetadata;
};
