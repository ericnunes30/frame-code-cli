import { ToolBase, IToolParams } from 'frame-agent-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../core/logger';
const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const toolLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.info(...args); };
const errorLog = (...args: any[]) => { if (SHOW_TOOL_LOGS_INLINE) logger.error(...args); };

const execPromise = promisify(exec);
const TOOL_ID = '[terminal]';

interface TerminalParams extends IToolParams {
  command: string;
}

class TerminalParams {
  static schemaProperties = {
    command: 'string',
  } as const;
}

export const terminalTool = new class extends ToolBase<TerminalParams, { success: boolean; output?: string; message?: string }> {
  public readonly name = 'terminal';
  public readonly description = 'Executar comandos shell não interativos e retornar a saída (sem sessões persistentes).';
  public readonly parameterSchema = TerminalParams;

  public async execute(params: TerminalParams): Promise<{ success: boolean; output?: string; message?: string }> {
    try {
      toolLog(`${TOOL_ID} ▶ Executando comando`);
      toolLog(`${TOOL_ID} → ${params.command}`);

      const { stdout, stderr } = await execPromise(params.command, { windowsHide: true });
      const cleanedStdout = stdout?.trim() ?? '';
      const cleanedStderr = stderr?.trim() ?? '';
      const combined = [cleanedStdout, cleanedStderr].filter(Boolean).join('\n');

      if (combined) {
        toolLog(`${TOOL_ID} ✓ Saída capturada`);
        toolLog(`${TOOL_ID} →\n${combined}`);
        return { success: true, output: combined };
      }

      const noOutputMessage = 'Comando executado, mas não gerou saída visível.';
      toolLog(`${TOOL_ID} ✓ ${noOutputMessage}`);
      return { success: true, message: noOutputMessage };
    } catch (error: any) {
      const message = error?.stderr?.trim() || error?.message || 'motivo desconhecido';
      errorLog(`${TOOL_ID} ✗ ${message}`);
      throw new Error(`✗ Erro ao executar comando: ${message}`);
    }
  }
}();
