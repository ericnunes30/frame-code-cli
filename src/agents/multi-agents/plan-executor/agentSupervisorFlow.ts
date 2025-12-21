import {
  GraphDefinition,
  GraphEngine,
  FlowRegistryImpl,
  FlowRunnerImpl,
  CallFlowTool,
  createToolExecutorNode,
  GraphStatus,
  type GraphNode,
  type IGraphState,
  type AgentLLMConfig,
  type TelemetryOptions,
  type TraceSink,
  createAgentFlowTemplate,
  extractFinalAnswer,
  extractInput
} from 'frame-agent-sdk';
import { loadSystemPrompt } from '../../../core/utils/loadSystemPrompt';
import { filterToolsByPolicy, getToolFilterConfig } from '../../../core/utils/toolRegistryFilter';
import { CompressionManager } from '../../../core/services/CompressionManager';
import { createCliContextHooks } from '../../../core/utils/cliContextHooks';
import { logger } from '../../../core/services/logger';
import { toolRegistry } from '../../../core/services/tools';
import { loadConfig } from '../../../core/services/config';
import { createPlannerFlowGraph } from './agentPlannerFlow';
import { createImplementerFlowGraph } from './agentImplementerFlow';

function buildLlmConfig(modelName: string | undefined, config: Awaited<ReturnType<typeof loadConfig>>): AgentLLMConfig {
  const model = modelName || config.defaults?.model || 'gpt-4o-mini';
  return {
    model,
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseURL,
    defaults: {
      maxTokens: config.defaults?.maxTokens,
      maxContextTokens: config.defaults?.maxContextTokens,
      temperature: config.defaults?.temperature
    }
  };
}

function getSupervisorTools(mode: 'full' | 'final-only') {
  const baseConfig = getToolFilterConfig();
  const tools = filterToolsByPolicy(
    toolRegistry.listTools(),
    {
      allow: ['call_flow', 'final_answer', 'ask_user']
    },
    {
      ...baseConfig,
      mode: 'autonomous',
      allowAskUser: true
    }
  );
  if (mode === 'final-only') {
    return tools.filter((tool) => tool.name === 'final_answer');
  }
  if (!tools.some((tool) => tool.name === 'call_flow')) {
    logger.warn('[SupervisorFlow] call_flow tool not registered');
  }
  if (!tools.some((tool) => tool.name === 'ask_user')) {
    logger.warn('[SupervisorFlow] ask_user tool not registered');
  }
  return tools;
}

export async function createSupervisorFlowGraph(options?: {
  modelName?: string;
  toolsMode?: 'full' | 'final-only';
}): Promise<GraphDefinition> {
  const config = await loadConfig();
  const toolsMode = options?.toolsMode ?? 'full';

  let compressionManager: CompressionManager | undefined;
  let compressionPrompt = '';
  if (config.compression?.enabled !== false) {
    compressionManager = new CompressionManager({ ...config.compression, persistKey: 'multi-agent.supervisor' });
    compressionPrompt = compressionManager.getCompressionPrompt();
    logger.info('[SupervisorFlow] CompressionManager initialized');
  }

  let systemPrompt = '';
  try {
    systemPrompt = loadSystemPrompt.loadFileContent('system-prompt-supervisor.md', compressionPrompt);
  } catch (error) {
    logger.error('Failed to load supervisor prompt:', error);
    systemPrompt = 'You are a supervisor agent.';
  }

  const llmConfig = buildLlmConfig(options?.modelName, config);
  const toolPolicy = options?.toolsMode === 'final-only'
    ? { allow: ['final_answer'] }
    : { allow: ['call_flow', 'final_answer', 'ask_user'], allowAskUser: true };

  const baseToolExecutorNode = createToolExecutorNode();
  const allowedTools = new Set(['call_flow', 'ask_user', 'final_answer']);

  const toolExecutorNode: GraphNode = async (state: IGraphState, engine) => {
    const toolName = state.lastToolCall?.toolName;
    const metadataState = (state.metadata ?? {}) as Record<string, unknown>;

    if (toolName && !allowedTools.has(toolName)) {
      engine.addMessage({
        role: 'system',
        content: `Tool "${toolName}" is not allowed for the Supervisor. Use call_flow, ask_user, or final_answer only.`
      });
      return {
        status: GraphStatus.RUNNING,
        lastToolCall: undefined,
        metadata: {
          ...metadataState,
          toolPolicyViolation: {
            agent: 'supervisor',
            toolName,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      const result = await baseToolExecutorNode(state, engine);
      if (toolName === 'call_flow') {
        const callMetadata = (result.metadata ?? {}) as { output?: unknown; flowId?: string; status?: string; patch?: unknown };
        const flowId = callMetadata.flowId ?? 'unknown';
        const status = callMetadata.status ?? 'unknown';
        const patchCount = Array.isArray(callMetadata.patch) ? callMetadata.patch.length : 0;
        logger.info(`[SupervisorFlow] call_flow result: ${flowId} status=${status} patch=${patchCount}`);

        const shared = (result.data as { shared?: Record<string, unknown> } | undefined)?.shared
          ?? (state.data as { shared?: Record<string, unknown> } | undefined)?.shared;

        const planText = typeof shared?.plan === 'string' ? shared.plan : '';
        const outputText = typeof shared?.output === 'string'
          ? shared.output
          : callMetadata.output ? JSON.stringify(callMetadata.output) : '';

        const nextMetadata: Record<string, unknown> = {
          ...metadataState,
          ...(result.metadata ?? {})
        };

        const messages: Array<{ role: 'system'; content: string }> = [];
        const planInjected = Boolean((metadataState as any)?.planInjected);
        const outputInjected = Boolean((metadataState as any)?.outputInjected);

        if (flowId === 'planner-flow' && planText && !planInjected) {
          messages.push({ role: 'system', content: `Plan:\n${planText}` });
          nextMetadata.planInjected = true;
        }
        if (flowId === 'implementer-flow' && outputText && !outputInjected) {
          messages.push({ role: 'system', content: `Subflow output:\n${outputText}` });
          nextMetadata.outputInjected = true;
        }

        return {
          ...result,
          ...(messages.length ? { messages } : {}),
          metadata: nextMetadata
        };
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      engine.addMessage({
        role: 'system',
        content: `Tool error "${toolName ?? 'unknown'}":\n${message}\nFix parameters and try again.`
      });
      return {
        status: GraphStatus.RUNNING,
        lastToolCall: undefined,
        metadata: {
          ...metadataState,
          lastToolError: {
            toolName: toolName ?? 'unknown',
            errorMessage: message,
            timestamp: new Date().toISOString()
          }
        }
      };
    }
  };

  const captureFinalNode: GraphNode = async (state: IGraphState) => {
    const data = (state.data as any) ?? {};
    const shared = (data.shared ?? {}) as Record<string, unknown>;
    const hasPlan = typeof shared.plan === 'string' && String(shared.plan).trim().length > 0;
    const hasOutput = typeof shared.output === 'string' && String(shared.output).trim().length > 0;

    // Enforce hierarchical flow: Supervisor must delegate (planner -> implementer) before finishing.
    if (!hasPlan) {
      return {
        lastToolCall: undefined,
        messages: [
          {
            role: 'system',
            content:
              'VocÃª deve primeiro delegar para o subagente de planejamento via call_flow (flowId: "planner-flow"). NÃ£o finalize ainda.'
          }
        ],
        metadata: { ...(state.metadata ?? {}), delegationRequired: 'planner-flow' },
        nextNodeOverride: 'agent'
      };
    }

    if (!hasOutput) {
      return {
        lastToolCall: undefined,
        messages: [
          {
            role: 'system',
            content:
              'VocÃª deve agora delegar para o subagente executor via call_flow (flowId: "implementer-flow") passando o plano. NÃ£o finalize ainda.'
          }
        ],
        metadata: { ...(state.metadata ?? {}), delegationRequired: 'implementer-flow' },
        nextNodeOverride: 'agent'
      };
    }

    const outputText = (extractFinalAnswer(state) ?? String(shared.output ?? '')).trim();
    if (!outputText) {
      logger.warn('[SupervisorFlow] No final output to capture');
      return {};
    }

    const preview = outputText.length > 500 ? `${outputText.slice(0, 500)}...` : outputText;
    logger.info(`[SupervisorFlow] Final answer (${outputText.length} chars):\n${preview}`);

    return {
      data: {
        ...data,
        shared: { ...shared, output: outputText },
      },
    };
  };

  return createAgentFlowTemplate({
    agent: {
      llm: llmConfig,
      promptConfig: {
        mode: 'react' as any,
        agentInfo: {
          name: 'Agente-Supervisor (Mariana)',
          goal: 'Orchestrate sub-agents to complete the task.',
          backstory: 'You are an IT project manager who coordinates execution and delegates to subflows.'
        },
        additionalInstructions: systemPrompt,
        tools: getSupervisorTools(toolsMode),
        toolPolicy
      },
      contextHooks: createCliContextHooks(compressionManager),
      autoExecuteTools: false,
      temperature: config.defaults?.temperature,
      maxTokens: config.defaults?.maxTokens
    },
    toolExecutor: toolExecutorNode,
    hooks: {
      capture: captureFinalNode,
      seed: async (state) => {
        const inputText = extractInput(state);
        if (!inputText) return {};
        return { messages: [{ role: 'user', content: inputText }] };
      }
    },
    nodeIds: {
      reactValidation: 'validate',
      toolDetection: 'detect',
      toolExecutor: 'execute',
      capture: 'captureFinal'
    }
  });
}

export async function createSupervisorEngine(options?: {
  modelName?: string;
  toolsMode?: 'full' | 'final-only';
  trace?: TraceSink;
  telemetry?: TelemetryOptions;
}): Promise<GraphEngine> {
  const config = await loadConfig();
  const llmConfig = buildLlmConfig(options?.modelName, config);

  const registry = new FlowRegistryImpl();
  const plannerGraph = await createPlannerFlowGraph({
    modelName: options?.modelName,
    toolsMode: options?.toolsMode
  });
  const implementerGraph = await createImplementerFlowGraph({
    modelName: options?.modelName,
    toolsMode: options?.toolsMode
  });

  registry.register('planner-flow', {
    id: 'planner-flow',
    version: '1',
    kind: 'agentFlow',
    graph: plannerGraph
  });

  registry.register('implementer-flow', {
    id: 'implementer-flow',
    version: '1',
    kind: 'agentFlow',
    graph: implementerGraph
  });

  const runner = new FlowRunnerImpl(registry, { llmConfig });

  if (!toolRegistry.hasTool('call_flow')) {
    toolRegistry.register(new CallFlowTool(runner));
  }

  const supervisorGraph = await createSupervisorFlowGraph({
    modelName: options?.modelName,
    toolsMode: options?.toolsMode
  });

  return new GraphEngine(
    supervisorGraph,
    {
      trace: options?.trace,
      telemetry: options?.telemetry,
      traceContext: { agent: { label: 'Agente-Supervisor' } }
    },
    llmConfig
  );
}
