import { ToolBase, IToolParams } from 'frame-agent-sdk';
import { randomUUID } from 'crypto';
import { logger } from '../core/services/logger';
import treeKill from 'tree-kill';

const SHOW_TOOL_LOGS_INLINE = (process.env.SHOW_TOOL_LOGS_INLINE || '').toLowerCase() === 'true';
const toolLog = (...args: any[]) => {
  if (SHOW_TOOL_LOGS_INLINE) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    logger.info(message);
  }
};
const errorLog = (...args: any[]) => {
  if (SHOW_TOOL_LOGS_INLINE) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    logger.error(message);
  }
};
const TOOL_ID = '[terminal]';

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms

const DANGEROUS_COMMANDS: readonly string[] = ['rm -rf', 'format', 'del', 'shutdown', ':(){ :|:& };:'];


/**
 * Gerenciador Interno de Processos
 * ================================
 * Estrutura para armazenar e gerenciar processos persistentes.
 * Não implementa execução de comandos ainda, apenas gerenciamento.
 */

// Interface para informações do processo
interface ProcessInfo {
  process: any; // Usando any devido à importação dinâmica do execa
  createdAt: number;
  command: string;
  background: boolean;
  timeoutId?: NodeJS.Timeout;
}

// Map global para processos ativos
const processMap = new Map<string, ProcessInfo>();

/**
 * Adiciona um processo ao mapa de gerenciamento.
 * @param sessionId - Identificador único da sessão/processo
 * @param command - Comando original executado
 * @param background - Indica se roda em background
 */
function addProcess(sessionId: string, process: any, command: string, background: boolean, timeoutMs: number): void {
  if (!sessionId) {
    throw new Error('SessionId é obrigatório para addProcess');
  }

  const timeoutId = setTimeout(() => {
    const info = processMap.get(sessionId);
    if (info && info.process.pid) {
      // Usar tree-kill no timeout também para garantir cleanup completo
      treeKill(info.process.pid, 'SIGTERM', (err) => {
        if (err) {
          errorLog(`${TOOL_ID} Erro ao matar processo timeout ${sessionId}:`, err.message);
          try {
            info.process.kill();
          } catch { }
        }
        logger.warn(`${TOOL_ID} Processo ${sessionId} (${command}) terminado por timeout`);
      });
    }
    cleanupProcess(sessionId);
  }, timeoutMs);

  const info: ProcessInfo = {
    process,
    createdAt: Date.now(),
    command,
    background,
    timeoutId,
  };

  processMap.set(sessionId, info);
}

/**
 * Obtém as informações completas de um processo.
 * @param sessionId - Identificador da sessão
 * @returns ProcessInfo ou undefined se não encontrado
 */
function getProcess(sessionId: string): ProcessInfo | undefined {
  if (!sessionId) {
    return undefined;
  }

  return processMap.get(sessionId);
}

/**
 * Remove um processo do gerenciamento.
 * @param sessionId - Identificador da sessão
 */
function removeProcess(sessionId: string): void {
  if (!sessionId) {
    return;
  }

  processMap.delete(sessionId);
}

/**
 * Lista processos ativos com informações resumidas (sem referência ao process).
 * @returns Array de resumos dos processos
 */
function listProcesses(): Array<{
  sessionId: string;
  createdAt: number;
  command: string;
  background: boolean;
}> {
  return Array.from(processMap.entries()).map(([sessionId, info]) => ({
    sessionId,
    createdAt: info.createdAt,
    command: info.command,
    background: info.background,
  }));
}

/**
 * Valida se o comando contém padrões perigosos.
 * @param command Comando a ser validado
 * @throws Error com TerminalErrorMessages.DANGEROUS_COMMAND se perigoso
 */
function validateCommandSafety(command: string): void {
  if (DANGEROUS_COMMANDS.some((dangerous: string) => command.includes(dangerous))) {
    throw new Error(TerminalErrorMessages.DANGEROUS_COMMAND);
  }
}

/**
 * Executa cleanup completo: limpa timeout e remove do map.
 * @param sessionId ID da sessão
 */
function cleanupProcess(sessionId: string): void {
  const info = getProcess(sessionId);
  if (!info) {
    return;
  }
  if (info.timeoutId) {
    clearTimeout(info.timeoutId);
  }
  removeProcess(sessionId);
}

/**
 * Adiciona listeners para exit e error com cleanup automático.
 * @param sessionId ID da sessão
 */
function setupProcessListeners(sessionId: string): void {
  const info = getProcess(sessionId);
  if (!info) {
    return;
  }
  const proc = info.process;
  proc.on('close', () => cleanupProcess(sessionId));
  proc.on('error', (err: Error) => {
    errorLog(`${TOOL_ID} Erro no processo ${sessionId}:`, err.message);
    cleanupProcess(sessionId);
  });
}

/** Resultado padronizado das operações do terminal */
interface ITerminalResult {
  success: boolean;
  message?: string;
  sessionId?: string;
  output?: string;
  processes?: Array<{
    sessionId: string;
    createdAt: number;
    command: string;
    background: boolean;
  }>;
}

/** Mensagens de erro padronizadas */
enum TerminalErrorMessages {
  ACTION_REQUIRED = 'Ação é obrigatória',
  ACTION_INVALID = 'Ação inválida',
  COMMAND_REQUIRED = 'Comando é obrigatório para ação create',
  SESSION_REQUIRED = 'SessionId é obrigatório',
  SESSION_NOT_FOUND = 'Sessão de processo não encontrada',
  PROCESS_INACTIVE = 'Processo inativo ou stdin não disponível',
  INPUT_REQUIRED = 'Input é obrigatório para ação send',
  PROCESS_NOT_FOUND = 'Processo não encontrado',
  DANGEROUS_COMMAND = 'Comando bloqueado por segurança',
}

interface ITerminalParams extends IToolParams {
  action: 'create' | 'send' | 'kill' | 'list' | 'status';
  sessionId?: string;
  command?: string;
  input?: string;
  background?: boolean;
  shell?: string;
  timeout?: number;
}

class TerminalParams {
  static schemaProperties = {
    action: { type: 'string', enum: ['create', 'send', 'kill', 'list', 'status'], required: true },
    sessionId: { type: 'string', required: false },
    command: { type: 'string', required: false },
    input: { type: 'string', required: false },
    background: { type: 'boolean', required: false },
    shell: { type: 'string', required: false },
    timeout: { type: 'number', required: false }
  } as const;
}

export const terminalTool = new class extends ToolBase<ITerminalParams, ITerminalResult> {
  public readonly name = 'terminal';
  public readonly description = `Gerencia sessões de terminal persistentes com execa...
  
## Parâmetros
- action: create|send|kill|list|status
- sessionId: (opcional) ID da sessão existente
- command: (obrigatório para create) comando a executar
- input: (obrigatório para send) texto a enviar para o processo
- background: (default: false) executa em background
- shell: (opcional) especifica shell (ex: "bash" para GIT BASH)
- timeout: (default: 30m) timeout em milissegundos`;
  public readonly parameterSchema = TerminalParams;

  public async execute(params: ITerminalParams): Promise<ITerminalResult> {
    // DEBUG: Log dos parâmetros recebidos
    logger.debug(`${TOOL_ID} execute() chamado com params:`, JSON.stringify(params, null, 2));
    
    // Validação inicial baseada na ação
    if (!params.action) {
      logger.debug(`${TOOL_ID} Action não fornecido`);
      return { success: false, message: TerminalErrorMessages.ACTION_REQUIRED };
    }

    switch (params.action) {
      case 'create':
        if (!params.command) {
          logger.debug(`${TOOL_ID} Command não fornecido para create`);
          return { success: false, message: TerminalErrorMessages.COMMAND_REQUIRED };
        }
        break;
      case 'send':
        if (!params.sessionId) {
          logger.debug(`${TOOL_ID} SessionId não fornecido para send`);
          return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
        }
        if (!params.input) {
          logger.debug(`${TOOL_ID} Input não fornecido para send`);
          return { success: false, message: TerminalErrorMessages.INPUT_REQUIRED };
        }
        break;
      case 'kill':
      case 'status':
        if (!params.sessionId) {
          logger.debug(`${TOOL_ID} SessionId não fornecido para ${params.action}`);
          return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
        }
        break;
      case 'list':
        // Não requer parâmetros adicionais
        break;
      default:
        logger.debug(`${TOOL_ID} Action inválido: ${params.action}`);
        return { success: false, message: TerminalErrorMessages.ACTION_INVALID };
    }
    
    logger.debug(`${TOOL_ID} Tipo de params.action:`, typeof params.action);
    
    const handlers: Record<ITerminalParams['action'], (params: ITerminalParams) => Promise<ITerminalResult>> = {
      create: this.handleCreate.bind(this),
      send: this.handleSend.bind(this),
      kill: this.handleKill.bind(this),
      list: this.handleList.bind(this),
      status: this.handleStatus.bind(this),
    };

    try {
      if (!params.action) {
        logger.debug(`${TOOL_ID} Action não fornecido`);
        return { success: false, message: TerminalErrorMessages.ACTION_REQUIRED };
      }

      const handler = handlers[params.action];
      if (!handler) {
        logger.debug(`${TOOL_ID} Action inválido: ${params.action}`);
        return { success: false, message: TerminalErrorMessages.ACTION_INVALID };
      }

      logger.debug(`${TOOL_ID} Handler encontrado para action: ${params.action}`);
      return await handler(params);
    } catch (error: any) {
      errorLog(`${TOOL_ID} Erro geral:`, error);
      return { success: false, message: error.message || 'Erro interno no terminal' };
    }
  }
  private async handleCreate(params: ITerminalParams): Promise<ITerminalResult> {
    if (!params.command) {
      return { success: false, message: TerminalErrorMessages.COMMAND_REQUIRED };
    } else if (!params.action) {
      return { success: false, message: TerminalErrorMessages.ACTION_REQUIRED };
    }

    validateCommandSafety(params.command);

    const timeoutMs = params.timeout ?? DEFAULT_TIMEOUT;

    const sessionId = params.sessionId ?? randomUUID();
    const isBackgroundProcess = params.background ?? false;
    const shellOptions = params.shell ?
      { shell: params.shell } :
      { shell: process.platform === 'win32' ? 'bash' : true };

    if (isBackgroundProcess) {
      const { execa } = await import('execa');
      const childProcess = execa(params.command, {
        ...shellOptions,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      addProcess(sessionId, childProcess, params.command, true, timeoutMs);
      setupProcessListeners(sessionId);
      childProcess.unref?.();
      toolLog(`${TOOL_ID} ✓ Processo ${sessionId} criado. PID: ${childProcess.pid}`);
      return {
        success: true,
        sessionId,
        message: `Processo em background criado. PID: ${childProcess.pid}`,
      };
    }

    // Execução em foreground
    const { execa } = await import('execa');
    const childProcess = execa(params.command, {
      ...shellOptions,
      stdio: 'pipe',
      windowsHide: true
    });
    addProcess(sessionId, childProcess, params.command, false, timeoutMs);
    setupProcessListeners(sessionId);

    try {
      const { stdout, stderr } = await childProcess;
      const output = stdout + stderr;
      cleanupProcess(sessionId);
      toolLog(`${TOOL_ID} ✓ Processo ${sessionId} criado. PID: ${childProcess.pid}`);
      return {
        success: true,
        sessionId,
        output: stdout,
        message: `Comando executado com sucesso. PID: ${childProcess.pid}`
      };
    } catch (error: any) {
      cleanupProcess(sessionId);
      return { success: false, message: error.message || 'Falha na execução', sessionId };
    }
  }

  private async handleSend(params: ITerminalParams): Promise<ITerminalResult> {
    if (!params.sessionId) {
      return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
    }

    if (!params.input) {
      return { success: false, message: TerminalErrorMessages.INPUT_REQUIRED };
    }

    const processInfo = getProcess(params.sessionId);
    if (!processInfo) {
      return { success: false, message: TerminalErrorMessages.SESSION_NOT_FOUND };
    }

    const childProcess = processInfo.process;
    if (!childProcess.stdin) {
      return { success: false, message: TerminalErrorMessages.PROCESS_INACTIVE };
    }

    childProcess.stdin.write(`${params.input}\n`);
    toolLog(`${TOOL_ID} ✓ Input enviado ao processo ${params.sessionId}: ${params.input}`);
    return {
      success: true,
      message: `Input enviado ao processo: ${params.input}`,
      sessionId: params.sessionId
    };
  }

  private async handleKill(params: ITerminalParams): Promise<ITerminalResult> {
    if (!params.sessionId) {
      return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
    }

    const processInfo = getProcess(params.sessionId);
    if (!processInfo) {
      return { success: false, message: TerminalErrorMessages.SESSION_NOT_FOUND };
    }

    const command = processInfo.command;
    const pid = processInfo.process.pid;

    if (!pid) {
      // Fallback se o PID não existir
      processInfo.process.kill();
      cleanupProcess(params.sessionId);
      toolLog(`${TOOL_ID} ✓ Processo ${params.sessionId} (${command}) finalizado (sem PID)`);
      return {
        success: true,
        message: `Processo finalizado: ${command}`,
        sessionId: params.sessionId
      };
    }

    // Usar tree-kill para matar árvore completa de processos
    return new Promise((resolve) => {
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          errorLog(`${TOOL_ID} Erro ao matar árvore de processos ${params.sessionId}:`, err.message);
          // Tentar fallback com kill simples
          try {
            processInfo.process.kill();
          } catch (killErr: any) {
            errorLog(`${TOOL_ID} Erro no fallback kill:`, killErr.message);
          }
        }
        cleanupProcess(params.sessionId!);
        toolLog(`${TOOL_ID} ✓ Processo ${params.sessionId} (${command}) e seus filhos finalizados`);
        resolve({
          success: true,
          message: `Processo e filhos finalizados: ${command}`,
          sessionId: params.sessionId
        });
      });
    });
  }

  private formatProcessList(processes: Array<{
    sessionId: string;
    createdAt: number;
    command: string;
    background: boolean;
  }>): string {
    if (processes.length === 0) {
      return "Nenhum processo ativo.";
    }

    const header = "Processos ativos:\n";
    const processLines = processes.map(p =>
      `  ${p.sessionId}: ${p.command} (${p.background ? 'background' : 'foreground'})`
    );

    return header + processLines.join('\n');
  }

  private async handleList(_params: ITerminalParams): Promise<ITerminalResult> {
    const processesList = listProcesses();
    const formattedOutput = this.formatProcessList(processesList);
    return {
      success: true,
      message: formattedOutput,
      processes: processesList,
    };
  }

  private async handleStatus(params: ITerminalParams): Promise<ITerminalResult> {
    if (!params.sessionId) {
      return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
    }

    const processInfo = getProcess(params.sessionId);
    if (!processInfo) {
      return { success: false, message: TerminalErrorMessages.SESSION_NOT_FOUND };
    }

    return {
      success: true,
      message: `Processo ativo: ${processInfo.command}`,
      sessionId: params.sessionId
    };
  }
};
