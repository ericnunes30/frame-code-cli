import type { TelemetryOptions } from 'frame-agent-sdk';

/**
 * Interface para sistema de telemetria.
 *
 * Define o contrato para coleta de métricas e traces.
 */
export interface ITelemetry {
    trace: any;
    telemetry: TelemetryOptions;
}

export interface ITelemetryService {
    create(options?: { trace?: boolean; telemetry?: TelemetryOptions }): ITelemetry;
}
