import { logger } from './logger';

/**
 * Controlador centralizado de execução do agente.
 * 
 * Responsável por:
 * - Capturar eventos de teclado (ESC duplo)
 * - Gerenciar AbortController para cancelamento
 * - Coordenar execução do GraphEngine
 */
export class ExecutionController {
  private abortController: AbortController | null = null;
  private lastEscapeTime: number | null = null;
  private isExecuting: boolean = false;
  
  // Janela de tempo para ESC duplo (500ms)
  private readonly DOUBLE_ESC_WINDOW_MS = 500;
  
  /**
   * Registra pressão de ESC
   * Retorna true se foi o segundo ESC dentro da janela de tempo
   */
  public handleEscapeKey(): boolean {
    const now = Date.now();
    
    // Primeiro ESC ou fora da janela de tempo
    if (!this.lastEscapeTime || (now - this.lastEscapeTime) > this.DOUBLE_ESC_WINDOW_MS) {
      this.lastEscapeTime = now;
      logger.debug('[ExecutionController] Primeiro ESC registrado');
      return false;
    }
    
    // Segundo ESC dentro da janela - abortar!
    this.lastEscapeTime = null;
    
    if (this.abortController && this.isExecuting) {
      logger.info('[ExecutionController] ESC duplo detectado - abortando execução');
      this.abortController.abort();
      return true;
    }
    
    return false;
  }
  
  /**
   * Inicia uma nova execução
   * Retorna AbortSignal para passar ao grafo
   */
  public beginExecution(): AbortSignal {
    this.abortController = new AbortController();
    this.isExecuting = true;
    this.lastEscapeTime = null;
    
    logger.debug('[ExecutionController] Execução iniciada');
    return this.abortController.signal;
  }
  
  /**
   * Finaliza execução
   */
  public endExecution(): void {
    this.isExecuting = false;
    this.abortController = null;
    this.lastEscapeTime = null;
    
    logger.debug('[ExecutionController] Execução finalizada');
  }
  
  /**
   * Verifica se está executando
   */
  public get executing(): boolean {
    return this.isExecuting;
  }
}