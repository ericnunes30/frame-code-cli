import 'dotenv/config';

import { processMultiAgentInput } from '../../cli/commands/multi-agent';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  process.env.DEBUG = process.env.DEBUG ?? 'false';
  process.env.TELEMETRY_ENABLED = 'true';
  process.env.TELEMETRY_VERBOSE = 'true';
  process.env.TELEMETRY_LEVEL = 'info';

  // Prevent side effects during validation.
  process.env.EXCLUDED_TOOLS = [
    'terminal',
    'file_create',
    'file_edit',
    'toDoIst',
    'search',
    'file_read',
    'file_outline',
    'list_directory',
    'enable_skill',
    'list_skills',
  ].join(',');

  const captured: string[] = [];
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    captured.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    originalLog(...args);
  };

  try {
    const out = await processMultiAgentInput(
      "[teste telemetria] Supervisor: chame call_flow planner-flow. Planner: responda usando final_answer com answer exatamente 'PLAN-OK'. Nao use outras tools. Depois Supervisor: chame call_flow implementer-flow. Implementer: responda usando final_answer com answer exatamente 'EXEC-OK'. Nao use outras tools. Por fim Supervisor: responda final_answer com answer exatamente 'SUP-OK'.",
      { verbose: false }
    );

    assert(typeof out === 'string' && out.trim().length > 0, 'expected non-empty output');
    assert(out.trim() === 'SUP-OK', `expected output SUP-OK, got: ${out}`);

    const text = captured.join('\n');
    assert(text.includes('Agente-Supervisor'), 'expected telemetry to include Agente-Supervisor');
    assert(text.includes('Agente-Planner'), 'expected telemetry to include Agente-Planner');
    assert(text.includes('Agente-Executor'), 'expected telemetry to include Agente-Executor');

    console.log('[OK] telemetry-multi-agent');
  } finally {
    console.log = originalLog;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[FAIL] telemetry-multi-agent');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

