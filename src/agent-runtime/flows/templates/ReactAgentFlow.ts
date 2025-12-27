/**
 * REACT_AGENT_FLOW - Template de Grafo Reutilizável para Agentes
 *
 * Este arquivo contém o TEMPLATE FIXO E IMUTÁVEL que será reutilizado
 * por TODOS os agentes do sistema (code-agent, chrome-mcp-agent, supervisor, etc.).
 *
 * Arquitetura: agent → validate → detect → execute → (loop ou end)
 *
 * O nó "agent" é um placeholder que será configurado dinamicamente
 * pelo agentFormatter com base no metadados do arquivo .md.
 *
 * @module core/agents/agentFlow
 */

import {
    type GraphDefinition,
    type IGraphState,
    createReactValidationNode,
    createToolDetectionNode,
    createToolExecutorNode,
    GraphStatus
} from 'frame-agent-sdk';

/**
 * Template de grafo ReAct padrão para todos os agentes.
 *
 * Fluxo de execução:
 * 1. agent → LLM gera resposta ou chama ferramenta
 * 2. validate → Valida formato da saída
 * 3. detect → Detecta se há tool call
 * 4. execute → Executa ferramenta (se detectado) ou vai para end
 * 5. end → Finaliza o grafo
 *
 * O nó "agent" deve ser configurado pelo agentFormatter usando createAgentNode().
 *
 * @example
 * ```typescript
 * import { REACT_AGENT_FLOW } from './agentFlow';
 * import { createAgentNode } from 'frame-agent-sdk';
 *
 * const graphDefinition = {
 *     ...REACT_AGENT_FLOW,
 *     nodes: {
 *         ...REACT_AGENT_FLOW.nodes,
 *         agent: createAgentNode({ llm, promptConfig, ... })
 *     }
 * };
 * ```
 */
export const REACT_AGENT_FLOW: GraphDefinition = {
    entryPoint: 'agent',
    endNodeName: 'end',

    nodes: {
        /**
         * Placeholder para o nó agente.
         * Será configurado pelo agentFormatter.createAgentFromFlow()
         * usando createAgentNode() do SDK.
         */
        agent: null as any,

        /**
         * Nó de validação ReAct.
         * Verifica se a saída do LLM está no formato correto.
         */
        validate: createReactValidationNode(),

        /**
         * Nó de detecção de ferramentas.
         * Detecta se o LLM quer chamar uma ferramenta.
         */
        detect: createToolDetectionNode(),

        /**
         * Nó de execução de ferramentas.
         * Executa a ferramenta detectada e retorna resultado ao LLM.
         */
        execute: createToolExecutorNode(),

        /**
         * Nó de finalização.
         * Marca o grafo como finalizado.
         */
        end: async (state: IGraphState) => ({
            ...state,
            status: GraphStatus.FINISHED,
            shouldEnd: true
        })
    },

    edges: {
        /**
         * agent → validate
         * Sempre valida a saída do LLM
         */
        agent: 'validate',

        /**
         * validate → detect ou agent
         * Se validação passou, vai para detect
         * Se falhou, retorna ao agent para tentar novamente
         */
        validate: (state: IGraphState) => {
            const validationPassed = (state.metadata as any)?.validation?.passed !== false;
            return validationPassed ? 'detect' : 'agent';
        },

        /**
         * detect → execute, end ou agent
         * - Se há tool call e é final_answer/ask_user → end
         * - Se há tool call normal → execute
         * - Se não há tool call → end
         */
        detect: (state: IGraphState) => {
            const hasToolCall = !!state.lastToolCall;

            if (hasToolCall) {
                const toolName = state.lastToolCall?.toolName;

                // Ferramentas terminais finalizam o fluxo
                if (toolName === 'final_answer' || toolName === 'ask_user') {
                    return 'end';
                }
                return 'execute';
            }

            return 'end';
        },

        /**
         * execute → agent ou end
         * - Se a ferramenta foi final_answer/ask_user → end
         * - Caso contrário, retorna ao agent com o resultado
         */
        execute: (state: IGraphState) => {
            const toolName = state.lastToolCall?.toolName;

            if (toolName === 'final_answer' || toolName === 'ask_user') {
                return 'end';
            }
            return 'agent';
        },

        /**
         * end → end (auto-loop)
         * O nó end já marca shouldEnd=true, mas definimos a rota
         */
        end: 'end'
    }
};

/**
 * Tipo auxiliar para GraphDefinition com agent node configurável.
 */
export type ReActAgentFlowTemplate = Omit<typeof REACT_AGENT_FLOW, 'nodes'> & {
    nodes: Omit<typeof REACT_AGENT_FLOW.nodes, 'agent'> & {
        agent: any;
    }
};
