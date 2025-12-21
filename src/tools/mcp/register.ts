import { MCPBase, toolRegistry } from 'frame-agent-sdk';
import { logger } from '../../core/services/logger';
import { context7McpConfig } from './context7-mcp-config';
import { chromeMcpConfig } from './chrome-mcp-config';
import { githubMcpConfig } from './github-mcp-config';
import { qdrantMcpConfig } from './qdrant-mcp-config';
import { neo4jMcpConfig } from './neo4j-mcp-config';

export async function registerMcpTools(): Promise<void> {
  // Registrar MCP principal
  // await registerSingleMcp(context7McpConfig, 'principal');

  // Registrar Chrome MCP
  // await registerSingleMcp(chromeMcpConfig, 'Chrome DevTools');
  
  // Registrar GitHub MCP
  // await registerSingleMcp(githubMcpConfig, 'GitHub');
  
  // Registrar Qdrant MCP
  // await registerSingleMcp(qdrantMcpConfig, 'Qdrant Vector Search');
  
  // Registrar Neo4j MCP
  logger.info('Registrando Neo4j MCP...');
  try {
    await registerSingleMcp(neo4jMcpConfig, 'Neo4j Graph Database');
    logger.info('Neo4j MCP registrado com sucesso!');
  } catch (error) {
    logger.error('Erro ao registrar Neo4j MCP:', error);
  }
}

async function registerSingleMcp(config: any, name: string): Promise<void> {
  const mcp = new MCPBase(config);

  try {
    logger.info(`Conectando ao MCP ${config.id} (${name})...`);
    await mcp.connect();

    logger.info(`Criando ferramentas para ${name}...`);
    const tools = await mcp.createTools();
    logger.info(`Ferramentas criadas para ${name}: ${tools.length}`);
    
    if (!tools.length) {
      logger.warn(`Nenhuma ferramenta MCP encontrada para ${name}`);
      return;
    }

    logger.info(`Registrando ${tools.length} ferramentas para ${name}...`);
    logger.info(`Registrando ${tools.length} ferramentas para ${name}...`);
    tools.forEach((tool: any) => {
      logger.info(`Registrando ferramenta: ${tool.name}`);
      toolRegistry.register(tool);
      logger.debug(`Registrada ferramenta MCP (${name}): ${tool.name}`);
    });

    logger.info(`✅ ${tools.length} ferramentas MCP registradas (${name}): ${tools.map((t: any) => t.name).join(', ')}`);
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
  await registerSingleMcp(chromeMcpConfig, 'Chrome DevTools');
}

// Função para verificar se o container Chrome MCP está rodando
export async function isChromeMcpRunning(): Promise<boolean> {
  try {
    const { execSync } = require('child_process');
    const containerName = chromeMcpConfig.capabilities?.['docker-container'] || 'chrome-devtools-mcp-server';

    execSync(`docker ps --filter name=${containerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    logger.debug(`Container ${containerName} está rodando`);
    return true;
  } catch (error) {
    logger.debug(`Container ${chromeMcpConfig.capabilities?.['docker-container'] || 'chrome-devtools-mcp-server'} não está rodando`);
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
    const { execSync } = require('child_process');
    const containerName = githubMcpConfig.capabilities?.['docker-container'] || 'github-mcp-server';

    execSync(`docker ps --filter name=${containerName} --format "{{.Names}}"`, { stdio: 'pipe' });
    logger.debug(`Container ${containerName} está rodando`);
    return true;
  } catch (error) {
    logger.debug(`Container ${githubMcpConfig.capabilities?.['docker-container'] || 'github-mcp-server'} não está rodando`);
    return false;
  }
}

// Função para iniciar o GitHub MCP via Docker
export async function startGitHubMcp(): Promise<void> {
  try {
    const { execSync } = require('child_process');
    
    logger.info('Iniciando GitHub MCP via Docker...');
    
    // Montar o comando Docker a partir da configuração
    const command = `docker ${githubMcpConfig.args.join(' ')}`;
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
    const { execSync } = require('child_process');
    const dbContainerName = 'frame-qdrant-db';
    const mcpContainerName = qdrantMcpConfig.capabilities?.['docker-container'] || 'frame-qdrant-mcp-server';

    // Verificar se ambos os containers estão rodando
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
  await registerSingleMcp(qdrantMcpConfig, 'Qdrant Vector Search');
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
  await registerSingleMcp(neo4jMcpConfig, 'Neo4j Graph Database');
}
