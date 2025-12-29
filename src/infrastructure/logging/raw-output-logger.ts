import type { GraphDefinition, GraphNode } from '@ericnunes/frame-agent-sdk';

function envTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isRawLlmOutputEnabled(): boolean {
  return envTruthy(process.env.DEBUG_LLM_RAW_OUTPUT) || envTruthy(process.env.DEBUG_LLM_RAW);
}

export function logRawLlmOutput(agentLabel: string, output: string): void {
  const header = `[LLM_RAW][${agentLabel}] (${output.length} chars)`;
  // Intencionalmente usa console.log para evitar qualquer truncamento do logger.
  console.log(`\n${header}\n${output}\n`);
}

export function instrumentGraphForRawLlmOutput(graph: GraphDefinition, agentLabel: string): GraphDefinition {
  if (!isRawLlmOutputEnabled()) return graph;

  const nodeId = 'agent';
  const original = graph.nodes?.[nodeId] as GraphNode | undefined;
  if (!original) return graph;

  graph.nodes[nodeId] = async (state, engine) => {
    const result = await original(state, engine);
    const output = (result as any)?.lastModelOutput;
    if (typeof output === 'string' && output.length > 0) {
      logRawLlmOutput(agentLabel, output);
    }
    return result;
  };

  return graph;
}

