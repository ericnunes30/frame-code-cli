import type { GraphEngine } from '@ericnunes/frame-agent-sdk';
import type { IAgentMetadata, IAgentMetadataSummary } from './registry/interfaces/agentMetadata.interface';
import type { IAgentRegistry } from './registry/interfaces/agentRegistry.interface';
import type { ITelemetry } from '../infrastructure/telemetry/telemetry.interface';

/**
 * Facade para o sistema de agentes.
 *
 * Fornece uma interface simplificada para interagir com agentes,
 * escondendo a complexidade do AgentRegistry e reduzindo acoplamento.
 */
export class AgentFacade {
    constructor(private registry: IAgentRegistry) {}

    /**
     * Cria uma GraphEngine para um agente.
     */
    async createEngine(name: string, telemetry?: ITelemetry): Promise<GraphEngine> {
        return this.registry.createEngine(name, telemetry);
    }

    /**
     * Lista summaries de todos os agentes.
     */
    listAgents(): IAgentMetadataSummary[] {
        return this.registry.listSummaries();
    }

    /**
     * Obtém metadados de um agente por nome.
     */
    getAgent(name: string): IAgentMetadata | undefined {
        return this.registry.get(name);
    }

    /**
     * Verifica se um agente existe.
     */
    has(name: string): boolean {
        return this.registry.has(name);
    }

    /**
     * Lista agentes por tipo.
     */
    listByType(type: string): IAgentMetadata[] {
        return this.registry.listByType(type);
    }

    /**
     * Lista agentes que podem ser supervisores.
     */
    listSupervisors(): IAgentMetadata[] {
        return this.registry.listSupervisors();
    }

    /**
     * Busca agentes por keywords.
     */
    searchByKeywords(keywords: string[]): IAgentMetadata[] {
        return this.registry.searchByKeywords(keywords);
    }

    /**
     * Obtém estatísticas do registro.
     */
    getStats(): { total: number; mainAgents: number; subAgents: number; supervisors: number } {
        return this.registry.getStats();
    }
}
