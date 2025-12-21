import {
  GraphDefinition,
  GraphStatus,
  type GraphNode,
  type IGraphState,
  type Message,
  type AgentLLMConfig,
  createAgentFlowTemplate,
  createToolExecutorNode,
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

function getImplementerTools(mode: 'full' | 'final-only') {
  const baseConfig = getToolFilterConfig();
  const tools = filterToolsByPolicy(
    toolRegistry.listTools(),
    { deny: ['ask_user', 'call_flow'] },
    {
      ...baseConfig,
      mode: 'autonomous',
      allowAskUser: false
    }
  );
  if (mode === 'final-only') {
    return tools.filter((tool) => tool.name === 'final_answer');
  }
  return tools;
}

export async function createImplementerFlowGraph(options?: {
  modelName?: string;
  toolsMode?: 'full' | 'final-only';
}): Promise<GraphDefinition> {
  const config = await loadConfig();
  const toolsMode = options?.toolsMode ?? 'full';

  let compressionManager: CompressionManager | undefined;
  let compressionPrompt = '';
  if (config.compression?.enabled !== false) {
    compressionManager = new CompressionManager({ ...config.compression, persistKey: 'multi-agent.implementer' });
    compressionPrompt = compressionManager.getCompressionPrompt();
    logger.info('[ImplementerFlow] CompressionManager initialized');
  }

  let systemPrompt = '';
  try {
    systemPrompt = loadSystemPrompt.loadFileContent('system-prompt-implement.md', compressionPrompt);
  } catch (error) {
    logger.error('Failed to load implementer prompt:', error);
    systemPrompt = 'You are an implementation agent.';
  }

  const llmConfig = buildLlmConfig(options?.modelName, config);
  const toolPolicy = options?.toolsMode === 'final-only'
    ? { allow: ['final_answer'] }
    : { deny: ['ask_user', 'call_flow'], allowAskUser: false };

  const seedInputNode: GraphNode = async (state): Promise<{ messages?: Message[]; metadata?: Record<string, unknown> }> => {
    const inputText = extractInput(state);
    const shared = (state.data as { shared?: Record<string, unknown> } | undefined)?.shared;
    const planText = typeof shared?.plan === 'string' ? shared.plan : shared?.plan ? JSON.stringify(shared.plan) : '';

    const messages: Message[] = [];
    if (planText) {
      messages.push({
        role: 'system',
        content: `Plan:\n${planText}`
      });
    }
    if (inputText) {
      messages.push({ role: 'user', content: inputText });
    }

    if (messages.length === 0) {
      logger.warn('[ImplementerFlow] No input or plan provided for implementer');
    }

    return messages.length > 0 ? { messages } : {};
  };

  const baseToolExecutorNode = createToolExecutorNode();
  const deniedTools = new Set(['ask_user', 'call_flow']);
  const toolExecutorNode: GraphNode = async (state: IGraphState, engine) => {
    const toolName = state.lastToolCall?.toolName;
    if (toolName && deniedTools.has(toolName)) {
      engine.addMessage({
        role: 'system',
        content: `Tool "${toolName}" is not allowed for the Executor. Continue using allowed tools and finish with final_answer.`
      });

      return {
        status: GraphStatus.RUNNING,
        lastToolCall: undefined,
        metadata: {
          ...(state.metadata || {}),
          toolPolicyViolation: {
            agent: 'executor',
            toolName,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      return await baseToolExecutorNode(state, engine);
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

  const captureOutputNode: GraphNode = async (state: IGraphState) => {
    const outputText = (extractFinalAnswer(state) ?? '').trim();
    if (!outputText) {
      logger.warn('[ImplementerFlow] No output content to capture');
      return {};
    }

    const preview = outputText.length > 500 ? `${outputText.slice(0, 500)}...` : outputText;
    logger.info(`[ImplementerFlow] Output captured (${outputText.length} chars):\n${preview}`);

    const data = (state.data ?? {}) as Record<string, unknown>;
    const existingPatch = Array.isArray(data.sharedPatch) ? data.sharedPatch : [];
    const nextPatch = [
      ...existingPatch,
      { op: 'set', path: 'output', value: outputText }
    ];

    return {
      data: {
        ...data,
        sharedPatch: nextPatch
      }
    };
  };

  return createAgentFlowTemplate({
    agent: {
      llm: llmConfig,
      promptConfig: {
        mode: 'react' as any,
        agentInfo: {
          name: 'Agente-Executor (Rafael)',
          goal: 'Execute the plan and deliver the final result.',
          backstory: 'You are a senior engineer focused on execution with evidence.'
        },
        additionalInstructions: systemPrompt,
        tools: getImplementerTools(toolsMode),
        toolPolicy
      },
      contextHooks: createCliContextHooks(compressionManager),
      autoExecuteTools: false,
      temperature: config.defaults?.temperature,
      maxTokens: config.defaults?.maxTokens
    },
    hooks: { seed: seedInputNode, capture: captureOutputNode },
    toolExecutor: toolExecutorNode,
    nodeIds: {
      reactValidation: 'validate',
      toolDetection: 'detect',
      toolExecutor: 'execute',
      capture: 'captureOutput'
    }
  });
}
