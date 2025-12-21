import type { TraceEvent, TraceSink } from 'frame-agent-sdk';
import { formatTraceEventForTerminal, type TraceFormatOptions } from './traceEventFormatter';

export class ConsoleTraceSink implements TraceSink {
  private readonly opts: TraceFormatOptions;

  constructor(opts?: TraceFormatOptions) {
    this.opts = opts ?? {};
  }

  emit(event: TraceEvent): void {
    const lines = formatTraceEventForTerminal(event, this.opts);
    for (const line of lines) {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }
}

