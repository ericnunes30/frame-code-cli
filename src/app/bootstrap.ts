import { loadConfig } from '../infrastructure/config';
import { logger } from '../infrastructure/logging/logger';
import { initializeTools } from '../tools';
import { initializeAgents } from '../agent-runtime';
import { createCliTelemetry } from '../infrastructure/telemetry';

/**
 * Bootstrap da aplicação frame-code-cli
 *
 * Inicializa todos os serviços necessários para o funcionamento da CLI.
 */
export async function bootstrap(): Promise<void> {
  logger.info('[Bootstrap] Inicializando frame-code-cli...');

  // 1. Carregar configuração
  await loadConfig();
  logger.debug('[Bootstrap] Configuração carregada');

  // 2. Inicializar ferramentas
  await initializeTools();
  logger.debug('[Bootstrap] Ferramentas inicializadas');

  // 3. Inicializar agentes
  const agentCount = await initializeAgents();
  logger.info(`[Bootstrap] ${agentCount} agentes carregados`);

  logger.info('[Bootstrap] Inicialização concluída');
}

/**
 * Cria contexto de telemetria padrão
 */
export function createDefaultTelemetry() {
  return createCliTelemetry();
}
