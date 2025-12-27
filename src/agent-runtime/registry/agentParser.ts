/**
 * Agent Formatter - Parseia arquivos .md e cria GraphEngine
 *
 * Este módulo é o "motor" principal do sistema de agentes:
 * 1. Parseia arquivos .md com YAML frontmatter
 * 2. Descobre agentes em src/content/agents/ (built-in) e .code/agents/ (personalizados)
 * 3. Cria GraphEngine a partir de metadados usando REACT_AGENT_FLOW
 *
 * @module core/agents/agentFormatter
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    GraphEngine,
    createAgentNode,
    FlowRegistryImpl,
    FlowRunnerImpl,
    CallFlowTool,
    type AgentLLMConfig,
    type GraphDefinition,
    type ITool,
    type TelemetryOptions
} from 'frame-agent-sdk';

import { REACT_AGENT_FLOW } from '../flows/templates/ReactAgentFlow';
import type { IAgentMetadata, ToolPolicy } from './interfaces/agentMetadata.interface';
import { AgentRegistry } from './AgentRegistry';
import { toolRegistry } from '../../tools';
import { loadConfig } from '../../infrastructure/config';
import { loadAgentConfig } from '../../infrastructure/config/agentConfig';
import { CompressionManager } from '../../infrastructure/compression';
import { createCliContextHooks } from '../context/hooks/compressionHook';
import { loadSystemPrompt } from '../context/system-prompts/loader';
import { logger } from '../../infrastructure/logging/logger';
import { McpLoader } from '../../tools/mcp/loader';

/**
 * Parseia arquivo .md do agente e retorna IAgentMetadata.
 */
export function parseAgentFile(filePath: string): IAgentMetadata | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        if (lines[0].trim() !== '---') {
            logger.warn('[agentFormatter] Arquivo sem frontmatter: ' + filePath);
            return null;
        }

        const frontmatter: Record<string, any> = {};
        let i = 1;

        for (; i < lines.length; i++) {
            if (lines[i].trim() === '---') break;

            const [key, ...valueParts] = lines[i].split(':');
            if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim();

                if (value.startsWith('[') && value.endsWith(']')) {
                    const arrayValue = value
                        .slice(1, -1)
                        .split(',')
                        .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));

                    if (key.trim() === 'subAgents' && arrayValue.length === 1 && arrayValue[0] === 'all') {
                        frontmatter[key.trim()] = 'all';
                    } else {
                        frontmatter[key.trim()] = arrayValue;
                    }
                } else {
                    if (value === 'true') {
                        frontmatter[key.trim()] = true;
                    } else if (value === 'false') {
                        frontmatter[key.trim()] = false;
                    } else if (value === 'all' && key.trim() === 'subAgents') {
                        frontmatter[key.trim()] = 'all';
                    } else {
                        frontmatter[key.trim()] = value.replace(/^['"]|['"]$/g, '');
                    }
                }
            }
        }

        const body = lines.slice(i + 1).join('\n').trim();

        if (!frontmatter.name || !frontmatter.type || !frontmatter.description) {
            logger.error('[agentFormatter] Campos obrigatórios faltando em ' + filePath);
            return null;
        }

        let agentType = frontmatter.type;
        if (agentType !== 'main-agent' && agentType !== 'sub-agent') {
            logger.warn('[agentFormatter] Type inválido em ' + filePath + ': ' + frontmatter.type);
            return null;
        }

        const category = 'agents';

        const metadata: IAgentMetadata = {
            name: frontmatter.name,
            type: agentType,
            canBeSupervisor: frontmatter.canBeSupervisor === true || frontmatter.canBeSupervisor === 'true',
            description: frontmatter.description,
            keywords: frontmatter.keywords || [],
            tools: frontmatter.tools || [],
            toolPolicy: frontmatter.toolPolicy,
            subAgents: frontmatter.subAgents,
            model: frontmatter.model,
            temperature: frontmatter.temperature ? parseFloat(frontmatter.temperature) : undefined,
            maxTokens: frontmatter.maxTokens ? parseInt(frontmatter.maxTokens, 10) : undefined,
            systemPromptPath: frontmatter.systemPrompt,
            systemPrompt: body,
            path: filePath,
            category,
            compressionEnabled: frontmatter.compressionEnabled !== undefined
                ? frontmatter.compressionEnabled === true || frontmatter.compressionEnabled === 'true'
                : undefined,
            customErrorHandling: frontmatter.customErrorHandling === true || frontmatter.customErrorHandling === 'true',
            flowMode: frontmatter.flowMode
        };

        return metadata;

    } catch (error) {
        logger.error('[agentFormatter] Erro ao parsear ' + filePath + ':', error);
        return null;
    }
}

/**
 * Descobre agentes em um diretório específico.
 */
function discoverAgentsInDir(agentsDir: string): IAgentMetadata[] {
    const agents: IAgentMetadata[] = [];

    if (!fs.existsSync(agentsDir)) {
        return agents;
    }

    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
            const agentFile = path.join(agentsDir, entry.name);
            const metadata = parseAgentFile(agentFile);
            if (metadata) {
                agents.push(metadata);
            }
        }
    }

    return agents;
}

/**
 * Descobre todos os arquivos de agentes (built-in + personalizados).
 *
 * Carrega agentes de dois locais:
 * 1. src/content/agents/ - Agentes built-in do code-cli
 * 2. .code/agents/ - Agentes personalizados do projeto (permite sobrescrever)
 */
export function discoverAgents(agentsDir?: string): IAgentMetadata[] {
    const agents: IAgentMetadata[] = [];

    // 1. Carregar agentes built-in primeiro
    const builtinAgentsDir = path.join(__dirname, '../../content/agents');
    agents.push(...discoverAgentsInDir(builtinAgentsDir));

    // 2. Carregar agentes personalizados depois (permite sobrescrever)
    const customAgentsDir = path.join(agentsDir || path.join(process.cwd(), '.code'), 'agents');
    agents.push(...discoverAgentsInDir(customAgentsDir));

    return agents;
}

/**
 * Filtra tools conforme política do agente.
 */
function filterToolsByPolicy(allTools: ITool[], policy?: ToolPolicy): ITool[] {
    if (!policy) return allTools;

    let filtered = allTools;

    if (policy.allow && policy.allow.length > 0) {
        filtered = filtered.filter((t: ITool) => policy.allow!.includes(t.name));
    }

    if (policy.deny && policy.deny.length > 0) {
        filtered = filtered.filter((t: ITool) => !policy.deny!.includes(t.name));
    }

    return filtered;
}

/**
 * Filtra subAgentes conforme configuração do agente.
 */
function filterSubAgents(
    allSubAgents: IAgentMetadata[],
    subAgentsConfig?: (string[] | 'all')
): IAgentMetadata[] {
    if (!subAgentsConfig || (Array.isArray(subAgentsConfig) && subAgentsConfig.length === 0)) {
        return [];
    }

    if (subAgentsConfig === 'all') {
        return allSubAgents;
    }

    const allowedSet = new Set(subAgentsConfig);
    return allSubAgents.filter(agent => allowedSet.has(agent.name));
}

/**
 * Expande nomes de MCPs para suas ferramentas correspondentes
 * - Se item é um MCP ID ou namespace, expande para suas ferramentas
 * - Se item é uma ferramenta individual, mantém como está
 *
 * @example
 *   Input:  ["chrome-devtools", "file_read", "github"]
 *   Output: ["navigate_page", "click", ..., "file_read", "search_code", ...]
 */
function expandMcpTools(
    toolNames: string[],
    mcpLoader: McpLoader,
    allTools: ITool[]
): string[] {
    const expanded: string[] = [];
    const mcpNamespaces = new Set<string>();

    // Identificar MCPs e coletar namespaces
    for (const name of toolNames) {
        const mcpById = mcpLoader.getMcpById(name);
        if (mcpById) {
            mcpNamespaces.add(mcpById.namespace);
            continue;
        }

        const mcpByNs = mcpLoader.getMcpByNamespace(name);
        if (mcpByNs.length > 0) {
            mcpNamespaces.add(mcpByNs[0].namespace);
            continue;
        }

        // Ferramenta individual
        expanded.push(name);
    }

    // Expandir: para cada namespace MCP, adicionar todas as suas ferramentas
    if (mcpNamespaces.size > 0) {
        for (const tool of allTools) {
            const meta = tool as any;
            if (meta._mcpNamespace && mcpNamespaces.has(meta._mcpNamespace)) {
                expanded.push(tool.name);
            }
        }
    }

    return [...new Set(expanded)]; // Remover duplicatas
}

/**
 * Carrega prompt do sistema de arquivo externo se referenciado.
 */
function loadSystemPromptWithExternal(systemPromptPath: string | undefined, basePrompt: string): string {
    if (!systemPromptPath) return basePrompt;

    try {
        const externalPrompt = loadSystemPrompt.loadFileContent(systemPromptPath);
        return externalPrompt + '\n\n' + basePrompt;
    } catch (e) {
        logger.warn('[agentFormatter] Não foi possível carregar ' + systemPromptPath);
        return basePrompt;
    }
}

/**
 * Interface para o resultado da criação do agente.
 */
interface AgentCreationResult {
    graphDefinition: GraphDefinition;
    engine: GraphEngine;
    llmConfig: AgentLLMConfig;
}

/**
 * Cria um agente retornando tanto GraphDefinition quanto GraphEngine.
 */
async function createAgentWithDefinition(
    metadata: IAgentMetadata,
    telemetry?: { trace: any; telemetry: TelemetryOptions }
): Promise<AgentCreationResult> {
    const config = await loadConfig();

    let compressionManager: CompressionManager | undefined;
    if (metadata.compressionEnabled !== false && config.compression?.enabled !== false) {
        compressionManager = new CompressionManager({
            ...config.compression,
            persistKey: 'agent-' + metadata.name
        });
    }

    let systemPrompt = loadSystemPromptWithExternal(
        metadata.systemPromptPath,
        metadata.systemPrompt
    );

    if (compressionManager) {
        const compressionPrompt = compressionManager.getCompressionPrompt();
        if (compressionPrompt) {
            systemPrompt = compressionPrompt + '\n\n' + systemPrompt;
        }
    }

    const agentConfig = loadAgentConfig(metadata.name);
    // supportsVision: config.json agente > config.json defaults > ENV global > hardcoded
    const supportsVision = agentConfig.capabilities?.supportsVision
        ?? config.vision?.supportsVision
        ?? false;

    const llmConfig: AgentLLMConfig = {
        model: metadata.model || agentConfig.model || config.defaults?.model || 'gpt-4o-mini',
        provider: agentConfig.provider || config.provider,
        apiKey: agentConfig.apiKey || config.apiKey,
        baseUrl: agentConfig.baseUrl || config.baseURL,
        capabilities: { supportsVision },
        defaults: {
            maxTokens: metadata.maxTokens || agentConfig.maxTokens || config.defaults?.maxTokens,
            maxContextTokens: agentConfig.maxContextTokens || config.defaults?.maxContextTokens,
            temperature: metadata.temperature ?? agentConfig.temperature ?? config.defaults?.temperature,
            topP: agentConfig.topP ?? config.defaults?.topP
        }
    };

    const allTools = toolRegistry.listTools();
    const allowedTools = filterToolsByPolicy(allTools, metadata.toolPolicy);

    // Expandir MCPs para suas ferramentas
    const mcpLoader = new McpLoader();
    const expandedToolNames = expandMcpTools(metadata.tools, mcpLoader, allTools);

    let finalTools = expandedToolNames.length > 0
        ? allowedTools.filter((t: ITool) => expandedToolNames.includes(t.name))
        : allowedTools;

    if (metadata.type === 'sub-agent' && finalTools.some((t: ITool) => t.name === 'ask_user')) {
        finalTools = finalTools.filter((t: ITool) => t.name !== 'ask_user');
    }

    // Remover readImage se o modelo não suporta visão
    if (!supportsVision) {
        finalTools = finalTools.filter((t: ITool) => t.name !== 'read_image');
    }

    const graphDefinition: GraphDefinition = {
        ...REACT_AGENT_FLOW,
        nodes: { ...REACT_AGENT_FLOW.nodes }
    };

    graphDefinition.nodes.agent = createAgentNode({
        llm: llmConfig,
        promptConfig: {
            mode: 'react' as any,
            agentInfo: {
                name: metadata.name,
                goal: metadata.description,
                backstory: systemPrompt.substring(0, 500)
            },
            additionalInstructions: systemPrompt,
            tools: finalTools,
            toolPolicy: metadata.toolPolicy
        },
        contextHooks: createCliContextHooks(compressionManager),
        autoExecuteTools: false,
        temperature: metadata.temperature ?? config.defaults?.temperature,
        maxTokens: metadata.maxTokens || config.defaults?.maxTokens
    });

    if (metadata.customErrorHandling) {
        const originalExecuteNode = graphDefinition.nodes.execute;
        graphDefinition.nodes.execute = async (state: any, engine: any) => {
            if (state.status === 'ERROR') {
                logger.warn('[' + metadata.name + '] Erro detectado, aplicando tratamento customizado');
            }
            return originalExecuteNode(state, engine);
        };
    }

    const engine = new GraphEngine(
        graphDefinition,
        telemetry ? { trace: telemetry.trace, telemetry: telemetry.telemetry } : undefined,
        llmConfig
    );

    return { graphDefinition, engine, llmConfig };
}

/**
 * CRIA AGENTE GRAPH ENGINE A PARTIR DO METADATA.
 */
export async function createAgentFromFlow(
    metadata: IAgentMetadata,
    telemetry?: { trace: any; telemetry: TelemetryOptions },
    _skipSubAgents?: boolean
): Promise<GraphEngine> {

    const config = await loadConfig();

    let compressionManager: CompressionManager | undefined;
    if (metadata.compressionEnabled !== false && config.compression?.enabled !== false) {
        compressionManager = new CompressionManager({
            ...config.compression,
            persistKey: 'agent-' + metadata.name
        });
    }

    let systemPrompt = loadSystemPromptWithExternal(
        metadata.systemPromptPath,
        metadata.systemPrompt
    );

    if (compressionManager) {
        const compressionPrompt = compressionManager.getCompressionPrompt();
        if (compressionPrompt) {
            systemPrompt = compressionPrompt + '\n\n' + systemPrompt;
        }
    }

    const agentConfig = loadAgentConfig(metadata.name);
    // supportsVision: config.json agente > config.json defaults > ENV global > hardcoded
    const supportsVision = agentConfig.capabilities?.supportsVision
        ?? config.vision?.supportsVision
        ?? false;

    const llmConfig: AgentLLMConfig = {
        model: metadata.model || agentConfig.model || config.defaults?.model || 'gpt-4o-mini',
        provider: agentConfig.provider || config.provider,
        apiKey: agentConfig.apiKey || config.apiKey,
        baseUrl: agentConfig.baseUrl || config.baseURL,
        capabilities: { supportsVision },
        defaults: {
            maxTokens: metadata.maxTokens || agentConfig.maxTokens || config.defaults?.maxTokens,
            maxContextTokens: agentConfig.maxContextTokens || config.defaults?.maxContextTokens,
            temperature: metadata.temperature ?? agentConfig.temperature ?? config.defaults?.temperature,
            topP: agentConfig.topP ?? config.defaults?.topP
        }
    };

    const allTools = toolRegistry.listTools();
    const allowedTools = filterToolsByPolicy(allTools, metadata.toolPolicy);
    // Expandir MCPs para suas ferramentas
    const mcpLoader = new McpLoader();
    const expandedToolNames = expandMcpTools(metadata.tools, mcpLoader, allTools);

    const selectedTools = expandedToolNames.length > 0
        ? allowedTools.filter((t: ITool) => expandedToolNames.includes(t.name))
        : allowedTools;

    let finalTools = [...selectedTools];
    if (metadata.type === 'sub-agent' && finalTools.some((t: ITool) => t.name === 'ask_user')) {
        finalTools = finalTools.filter((t: ITool) => t.name !== 'ask_user');
    }

    if (!_skipSubAgents && metadata.type === 'main-agent') {
        const registry = AgentRegistry.getInstance();
        const allSubAgents = registry.listByType('sub-agent');
        const allowedSubAgents = filterSubAgents(allSubAgents, metadata.subAgents);

        if (allowedSubAgents.length === 0 && metadata.tools.includes('call_flow')) {
            finalTools = selectedTools.filter((t: ITool) => t.name !== 'call_flow');
        } else if (allowedSubAgents.length > 0 && metadata.tools.includes('call_flow')) {
            const flowRegistry = new FlowRegistryImpl();

            for (const subAgent of allowedSubAgents) {
                try {
                    const result = await createAgentWithDefinition(subAgent, telemetry);

                    flowRegistry.register(subAgent.name, {
                        id: subAgent.name,
                        version: '1',
                        kind: 'agentFlow',
                        graph: result.graphDefinition
                    });

                } catch (error) {
                    logger.error('[' + metadata.name + '] ✗ Erro ao criar sub-agente ' + subAgent.name + ':', error);
                }
            }

            const flowRunner = new FlowRunnerImpl(flowRegistry, { llmConfig });
            const callFlowTool = new CallFlowTool(flowRunner);

            try {
                toolRegistry.unregister('call_flow');
            } catch (e) {}

            toolRegistry.register(callFlowTool);

            finalTools = finalTools.filter((t: ITool) => t.name !== 'call_flow');
            finalTools.push(callFlowTool);
        }
    }

    const graphDefinition: GraphDefinition = {
        ...REACT_AGENT_FLOW,
        nodes: { ...REACT_AGENT_FLOW.nodes }
    };

    graphDefinition.nodes.agent = createAgentNode({
        llm: llmConfig,
        promptConfig: {
            mode: 'react' as any,
            agentInfo: {
                name: metadata.name,
                goal: metadata.description,
                backstory: systemPrompt.substring(0, 500)
            },
            additionalInstructions: systemPrompt,
            tools: finalTools,
            toolPolicy: metadata.toolPolicy
        },
        contextHooks: createCliContextHooks(compressionManager),
        autoExecuteTools: false,
        temperature: metadata.temperature ?? config.defaults?.temperature,
        maxTokens: metadata.maxTokens || config.defaults?.maxTokens
    });

    if (metadata.customErrorHandling) {
        const originalExecuteNode = graphDefinition.nodes.execute;

        graphDefinition.nodes.execute = async (state: any, engine: any) => {
            if (state.status === 'ERROR') {
                logger.warn('[' + metadata.name + '] Erro detectado, aplicando tratamento customizado');
            }
            return originalExecuteNode(state, engine);
        };
    }

    const engine = new GraphEngine(
        graphDefinition,
        telemetry ? { trace: telemetry.trace, telemetry: telemetry.telemetry } : undefined,
        llmConfig
    );

    return engine;
}
