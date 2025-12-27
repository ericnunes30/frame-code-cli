import { AgentRegistry } from './AgentRegistry';
import { logger } from '../../infrastructure/logging/logger';

/**
 * Inicialização automática do sistema de agentes.
 *
 * Carrega todos os agentes de .code/agents/ no startup da CLI.
 *
 * @returns Número de agentes carregados
 */
export async function initializeAgents(): Promise<number> {
    const registry = AgentRegistry.getInstance();

    logger.info('[Agents] Inicializando sistema de agentes...');
    logger.debug('[Agents] Diretório: .code/agents/');

    const count = await registry.load();

    if (count === 0) {
        logger.warn('[Agents] Nenhum agente encontrado em .code/agents/');
        logger.info('[Agents] Crie .code/agents/NOME_AGENTE/AGENT.md para definir novos agentes');
    } else {
        const stats = registry.getStats();
        logger.info(`[Agents] ${count} agentes carregados:`);
        logger.info(`[Agents]   - Main agents: ${stats.mainAgents}`);
        logger.info(`[Agents]   - Sub agents: ${stats.subAgents}`);
        logger.info(`[Agents]   - Supervisores: ${stats.supervisors}`);
    }

    return count;
}

/**
 * Helper para obter um agente padrão.
 *
 * @param preferredAgent - Nome do agente preferido (opcional)
 * @returns Nome do agente a usar
 */
export function getDefaultAgent(preferredAgent?: string): string {
    const registry = AgentRegistry.getInstance();

    if (preferredAgent && registry.has(preferredAgent)) {
        return preferredAgent;
    }

    // Fallback: primeiro main-agent disponível
    const mainAgents = registry.listByType('main-agent');
    if (mainAgents.length > 0) {
        return mainAgents[0].name;
    }

    throw new Error('Nenhum agente main-agent disponível');
}

/**
 * Lista todos os agentes disponíveis em formato legível.
 *
 * @returns String formatada com lista de agentes
 */
export function listAgentsAvailable(): string {
    const registry = AgentRegistry.getInstance();
    const agents = registry.listSummaries();

    if (agents.length === 0) {
        return 'Nenhum agente disponível.';
    }

    const lines = ['Agentes Disponíveis:', ''];

    for (const agent of agents) {
        const typeLabel = agent.type === 'main-agent' ? '[MAIN]' : '[SUB]';
        const supervisorLabel = agent.canBeSupervisor ? ' [SUPERVISOR]' : '';
        const keywords = agent.keywords.length > 0
            ? ' (keywords: ' + agent.keywords.join(', ') + ')'
            : '';

        lines.push('  ' + typeLabel + supervisorLabel + ' ' + agent.name + ': ' + agent.description + keywords);
    }

    return lines.join('\n');
}
