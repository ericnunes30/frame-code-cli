import type { GraphEngine } from 'frame-agent-sdk';
import type { IAgentMetadata, IAgentMetadataSummary } from './agentMetadata.interface';
import type { ITelemetry } from '../../../infrastructure/telemetry/telemetry.interface';
import type { IAgentDependencies } from './agentDependencies.interface';

/**
 * Interface para o registro de agentes.
 *
 * Define o contrato para gerenciamento de agentes,
 * permitindo diferentes implementações de registro.
 */
export interface IAgentRegistry {
    register(metadata: IAgentMetadata): { name: string; success: boolean; error?: string };
    get(name: string): IAgentMetadata | undefined;
    getMetadata(name: string): IAgentMetadata | undefined;
    list(): IAgentMetadata[];
    listSummaries(): IAgentMetadataSummary[];
    listByType(type: string): IAgentMetadata[];
    listSupervisors(): IAgentMetadata[];
    searchByKeywords(keywords: string[]): IAgentMetadata[];
    has(name: string): boolean;
    count(): number;
    unregister(name: string): boolean;
    clear(): void;
    createEngine(name: string, telemetry?: ITelemetry): Promise<GraphEngine>;
    getStats(): { total: number; mainAgents: number; subAgents: number; supervisors: number };
}

export type { IAgentDependencies };
