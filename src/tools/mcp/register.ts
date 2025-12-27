import { MCPBase, toolRegistry } from 'frame-agent-sdk';
import { logger } from '../../infrastructure/logging/logger';
import { McpLoader, IMcpMetadata } from './loader';

/**
 * Obtém configuração de MCP por ID (usando McpLoader)
 */
function getMcpConfigById(id: string): any {
  const loader = new McpLoader();
  const metadata = loader.getMcpById(id);
  return metadata?.config;
}

export async function registerMcpTools(): Promise<void> {
  const loader = new McpLoader();
  const configs = loader.loadRegisteredMcpConfigs();

  let registeredCount = 0;
  let skippedCount = 0;

  for (const metadata of configs) {
    const config = metadata.config;

    if (!metadata.registered) {
      logger.info(`[registerMcpTools] MCP "${metadata.name}" (${metadata.id}) NÃO registrado (enable=false).`);
      skippedCount++;
      continue;
    }

    try {
      await registerSingleMcp(config, config.name || config.id);
      registeredCount++;
    } catch (error) {
      logger.error(`[registerMcpTools] Erro ao registrar MCP "${metadata.name}":`, error);
    }
  }

  logger.info(`[registerMcpTools] ${registeredCount} MCPs registrados, ${skippedCount} pulados.`);
}

async function registerSingleMcp(config: any, name: string): Promise<void> {
  const mcp = new MCPBase(config);

  try {
    logger.info(`Conectando ao MCP ${config.id} (${name})...`);
    await mcp.connect();

    logger.info(`Criando ferramentas para ${name}...`);

    // Criar aliases sem o prefixo mcp:namespace/ para facilitar uso pelo LLM
    // Ex: mcp:chrome/navigate_page -> navigate_page
    const tools = await mcp.createTools({
      alias: {}
    });

    // Criar mapeamento de aliases: nome completo -> nome simples
    const aliasMap: Record<string, string> = {};
    tools.forEach((tool: any) => {
      const fullName = tool.name;
      const shortName = fullName.replace(`mcp:${config.namespace}/`, '');
      aliasMap[fullName] = shortName;
    });

    // Recriar tools com aliases
    const toolsWithAlias = await mcp.createTools({ alias: aliasMap });

    logger.info(`Ferramentas criadas para ${name}: ${toolsWithAlias.length}`);

    if (!toolsWithAlias.length) {
      logger.warn(`Nenhuma ferramenta MCP encontrada para ${name}`);
      return;
    }

    logger.info(`Registrando ${toolsWithAlias.length} ferramentas para ${name}...`);
    toolsWithAlias.forEach((tool: any) => {
      logger.info(`Registrando ferramenta: ${tool.name}`);

      // Adicionar metadata de rastreamento do MCP
      // O prefixo mcp:namespace/ foi removido via alias para facilitar uso
      (tool as any)._mcpNamespace = config.namespace;
      (tool as any)._mcpId = config.id;

      toolRegistry.register(tool);
      logger.debug(`Registrada ferramenta MCP (${name}): ${tool.name}`);
    });

    logger.info(`✅ ${toolsWithAlias.length} ferramentas MCP registradas (${name}): ${toolsWithAlias.map((t: any) => t.name).join(', ')}`);
  } catch (error: any) {
    logger.error(`❌ Falha crítica ao registrar ferramentas MCP (${name}): ${error.message}`);
    logger.debug('Stack trace:', error.stack);

    if (error.code === 'ECONNREFUSED') {
      logger.error(`Verifique se o container Docker está rodando para ${name}`);
    }
  }
}

// Função específica para registrar apenas o Chrome MCP
export async function registerChromeMcp(): Promise<void> {
  const config = getMcpConfigById('chrome-devtools');
  if (!config) {
    throw new Error('Chrome MCP not found in .code/mcp.json');
  }
  await registerSingleMcp(config, config.name || config.id);
}

// Função para verificar se o container Chrome MCP está rodando
export async function isChromeMcpRunning(): Promise<boolean> {
  try {
    const config = getMcpConfigById('chrome-devtools');
    if (!config) return false;

    const containerName = config.container || config.capabilities?.['docker-container'] || 'chrome-devtools-mcp-server';
    const { execSync } = require('child_process');
    execSync(`docker ps --filter name=${containerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    logger.debug(`Container ${containerName} está rodando`);
    return true;
  } catch (error) {
    logger.debug(`Container chrome-devtools-mcp-server não está rodando`);
    return false;
  }
}

// Função para iniciar o Chrome MCP via Docker Compose
export async function startChromeMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    const composePath = 'docker/chrome-mcp/docker-compose.yml';

    logger.info('Iniciando Chrome MCP via Docker Compose...');
    execSync(`docker-compose -f ${composePath} up -d`, { stdio: 'inherit' });

    // Aguardar o container inicializar
    logger.info('Aguardando Chrome MCP inicializar...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    logger.info('✅ Chrome MCP iniciado com sucesso');
  } catch (error: any) {
    logger.error(`❌ Falha ao iniciar Chrome MCP: ${error.message}`);
    throw error;
  }
}

// Função para verificar se o container GitHub MCP está rodando
export async function isGitHubMcpRunning(): Promise<boolean> {
  try {
    const config = getMcpConfigById('github-official');
    if (!config) return false;

    const containerName = config.container || 'github-mcp-server';
    const { execSync } = require('child_process');
    execSync(`docker ps --filter name=${containerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    logger.debug(`Container ${containerName} está rodando`);
    return true;
  } catch (error) {
    logger.debug(`Container github-mcp-server não está rodando`);
    return false;
  }
}

// Função para iniciar o GitHub MCP via Docker
export async function startGitHubMcp(): Promise<void> {
  try {
    const config = getMcpConfigById('github-official');
    if (!config) {
      throw new Error('GitHub MCP not found in .code/mcp.json');
    }

    const { execSync } = require('child_process');
    logger.info('Iniciando GitHub MCP via Docker...');
    const command = `docker ${(config.args||[]).join(' ')}`;
    execSync(command, { stdio: 'inherit' });
    logger.info('✅ GitHub MCP iniciado com sucesso');
  } catch (error: any) {
    logger.error(`❌ Falha ao iniciar GitHub MCP: ${error.message}`);
    throw error;
  }
}

// Função para verificar se o container Qdrant MCP está rodando
export async function isQdrantMcpRunning(): Promise<boolean> {
  try {
    const config = getMcpConfigById('qdrant-official');
    if (!config) return false;

    const mcpContainerName = config.container || 'frame-qdrant-mcp-server';
    const dbContainerName = 'frame-qdrant-db';

    const { execSync } = require('child_process');
    execSync(`docker ps --filter name=${dbContainerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    execSync(`docker ps --filter name=${mcpContainerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    logger.debug(`Containers Qdrant (${dbContainerName}) e MCP (${mcpContainerName}) estão rodando`);
    return true;
  } catch (error) {
    logger.debug(`Containers Qdrant MCP não estão rodando`);
    return false;
  }
}

// Função para iniciar o Qdrant MCP via Docker Compose
export async function startQdrantMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    const composePath = 'docker/qdrant-mcp/docker-compose.yml';

    logger.info('Iniciando Qdrant MCP via Docker Compose...');
    
    // Build e start dos containers
    execSync(`docker-compose -f ${composePath} up -d --build`, { stdio: 'inherit' });

    // Aguardar os containers inicializarem
    logger.info('Aguardando Qdrant e MCP Server inicializarem...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Verificar se os containers estão rodando
    if (await isQdrantMcpRunning()) {
      logger.info('✅ Qdrant MCP iniciado com sucesso');
    } else {
      throw new Error('Containers não iniciaram corretamente');
    }
  } catch (error: any) {
    logger.error(`❌ Falha ao iniciar Qdrant MCP: ${error.message}`);
    throw error;
  }
}

// Função para parar o Qdrant MCP via Docker Compose
export async function stopQdrantMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    const composePath = 'docker/qdrant-mcp/docker-compose.yml';

    logger.info('Parando Qdrant MCP via Docker Compose...');
    execSync(`docker-compose -f ${composePath} down`, { stdio: 'inherit' });

    logger.info('✅ Qdrant MCP parado com sucesso');
  } catch (error: any) {
    logger.error(`❌ Falha ao parar Qdrant MCP: ${error.message}`);
    throw error;
  }
}

// Função para registrar apenas o Qdrant MCP
export async function registerQdrantMcp(): Promise<void> {
  const config = getMcpConfigById('qdrant-official');
  if (!config) {
    throw new Error('Qdrant MCP not found in .code/mcp.json');
  }
  await registerSingleMcp(config, config.name || config.id);
}

// Função para verificar se o container Neo4j MCP está rodando
export async function isNeo4jMcpRunning(): Promise<boolean> {
  try {
    const { execSync } = require('child_process');
    const dbContainerName = 'frame-neo4j-db';
    const mcpContainerName = 'frame-neo4j-mcp-server';

    // Verificar se ambos os containers estão rodando
    execSync(`docker ps --filter name=${dbContainerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    execSync(`docker ps --filter name=${mcpContainerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    
    logger.debug(`Containers Neo4j (${dbContainerName}) e MCP (${mcpContainerName}) estão rodando`);
    return true;
  } catch (error) {
    logger.debug(`Containers Neo4j MCP não estão rodando`);
    return false;
  }
}

// Função para iniciar o Neo4j MCP via Docker Compose
export async function startNeo4jMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    const composePath = 'docker/neo4j-mcp/docker-compose.yml';

    logger.info('Iniciando Neo4j MCP via Docker Compose...');
    
    // Build e start dos containers
    execSync(`docker-compose -f ${composePath} up -d --build`, { stdio: 'inherit' });

    // Aguardar os containers inicializarem (Neo4j demora um pouco)
    logger.info('Aguardando Neo4j e MCP Server inicializarem...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verificar se os containers estão rodando
    if (await isNeo4jMcpRunning()) {
      logger.info('✅ Neo4j MCP iniciado com sucesso');
    } else {
      throw new Error('Containers não iniciaram corretamente');
    }
  } catch (error: any) {
    logger.error(`❌ Falha ao iniciar Neo4j MCP: ${error.message}`);
    throw error;
  }
}

// Função para parar o Neo4j MCP via Docker Compose
export async function stopNeo4jMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    const composePath = 'docker/neo4j-mcp/docker-compose.yml';

    logger.info('Parando Neo4j MCP via Docker Compose...');
    execSync(`docker-compose -f ${composePath} down`, { stdio: 'inherit' });

    logger.info('✅ Neo4j MCP parado com sucesso');
  } catch (error: any) {
    logger.error(`❌ Falha ao parar Neo4j MCP: ${error.message}`);
    throw error;
  }
}

// Função para registrar apenas o Neo4j MCP
export async function registerNeo4jMcp(): Promise<void> {
  const config = getMcpConfigById('neo4j-official');
  if (!config) {
    throw new Error('Neo4j MCP not found in .code/mcp.json');
  }
  await registerSingleMcp(config, config.name || config.id);
}
