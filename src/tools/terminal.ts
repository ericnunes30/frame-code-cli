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
 * Buffer circular para armazenar output de processos background
 */
class OutputBuffer {
  private buffer: string[] = [];
  private maxSize: number = 1000;

  add(data: string): void {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  get(lines?: number): string {
    if (lines) {
      return this.buffer.slice(-lines).join('');
    }
    return this.buffer.join('');
  }

  getLastLines(count: number): string[] {
    return this.buffer.slice(-count);
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}


/**
 * Gerenciador Interno de Processos
 * ================================
 * Estrutura para armazenar e gerenciar processos persistentes.
 */

// Interface para informações do processo
interface ProcessInfo {
  process: any; // Usando any devido à importação dinâmica do execa
  createdAt: number;
  command: string;
  background: boolean;
  interactive: boolean;
  sessionId: string;
  outputBuffer: OutputBuffer;
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
function addProcess(sessionId: string, process: any, command: string, background: boolean, interactive: boolean, timeoutMs: number): void {
  if (!sessionId) {
    throw new Error('SessionId é obrigatório para addProcess');
  }

  const outputBuffer = new OutputBuffer();

  // Configurar captura de output para processos background
  if (background) {
    process.stdout?.on('data', (data: Buffer) => {
      outputBuffer.add(data.toString());
    });

    process.stderr?.on('data', (data: Buffer) => {
      outputBuffer.add(data.toString());
    });
  }

  let timeoutId: NodeJS.Timeout | undefined;

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
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
  }

  const info: ProcessInfo = {
    process,
    createdAt: Date.now(),
    command,
    background,
    interactive,
    sessionId,
    outputBuffer,
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
 * Lista processos ativos com informações resumidas.
 * @returns Array de resumos dos processos
 */
function listProcesses(): Array<{
  sessionId: string;
  createdAt: number;
  command: string;
  background: boolean;
  interactive: boolean;
}> {
  return Array.from(processMap.entries()).map(([sessionId, info]) => ({
    sessionId,
    createdAt: info.createdAt,
    command: info.command,
    background: info.background,
    interactive: info.interactive,
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
 * Detecta se o processo está aguardando input do usuário
 */
function detectWaitingInput(output: string): boolean {
  if (!output || output.trim().length === 0) {
    return false;
  }

  const inputPrompts = [
    ':', '?', '>', '$', '#', '=>', '>>>',
    'Password:', 'password:', 'Enter password', 'Enter password:',
    'Enter:', 'enter:', 'Input:', 'input:',
    'Choose:', 'choose:', 'Select:', 'select:',
    'Continue?', 'continue?', 'Proceed?', 'proceed?',
    'Are you sure?', 'are you sure?', '(y/n)', '(Y/n)',
    'What is your', 'what is your', 'Project name:', 'project name:',
    'Author name:', 'author name:', 'Description:', 'description:'
  ];

  const lastLines = output.split('\n').slice(-3).join('\n').toLowerCase();

  return inputPrompts.some(prompt =>
    lastLines.includes(prompt.toLowerCase()) &&
    lastLines.trim().endsWith(prompt.toLowerCase()) ||
    lastLines.includes(prompt.toLowerCase()) &&
    lastLines.slice(-1).match(/[:?>$#]$/)
  );
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
  status?: 'running' | 'waiting_input' | 'completed' | 'error';
  exitCode?: number;
  timedOut?: boolean;
  processes?: Array<{
    sessionId: string;
    createdAt: number;
    command: string;
    background: boolean;
    interactive: boolean;
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
  action: 'create' | 'send' | 'kill' | 'list' | 'status' | 'getOutput';
  sessionId?: string;
  command?: string;
  input?: string;
  background?: boolean;
  interactive?: boolean;
  lines?: number;
  shell?: string;
  timeout?: number;
  statusTimeout?: number; // Timeout específico para status check (obrigatório para status)
}

class TerminalParams {
  static schemaProperties = {
    action: { type: 'string', enum: ['create', 'send', 'kill', 'list', 'status', 'getOutput'], required: true },
    sessionId: { type: 'string', required: false },
    command: { type: 'string', required: false },
    input: { type: 'string', required: false },
    background: { type: 'boolean', required: false },
    interactive: { type: 'boolean', required: false },
    lines: { type: 'number', required: false },
    shell: { type: 'string', required: false },
    timeout: { type: 'number', required: false },
    statusTimeout: { type: 'number', required: false }
  } as const;

  // Validação customizada para statusTimeout obrigatório em action=status
  static validate(params: any): { isValid: boolean; error?: string } {
    if (params.action === 'status' && !params.statusTimeout) {
      return {
        isValid: false,
        error: 'statusTimeout é obrigatório para action=status. Use um valor entre 1000-300000ms (1s-5min).'
      };
    }

    if (params.statusTimeout && (params.statusTimeout < 1000 || params.statusTimeout > 300000)) {
      return {
        isValid: false,
        error: 'statusTimeout deve estar entre 1000ms (1s) e 300000ms (5min).'
      };
    }

    return { isValid: true };
  }
}

export const terminalTool = new class extends ToolBase<ITerminalParams, ITerminalResult> {
  public readonly name = 'terminal';
  public readonly description = `Gerencia múltiplas sessões de terminal com suporte a background, interatividade e status assíncrono.
  
## Parâmetros
- action: create|send|kill|list|status|getOutput
- sessionId: (opcional) ID da sessão única
- command: (obrigatório para create) comando a executar
- input: (obrigatório para send) texto a enviar
- background: (default: false) executa em background (ideal para servidores/long-running)
- interactive: (default: false) modo interativo (mantém stdin aberto)
- statusTimeout: (OBRIGATÓRIO para status) tempo em ms para aguardar (min: 1000, max: 300000)

## Fluxo Recomendado
1. create: inicia processo (use background:true para servidores)
2. status: verifica estado real (running/waiting_input/completed/error)
3. send: envia input se status for "waiting_input"
4. statusTimeout: aguarda X ms OBRIGATÓRIO antes de retornar (evita spam, padrão: 10s)`;
  public readonly parameterSchema = TerminalParams;

  public async execute(params: ITerminalParams): Promise<ITerminalResult> {
    // DEBUG: Log dos parâmetros recebidos
    logger.debug(`${TOOL_ID} execute() chamado com params:`, JSON.stringify(params, null, 2));

    // Validação inicial baseada na ação
    if (!params.action) {
      logger.debug(`${TOOL_ID} Action não fornecido`);
      return { success: false, message: TerminalErrorMessages.ACTION_REQUIRED };
    }

    // Validação customizada do TerminalParams
    const validation = TerminalParams.validate(params);
    if (!validation.isValid) {
      logger.debug(`${TOOL_ID} Validação falhou: ${validation.error}`);
      return { success: false, message: validation.error };
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
      case 'getOutput':
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
      getOutput: this.handleGetOutput.bind(this),
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
    }

    validateCommandSafety(params.command);

    // Para foreground, não usar timeout - deve retornar imediatamente
    const timeoutMs = (params.background || params.interactive) ? (params.timeout ?? DEFAULT_TIMEOUT) : 0;
    const sessionId = params.sessionId ?? randomUUID();
    const isInteractive = params.interactive ?? false;
    const isBackgroundProcess = params.background ?? false;
    const shellOptions = params.shell ?
      { shell: params.shell } :
      { shell: process.platform === 'win32' ? 'bash' : true };

    if (isBackgroundProcess) {
      // Usar spawn em vez de execa para melhor controle
      const { spawn } = await import('child_process');
      const childProcess = spawn(params.command, {
        ...shellOptions,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'], // Manter stdin/stdout/stderr conectados
        windowsHide: true
      });

      addProcess(sessionId, childProcess, params.command, true, isInteractive, timeoutMs);
      setupProcessListeners(sessionId);
      childProcess.unref?.();

      toolLog(`${TOOL_ID} ✓ Processo background ${sessionId} criado. PID: ${childProcess.pid}`);
      return {
        success: true,
        sessionId,
        message: `Processo em background criado${isInteractive ? ' (interativo)' : ''}. PID: ${childProcess.pid}. (Active processes: ${processMap.size})`,
      };
    }

    // Execução em foreground assíncrono (não-background, não-interactive)
    const { spawn } = await import('child_process');
    const childProcess = spawn(params.command, {
      ...shellOptions,
      stdio: 'pipe',
      windowsHide: true
    });

    addProcess(sessionId, childProcess, params.command, false, isInteractive, timeoutMs);
    setupProcessListeners(sessionId);

    // Retornar imediatamente para o LLM poder verificar o status
    toolLog(`${TOOL_ID} ✓ Processo ${sessionId} iniciado. PID: ${childProcess.pid}`);
    return {
      success: true,
      sessionId,
      message: `Processo iniciado. Use 'status' para verificar progresso ou 'getOutput' para ver output. PID: ${childProcess.pid}. (Active processes: ${processMap.size})`,
      status: 'running'
    };
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

    // Se for processo background, podemos mostrar o output capturado após o input
    if (processInfo.background) {
      // Aguardar um pouco para capturar o output após o input
      return new Promise((resolve) => {
        setTimeout(() => {
          const recentOutput = processInfo.outputBuffer.getLastLines(5).join('');
          resolve({
            success: true,
            message: `Input enviado ao processo: ${params.input}`,
            sessionId: params.sessionId,
            output: recentOutput || 'Nenhum output capturado após o input'
          });
        }, 500); // Esperar 500ms para capturar o output
      });
    }

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
        message: `Processo finalizado: ${command}. (Remaining active processes: ${processMap.size})`,
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
          message: `Processo e filhos finalizados: ${command}. (Remaining active processes: ${processMap.size})`,
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
    interactive: boolean;
  }>): string {
    if (processes.length === 0) {
      return "Nenhum processo ativo.";
    }

    const header = "Processos ativos:\n";
    const processLines = processes.map(p => {
      const mode = p.background ? 'background' : 'foreground';
      const interactive = p.interactive ? ' [INTERACTIVE]' : '';
      const uptime = Math.floor((Date.now() - p.createdAt) / 1000);
      const uptimeStr = uptime < 60 ? `${uptime}s` : uptime < 3600 ? `${Math.floor(uptime / 60)}m` : `${Math.floor(uptime / 3600)}h`;

      return `  ${p.sessionId}: ${p.command} (${mode})${interactive} [UP: ${uptimeStr}]`;
    });

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

    // statusTimeout é obrigatório - usar o tempo exato que o LLM especificou
    const statusTimeout = params.statusTimeout ?? 10000; // 10 segundos padrão

    // Função para verificar o status do processo
    const getProcessStatus = () => {
      const recentOutput = processInfo.outputBuffer.get(10);
      const isWaitingInput = detectWaitingInput(recentOutput);

      // Verificar se o processo ainda está ativo de forma mais robusta
      let isProcessActive = false;
      let exitCode: number | null = null;

      if (processInfo.process) {
        try {
          // Tentar enviar signal 0 para verificar se processo existe
          process.kill(processInfo.process.pid, 0);
          isProcessActive = true;
        } catch (error) {
          // Processo não existe mais
          isProcessActive = false;
          exitCode = processInfo.process.exitCode || 1;
        }
      }

      let status: 'running' | 'waiting_input' | 'completed' | 'error';

      if (!isProcessActive) {
        // Processo terminou, verificar se foi sucesso ou erro
        if (exitCode === null) {
          exitCode = processInfo.process?.exitCode ?? 1;
        }
        status = exitCode === 0 ? 'completed' : 'error';
      } else if (isWaitingInput) {
        status = 'waiting_input';
      } else {
        status = 'running';
      }

      return { status, isProcessActive, exitCode, recentOutput };
    };

    // Loop de espera pelo statusTimeout - a tool fica "ocupada" durante este período
    // SÓ se aplica ao action "status" (checked status)
    const startTime = Date.now();
    const endTime = startTime + statusTimeout;

    logger.debug(`[TERMINAL] handleStatus INÍCIO - sessionId: ${params.sessionId}, statusTimeout: ${statusTimeout}ms`);

    // BLOCKING SLEEP - Não libera o event loop!
    // Usando Atomics.wait para bloquear a thread de forma síncrona
    const blockingWait = (ms: number) => {
      const sharedBuffer = new SharedArrayBuffer(4);
      const int32 = new Int32Array(sharedBuffer);
      Atomics.wait(int32, 0, 0, ms);
    };

    // Dividir o timeout para não parecer travado (apenas internamente), mas sem spam de log
    let totalWaited = 0;
    while (totalWaited < statusTimeout) {
      const waitTime = Math.min(1000, statusTimeout - totalWaited); // max 1s por iteração
      blockingWait(waitTime);
      totalWaited += waitTime;
    }

    const totalElapsed = Date.now() - startTime;
    logger.debug(`[TERMINAL] handleStatus FIM - Total: ${totalElapsed}ms`);

    // Verificar status apenas após o loop de espera completo
    const processStatus = getProcessStatus();

    const activeProcessesCount = processMap.size;

    return {
      success: true,
      sessionId: params.sessionId!,
      status: processStatus.status,
      output: processStatus.recentOutput || 'Nenhum output disponível',
      message: `Processo ${processStatus.status}: ${processInfo.command}. (Active processes: ${activeProcessesCount})`,
      exitCode: processStatus.isProcessActive ? undefined : (processStatus.exitCode ?? undefined),
      timedOut: processStatus.status === 'running'
    };
  }

  private async handleGetOutput(params: ITerminalParams): Promise<ITerminalResult> {
    if (!params.sessionId) {
      return { success: false, message: TerminalErrorMessages.SESSION_REQUIRED };
    }

    const processInfo = getProcess(params.sessionId);
    if (!processInfo) {
      return { success: false, message: TerminalErrorMessages.SESSION_NOT_FOUND };
    }

    const lines = params.lines ?? 50;
    const output = processInfo.outputBuffer.get(lines);

    return {
      success: true,
      sessionId: params.sessionId,
      output: output || 'Nenhum output disponível',
      message: `Últimas ${lines} linhas do processo ${params.sessionId} (${processInfo.command})`
    };
  }
};
