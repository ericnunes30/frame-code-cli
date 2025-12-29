import type { TelemetryOptions, TraceSink } from '@ericnunes/frame-agent-sdk';
import { MultiplexTraceSink } from '@ericnunes/frame-agent-sdk';
import { ConsoleTraceSink } from './traceSinkConsole';

function readBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  if (value === '1') return true;
  if (value === '0') return false;
  return value.toLowerCase() === 'true';
}

export function createCliTelemetry(): {
  trace: TraceSink;
  telemetry: TelemetryOptions;
  verbose: boolean;
} {
  const enabled = readBool(process.env.TELEMETRY_ENABLED, true);
  const verbose = readBool(process.env.TELEMETRY_VERBOSE, readBool(process.env.DEBUG, false));
  const level = (process.env.TELEMETRY_LEVEL ?? (verbose ? 'debug' : 'info')) as 'info' | 'debug';

  const telemetry: TelemetryOptions = {
    enabled,
    level,
    persistToState: false,
    includePrompts: false,
    maxPayloadChars: 4000,
    maxEvents: 200,
  };

  const consoleSink = new ConsoleTraceSink({ verbose });
  const trace = new MultiplexTraceSink([consoleSink]);

  return { trace, telemetry, verbose };
}

