import { McpConfigWithMetadata } from '../../tools/mcp/mcpMetadata';
import { loadUserCodeMcpConfigs } from './discoverer';

/**
 * Metadados de um MCP configurado no sistema
 */
export interface IMcpMetadata {
  id: string;
  name: string;
  namespace: string;
  type: 'mcp';
  config: McpConfigWithMetadata;
  registered: boolean;  // Se está registrado automaticamente (mcp.enable !== false)
  visible: boolean;     // Se está visível na lista (mcp.excludeFromList !== true)
}

/**
 * Carrega configurações MCP disponíveis no sistema
 *
 * Respeita metadata mcp.enable e mcp.excludeFromList para controle granular.
 */
export class McpLoader {
  private configs: McpConfigWithMetadata[];

  constructor() {
    // Carregar configurações MCP do usuário (.code/mcp.json)
    // Não há mais configs built-in - todos os MCPs são configurados pelo usuário
    const userConfigs = loadUserCodeMcpConfigs();
    this.configs = [...userConfigs];
  }

  /**
   * Carrega todos os MCPs com metadata completo
   */
  loadAllMcpConfigs(): IMcpMetadata[] {
    return this.configs
      .filter(config => config.name !== undefined)  // Filtrar configs sem nome
      .map(config => ({
        id: config.id!,
        name: config.name!,
        namespace: config.namespace || 'default',
        type: 'mcp' as const,
        config,
        // mcp.enable === false significa NÃO registrar (descoberta progressiva)
        registered: config.mcp?.enable !== false,  // default: true
        // mcp.excludeFromList === true significa OCULTAR da lista
        visible: config.mcp?.excludeFromList !== true  // default: true
      }));
  }

  /**
   * Carrega apenas MCPs visíveis na list_capabilities
   * (filtrando excludeFromList: true)
   */
  loadVisibleMcpConfigs(): IMcpMetadata[] {
    return this.loadAllMcpConfigs().filter(m => m.visible);
  }

  /**
   * Carrega apenas MCPs que devem ser registrados automaticamente
   * (filtrando enable: false)
   */
  loadRegisteredMcpConfigs(): IMcpMetadata[] {
    return this.loadAllMcpConfigs().filter(m => m.registered);
  }

  /**
   * Busca um MCP por ID
   */
  getMcpById(id: string): IMcpMetadata | undefined {
    return this.loadAllMcpConfigs().find(m => m.id === id);
  }

  /**
   * Busca MCPs por namespace
   */
  getMcpByNamespace(namespace: string): IMcpMetadata[] {
    return this.loadAllMcpConfigs().filter(m => m.namespace === namespace);
  }
}
