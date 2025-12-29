import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { logger } from '../../infrastructure/logging/logger';
import { GraphStatus } from '@ericnunes/frame-agent-sdk';
import { initializeTools } from '../../tools';
import { loadConfig } from '../../infrastructure/config';
import { AgentRegistry } from '../../agent-runtime/registry';
import { readCliInput } from '../input/reader';
import { createCliTelemetry } from '../../infrastructure/telemetry';
import { cleanupAttachmentsRoot, getAttachmentsCleanupConfigFromEnv, stageImageAttachments } from '../input/images/attachments';

export interface MultiAgentOptions {
  inputFile?: string;
  outputFile?: string;
  logFile?: string;
  verbose?: boolean;
  additionalInput?: string;
  image?: string[];
  imageDetail?: 'low' | 'high' | 'auto';
  _runId?: string;
  _imagePaths?: string[];
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
    const registry = AgentRegistry.getInstance();

    const previousMode = process.env.AGENT_MODE;
    process.env.AGENT_MODE = 'autonomous';
    await initializeTools({ allowAskUser: true });
    if (previousMode !== undefined) {
      process.env.AGENT_MODE = previousMode;
    }

    const graph = await registry.createEngine('supervisor', {
      trace,
      telemetry
    });

    const imagePaths = options._imagePaths ?? [];
    const imageDetail = options.imageDetail ?? 'auto';

    const initialState = {
      messages: [],
      data: {
        input,
        shared: {
          ...(imagePaths.length ? { imagePaths, imageDetail } : {})
        },
        ...(options._runId ? { runId: options._runId } : {})
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
      return `[supervisor] ${output}`;
    }

    return '[supervisor] Execution finished without captured output';
  } catch (error) {
    logger.error('[MultiAgent] Execution failed:', error);
    throw error;
  }
}

export function createMultiAgentCommand(): Command {
  const command = new Command('multi-agent');

  const collect = (value: string, previous: string[]) => {
    return [...(previous ?? []), value];
  };

  command
    .description('Run multi-agent planner + implementer flow')
    .argument('[additional-input]', 'Additional text with priority over input file')
    .option('-i, --input-file <file>', 'Input file with prompt')
    .option('-o, --output-file <file>', 'Output file for response')
    .option('-l, --log-file <file>', 'Log file for details')
    .option('-v, --verbose', 'Verbose mode')
    .option('--image <path>', 'Caminho de imagem local (pode repetir)', collect, [] as string[])
    .option('--image-detail <low|high|auto>', 'Nivel de detalhe para imagem (low|high|auto)', 'auto')
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

        if (options.image && options.image.length > 0) {
          await cleanupAttachmentsRoot(getAttachmentsCleanupConfigFromEnv());
          const staged = await stageImageAttachments({ imagePaths: options.image });
          options._runId = staged.runId;
          options._imagePaths = staged.stagedPaths;
        }

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
