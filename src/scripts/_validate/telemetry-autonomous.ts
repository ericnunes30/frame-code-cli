import 'dotenv/config';

import { processAutonomousInput } from '../../cli/commands/autonomous';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  process.env.DEBUG = process.env.DEBUG ?? 'false';
  process.env.TELEMETRY_ENABLED = 'true';
  process.env.TELEMETRY_VERBOSE = 'false';
  process.env.TELEMETRY_LEVEL = 'info';

  // Prevent side effects during validation.
  process.env.EXCLUDED_TOOLS = ['terminal', 'file_create', 'file_edit', 'toDoIst'].join(',');

  const out = await processAutonomousInput('apenas diga OK usando final_answer', { verbose: false });
  assert(out.trim() === 'OK', `expected output OK, got: ${out}`);

  console.log('[OK] telemetry-autonomous');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[FAIL] telemetry-autonomous');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

