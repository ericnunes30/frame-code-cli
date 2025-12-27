import * as fs from 'node:fs';
import type { TraceEvent, TraceSink } from 'frame-agent-sdk';
import { formatTraceEventForTerminal, type TraceFormatOptions } from './traceEventFormatter';

export class ConsoleTraceSink implements TraceSink {
  private readonly opts: TraceFormatOptions;
  private readonly stdoutFd: number;

  constructor(opts?: TraceFormatOptions) {
    this.opts = opts ?? {};
    this.stdoutFd = process.stdout.fd;
  }

  emit(event: TraceEvent): void {
    const lines = formatTraceEventForTerminal(event, this.opts);
    for (const line of lines) {
      // Escreve de forma SÍNCRONA diretamente no file descriptor
      // Isso contorna o buffer do stream do Node.js
      const buffer = Buffer.from(line + '\n', 'utf-8');
      fs.writeSync(this.stdoutFd, buffer, 0, buffer.length, null);
    }
  }
}

