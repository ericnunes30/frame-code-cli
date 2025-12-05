import { MCPBase, toolRegistry } from 'frame-agent-sdk';
import { logger } from '../../core/logger';
import { context7McpConfig } from './context7-mcp-config';
import { chromeMcpConfig } from './chrome-mcp-config';
import { githubMcpConfig } from './github-mcp-config';

export async function registerMcpTools(): Promise<void> {
  // Registrar MCP principal
  await registerSingleMcp(context7McpConfig, 'principal');

  // Registrar Chrome MCP
  // await registerSingleMcp(chromeMcpConfig, 'Chrome DevTools');
  
  // Registrar GitHub MCP
  // await registerSingleMcp(githubMcpConfig, 'GitHub');
}

async function registerSingleMcp(config: any, name: string): Promise<void> {
  const mcp = new MCPBase(config);

  try {
    logger.info(`Conectando ao MCP ${config.id} (${name})...`);
    await mcp.connect();

    const tools = await mcp.createTools();
    if (!tools.length) {
      logger.warn(`Nenhuma ferramenta MCP encontrada para ${name}`);
      return;
    }

    tools.forEach((tool: any) => {
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