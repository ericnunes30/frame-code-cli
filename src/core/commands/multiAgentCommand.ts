import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { logger } from '../services/logger';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from '../services/tools';
import { loadConfig } from '../services/config';
import { createSupervisorEngine } from '../../agents/multi-agents/plan-executor/agentSupervisorFlow';
import { readCliInput } from '../utils/readCliInput';
import { createCliTelemetry } from '../telemetry';

export interface MultiAgentOptions {
  inputFile?: string;
  outputFile?: string;
  logFile?: string;
  verbose?: boolean;
  additionalInput?: string;
}

export async function processMultiAgentInput(input: string, options: MultiAgentOptions): Promise<string> {
  try {
    logger.info('[MultiAgent] Starting multi-agent execution');

    const normalizedInput = input.trim();
    const isPlaceholder = normalizedInput.length === 0;
    if (isPlaceholder) {
      logger.warn('[MultiAgent] Empty input detected, using default task');
      input = 'Explique como usar o frame-code-cli com base no codigo atual. Nao modifique arquivos e nao use ferramentas.';
    }

    if (options.verbose) {
      logger.info(`[MultiAgent] Input received: ${input.substring(0, 200)}...`);
    }

    await loadConfig();

    const { trace, telemetry } = createCliTelemetry();

    const previousMode = process.env.AGENT_MODE;
    process.env.AGENT_MODE = 'autonomous';
    await initializeTools({ allowAskUser: true });
    if (previousMode !== undefined) {
      process.env.AGENT_MODE = previousMode;
    }

    const graph = await createSupervisorEngine({
      toolsMode: isPlaceholder ? 'final-only' : 'full',
      trace,
      telemetry
    });

    const initialState = {
      messages: [],
      data: {
        input,
        shared: {}
      },
      status: GraphStatus.RUNNING
    };

    const result = await graph.execute(initialState);

    if (result.status === GraphStatus.ERROR) {
      throw new Error(`Execution error: ${result.state.logs?.join('\n') || 'Unknown error'}`);
    }

    if (result.status !== GraphStatus.FINISHED) {
      return `Execution finished with status: ${result.status}`;
    }

    const shared = (result.state.data as { shared?: Record<string, unknown> } | undefined)?.shared;
    const output = shared?.output;
    if (typeof output === 'string' && output.trim().length > 0) {
      return output;
    }

    return 'Execution finished without captured output';
  } catch (error) {
    logger.error('[MultiAgent] Execution failed:', error);
    throw error;
  }
}

export function createMultiAgentCommand(): Command {
  const command = new Command('multi-agent');

  command
    .description('Run multi-agent planner + implementer flow')
    .argument('[additional-input]', 'Additional text with priority over input file')
    .option('-i, --input-file <file>', 'Input file with prompt')
    .option('-o, --output-file <file>', 'Output file for response')
    .option('-l, --log-file <file>', 'Log file for details')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (additionalInput: string, options: MultiAgentOptions) => {
      try {
        if (options.inputFile) {
          logger.info(`[MultiAgent] Reading input from: ${options.inputFile}`);
        }

        if (additionalInput) {
          logger.info(`[MultiAgent] Adding input: ${additionalInput.substring(0, 100)}...`);
        }

        if (!options.inputFile && !additionalInput) {
          logger.info('[MultiAgent] Reading input from stdin');
        }

        const input = await readCliInput({ inputFile: options.inputFile, additionalInput });

        const result = await processMultiAgentInput(input, options);

        if (options.outputFile) {
          logger.info(`[MultiAgent] Writing output to: ${options.outputFile}`);
          writeFileSync(options.outputFile, result, 'utf-8');
        } else {
          console.log(result);
        }

        if (options.logFile) {
          writeFileSync(options.logFile, 'Detailed logs not implemented', 'utf-8');
        }

        logger.info('[MultiAgent] Execution completed');
        process.exit(0);
      } catch (error) {
        logger.error('[MultiAgent] Fatal error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (options.outputFile) {
          writeFileSync(options.outputFile, `## Error\n\n${errorMessage}`, 'utf-8');
        } else {
          console.error('Error:', errorMessage);
        }

        process.exit(1);
      }
    });

  return command;
}
