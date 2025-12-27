/**
 * Agent Registry - Registro Centralizado de Agentes
 *
 * Implementa um singleton em memória para:
 * - Registrar agentes carregados de .md files
 * - Consultar agentes por nome, tipo, keywords
 * - Criar GraphEngine para agentes registrados
 *
 * @module core/agents/agentRegistry
 */

import { discoverAgents, createAgentFromFlow } from './agentParser';
import type { IAgentMetadata, IAgentMetadataSummary, IAgentRegistrationResult } from './interfaces/agentMetadata.interface';
import type { TelemetryOptions } from 'frame-agent-sdk';
import { GraphEngine } from 'frame-agent-sdk';
import { logger } from '../../infrastructure/logging/logger';

/**
 * Registro singleton de agentes em memória.
 *
 * Mantém um mapa de agentes carregados de .code-agents/
 * e fornece métodos para consultar e criar instâncias.
 *
 * @example
 * ```typescript
 * const registry = AgentRegistry.getInstance();
 * await registry.load('.code-agents');
 *
 * const metadata = registry.get('code-agent');
 * const engine = await registry.createEngine('code-agent', { trace: true });
 * ```
 */
export class AgentRegistry {
    private static instance: AgentRegistry;
    private agents: Map<string, IAgentMetadata> = new Map();

    private constructor() {}

    /**
     * Obtém a instância singleton do registro.
     *
     * @returns Instância do AgentRegistry
     */
    public static getInstance(): AgentRegistry {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry();
        }
        return AgentRegistry.instance;
    }

    /**
     * Carrega todos os agentes do diretório .code/agents/.
     *
     * Descobre arquivos AGENT.md em .code/agents/
     * e os registra automaticamente.
     *
     * @returns Número de agentes carregados
     *
     * @example
     * ```typescript
     * const registry = AgentRegistry.getInstance();
     * const count = await registry.load();
     * console.log(`Carregados ${count} agentes`);
     * ```
     */
    public async load(): Promise<number> {
        const agents = discoverAgents();

        for (const agent of agents) {
            this.register(agent);
        }

        logger.info(`[AgentRegistry] Carregados ${agents.length} agentes de .code/agents/`);

        return agents.length;
    }

    /**
     * Registra um agente manualmente.
     *
     * @param metadata - Metadados do agente
     * @throws {Error} Se o agente já estiver registrado
     *
     * @example
     * ```typescript
     * const metadata: IAgentMetadata = { ... };
     * registry.register(metadata);
     * ```
     */
    public register(metadata: IAgentMetadata): IAgentRegistrationResult {
        if (this.agents.has(metadata.name)) {
            const error = `Agent '${metadata.name}' já registrado`;
            logger.warn(`[AgentRegistry] ${error}`);
            return { name: metadata.name, success: false, error };
        }

        this.agents.set(metadata.name, metadata);
        logger.debug(`[AgentRegistry] Agente registrado: ${metadata.name}`);

        return { name: metadata.name, success: true };
    }

    /**
     * Obtém metadados de um agente por nome.
     *
     * @param name - Nome do agente
     * @returns Metadados do agente ou undefined
     *
     * @example
     * ```typescript
     * const metadata = registry.get('code-agent');
     * if (metadata) {
     *   console.log(metadata.description);
     * }
     * ```
     */
    public get(name: string): IAgentMetadata | undefined {
        return this.agents.get(name);
    }

    /**
     * Alias para get() - semanticamente mais claro.
     *
     * @param name - Nome do agente
     * @returns Metadados do agente ou undefined
     */
    public getMetadata(name: string): IAgentMetadata | undefined {
        return this.get(name);
    }

    /**
     * Lista todos os agentes registrados.
     *
     * @returns Array com metadados de todos os agentes
     *
     * @example
     * ```typescript
     * const agents = registry.list();
     * agents.forEach(a => console.log(a.name));
     * ```
     */
    public list(): IAgentMetadata[] {
        return Array.from(this.agents.values());
    }

    /**
     * Lista summaries (informações resumidas) de todos os agentes.
     *
     * @returns Array com summaries dos agentes
     *
     * @example
     * ```typescript
     * const summaries = registry.listSummaries();
     * summaries.forEach(s => console.log(`${s.name}: ${s.description}`));
     * ```
     */
    public listSummaries(): IAgentMetadataSummary[] {
        return this.list().map((metadata: IAgentMetadata) => ({
            name: metadata.name,
            type: metadata.type,
            description: metadata.description,
            keywords: metadata.keywords,
            canBeSupervisor: metadata.canBeSupervisor
        }));
    }

    /**
     * Lista agentes por tipo.
     *
     * @param type - Tipo do agente (main-agent ou sub-agent)
     * @returns Array com agentes do tipo especificado
     *
     * @example
     * ```typescript
     * const mainAgents = registry.listByType('main-agent');
     * const subAgents = registry.listByType('sub-agent');
     * ```
     */
    public listByType(type: string): IAgentMetadata[] {
        return this.list().filter((a: IAgentMetadata) => a.type === type);
    }

    /**
     * Lista agentes que podem funcionar como supervisor.
     *
     * @returns Array de agentes com canBeSupervisor=true
     *
     * @example
     * ```typescript
     * const supervisors = registry.listSupervisors();
     * ```
     */
    public listSupervisors(): IAgentMetadata[] {
        return this.list().filter((a: IAgentMetadata) => a.canBeSupervisor);
    }

    /**
     * Busca agentes por keywords.
     *
     * @param keywords - Palavras-chave para busca
     * @returns Array de agentes que contêm alguma keyword
     *
     * @example
     * ```typescript
     * const agents = registry.searchByKeywords(['code', 'development']);
     * ```
     */
    public searchByKeywords(keywords: string[]): IAgentMetadata[] {
        return this.list().filter((agent: IAgentMetadata) =>
            keywords.some((kw: string) =>
                agent.keywords.some((akw: string) =>
                    akw.toLowerCase().includes(kw.toLowerCase())
                )
            )
        );
    }

    /**
     * Verifica se um agente está registrado.
     *
     * @param name - Nome do agente
     * @returns true se o agente existe
     *
     * @example
     * ```typescript
     * if (registry.has('code-agent')) {
     *   // Usar agente
     * }
     * ```
     */
    public has(name: string): boolean {
        return this.agents.has(name);
    }

    /**
     * Conta quantos agentes estão registrados.
     *
     * @returns Número de agentes registrados
     *
     * @example
     * ```typescript
     * console.log(`Total: ${registry.count()} agentes`);
     * ```
     */
    public count(): number {
        return this.agents.size;
    }

    /**
     * Remove um agente do registro.
     *
     * @param name - Nome do agente
     * @returns true se o agente foi removido
     *
     * @example
     * ```typescript
     * registry.unregister('old-agent');
     * ```
     */
    public unregister(name: string): boolean {
        return this.agents.delete(name);
    }

    /**
     * Limpa todos os agentes do registro.
     *
     * @example
     * ```typescript
     * registry.clear();
     * ```
     */
    public clear(): void {
        this.agents.clear();
        logger.info('[AgentRegistry] Registro limpo');
    }

    /**
     * CRIA GraphEngine para um agente.
     *
     * @param name - Nome do agente
     * @param telemetry - Opções de telemetria ({ trace, telemetry })
     * @returns GraphEngine configurado
     * @throws {Error} Se o agente não for encontrado
     *
     * @example
     * ```typescript
     * const { trace, telemetry } = createCliTelemetry();
     * const engine = await registry.createEngine('code-agent', { trace, telemetry });
     * await engine.run('Explique o código');
     * ```
     */
    public async createEngine(name: string, telemetry?: { trace: any; telemetry: TelemetryOptions }): Promise<GraphEngine> {
        const metadata = this.get(name);
        if (!metadata) {
            throw new Error(`Agent '${name}' não encontrado no registro`);
        }

        logger.info(`[AgentRegistry] Criando engine para: ${name}`);

        return createAgentFromFlow(metadata, telemetry);
    }

    /**
     * Obtém estatísticas do registro.
     *
     * @returns Estatísticas dos agentes registrados
     *
     * @example
     * ```typescript
     * const stats = registry.getStats();
     * console.log(`Total: ${stats.total}, Supervisores: ${stats.supervisors}`);
     * ```
     */
    public getStats(): {
        total: number;
        mainAgents: number;
        subAgents: number;
        supervisors: number;
    } {
        const agents = this.list();
        return {
            total: agents.length,
            mainAgents: agents.filter((a: IAgentMetadata) => a.type === 'main-agent').length,
            subAgents: agents.filter((a: IAgentMetadata) => a.type === 'sub-agent').length,
            supervisors: agents.filter((a: IAgentMetadata) => a.canBeSupervisor).length
        };
    }
}

/**
 * Instância global do registro (conveniência).
 *
 * @example
 * ```typescript
 * import { agentRegistry } from './agentRegistry';
 * await agentRegistry.load();
 * ```
 */
export const agentRegistry = AgentRegistry.getInstance();
