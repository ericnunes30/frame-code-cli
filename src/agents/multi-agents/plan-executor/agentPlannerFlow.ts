import {
  GraphDefinition,
  GraphStatus,
  type GraphNode,
  type IGraphState,
  type Message,
  type AgentLLMConfig,
  createAgentFlowTemplate,
  createToolExecutorNode,
  extractFinalAnswer
} from 'frame-agent-sdk';
import { loadSystemPrompt } from '../../../core/utils/loadSystemPrompt';
import { filterToolsByPolicy, getToolFilterConfig } from '../../../core/utils/toolRegistryFilter';
import { CompressionManager } from '../../../core/services/CompressionManager';
import { createCliContextHooks } from '../../../core/utils/cliContextHooks';
import { logger } from '../../../core/services/logger';
import { toolRegistry } from '../../../core/services/tools';
import { loadConfig } from '../../../core/services/config';
import { maybeAttachReadImageToContext } from '../../../core/utils/readImageAttachment';
import { instrumentGraphForRawLlmOutput } from '../../../core/utils/llmRawOutputLogger';

function buildLlmConfig(modelName: string | undefined, config: Awaited<ReturnType<typeof loadConfig>>): AgentLLMConfig {
  const supportsVision = config.vision?.supportsVision === true;
  const model =
    modelName ||
    (supportsVision ? config.vision?.model : undefined) ||
    config.defaults?.model ||
    'gpt-4o-mini';
  const provider = (supportsVision ? config.vision?.provider : undefined) || config.provider;
  const apiKey = (supportsVision ? config.vision?.apiKey : undefined) || config.apiKey;
  const baseUrl = (supportsVision ? config.vision?.baseURL : undefined) || config.baseURL;
  return {
    model,
    provider,
    apiKey,
    baseUrl,
    capabilities: { supportsVision },
    defaults: {
      maxTokens: config.defaults?.maxTokens,
      maxContextTokens: config.defaults?.maxContextTokens,
      temperature: config.defaults?.temperature
    }
  };
}

function getPlannerTools(mode: 'full' | 'final-only') {
  const baseConfig = getToolFilterConfig();
  return filterToolsByPolicy(
    toolRegistry.listTools(),
    { allow: ['search', 'file_read', 'file_outline', 'list_directory', 'read_image', 'final_answer'] },
    {
      ...baseConfig,
      mode: 'autonomous',
      allowAskUser: false
    }
  );
}

export async function createPlannerFlowGraph(options?: {
  modelName?: string;
  toolsMode?: 'full' | 'final-only';
}): Promise<GraphDefinition> {
  const config = await loadConfig();
  const toolsMode = options?.toolsMode ?? 'full';

  let compressionManager: CompressionManager | undefined;
  let compressionPrompt = '';
  if (config.compression?.enabled !== false) {
    compressionManager = new CompressionManager({ ...config.compression, persistKey: 'multi-agent.planner' });
    compressionPrompt = compressionManager.getCompressionPrompt();
    logger.info('[PlannerFlow] CompressionManager initialized');
  }

  let systemPrompt = '';
  try {
    systemPrompt = loadSystemPrompt.loadFileContent('system-prompt-plan.md', compressionPrompt);
  } catch (error) {
    logger.error('Failed to load planner prompt:', error);
    systemPrompt = 'You are a planning agent.';
  }

  const llmConfig = buildLlmConfig(options?.modelName, config);
  const toolPolicy = options?.toolsMode === 'final-only'
    ? { allow: ['final_answer'] }
    : { allow: ['search', 'file_read', 'file_outline', 'list_directory', 'read_image', 'final_answer'], allowAskUser: false };

  const allowedTools = new Set(['search', 'file_read', 'file_outline', 'list_directory', 'read_image', 'final_answer']);
  const baseToolExecutorNode = createToolExecutorNode();

  const toolExecutorNode: GraphNode = async (state: IGraphState, engine) => {
    const toolName = state.lastToolCall?.toolName;

    if (toolName && !allowedTools.has(toolName)) {
      engine.addMessage({
        role: 'system',
        content:
          `Tool "${toolName}" is not allowed for the Planner. Use only read-only tools (search/file_read/file_outline/list_directory) and finish with final_answer.`
      });

      return {
        status: GraphStatus.RUNNING,
        lastToolCall: undefined,
        metadata: {
          ...(state.metadata || {}),
          toolPolicyViolation: {
            agent: 'planner',
            toolName,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      const result = await baseToolExecutorNode(state, engine);
      await maybeAttachReadImageToContext({ engine, metadata: (result as any).metadata, textPrefix: 'Imagem anexada para planejamento.' });
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
          ...(state.metadata || {}),
          lastToolError: {
            toolName: toolName ?? 'unknown',
            errorMessage: message,
            timestamp: new Date().toISOString()
          }
        }
      };
    }
  };

  const capturePlanNode: GraphNode = async (state: IGraphState) => {
    const planText = (extractFinalAnswer(state) ?? '').trim();
    if (!planText) {
      logger.warn('[PlannerFlow] No plan content to capture');
      return {};
    }

    const preview = planText.length > 500 ? `${planText.slice(0, 500)}...` : planText;
    logger.info(`[PlannerFlow] Plan captured (${planText.length} chars):\n${preview}`);

    const data = (state.data ?? {}) as Record<string, unknown>;
    const existingPatch = Array.isArray(data.sharedPatch) ? data.sharedPatch : [];
    const nextPatch = [
      ...existingPatch,
      { op: 'set', path: 'plan', value: planText }
    ];

    return {
      data: {
        ...data,
        sharedPatch: nextPatch
      }
    };
  };

  const seedInputNode: GraphNode = async (state: IGraphState): Promise<{ messages?: Message[] }> => {
    const data = (state.data ?? {}) as Record<string, unknown>;
    const shared = (data.shared ?? {}) as Record<string, unknown>;
    const input = typeof (data as any).input === 'string' ? String((data as any).input) : '';
    const imagePaths = Array.isArray(shared.imagePaths) ? (shared.imagePaths as string[]) : [];

    const messages: Message[] = [];
    if (imagePaths.length > 0) {
      messages.push({
        role: 'system',
        content:
          `Imagens disponiveis (paths locais):\n${imagePaths.map((p) => `- ${p}`).join('\n')}\n\nSe precisar enxergar, chame read_image com source=\"path\" e path do arquivo.`
      });
    }
    if (input.trim().length > 0) {
      messages.push({ role: 'user', content: input });
    }

    return messages.length > 0 ? { messages } : {};
  };

  const graph = createAgentFlowTemplate({
    agent: {
      llm: llmConfig,
      promptConfig: {
        mode: 'react' as any,
        agentInfo: {
          name: 'Agente-Planner (Larissa)',
          goal: 'Produce a clear, actionable plan for the task.',
          backstory: 'You are a senior planner focused on structuring execution.'
        },
        additionalInstructions: systemPrompt,
        tools: getPlannerTools(toolsMode),
        toolPolicy
      },
      contextHooks: createCliContextHooks(compressionManager),
      autoExecuteTools: false,
      temperature: config.defaults?.temperature,
      maxTokens: config.defaults?.maxTokens
    },
    toolExecutor: toolExecutorNode,
    hooks: { seed: seedInputNode, capture: capturePlanNode },
    nodeIds: {
      reactValidation: 'validate',
      toolDetection: 'detect',
      toolExecutor: 'execute',
      capture: 'capturePlan'
    }
  });

  instrumentGraphForRawLlmOutput(graph, 'Agente-Planner');
  return graph;
}
