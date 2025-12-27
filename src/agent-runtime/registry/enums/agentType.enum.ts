/**
 * Tipos e Enums para o Sistema de Agentes
 *
 * Define os tipos fundamentais usados em todo o sistema de agentes.
 *
 * @module agent-runtime/agentTypes
 */

/**
 * Tipos de agentes suportados pelo sistema.
 *
 * - MAIN_AGENT: Agente autônomo que executa tarefas diretamente
 * - SUB_AGENT: Subagente usado em workflows orquestrados (ex: planner, implementer)
 */
export enum AgentType {
    MAIN_AGENT = 'main-agent',
    SUB_AGENT = 'sub-agent'
}
