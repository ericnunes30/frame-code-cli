import { logger } from './logger';

/**
 * Gerenciador de modos do terminal.
 * 
 * Responsável por alternar entre:
 * - Raw Mode: Captura ESC durante execução do grafo
 * - Cooked Mode: Permite readline.question() funcionar
 */
export class TerminalModeManager {
  private isRawMode: boolean = false;
  private supportsRawMode: boolean = false;
  
  constructor() {
    // Verificar suporte a raw mode
    this.supportsRawMode = process.stdin.isTTY === true;
    
    if (process.platform === 'win32') {
      logger.debug('[TerminalModeManager] Plataforma Windows detectada');
    }
  }
  
  /**
   * Ativa raw mode para capturar ESC
   * Usado DURANTE execução do grafo
   */
  public enableRawMode(): void {
    if (this.supportsRawMode && !this.isRawMode) {
      try {
        process.stdin.setRawMode(true);
        this.isRawMode = true;
        logger.debug('[TerminalModeManager] Raw mode ativado');
      } catch (error) {
        logger.warn('[TerminalModeManager] Não foi possível ativar raw mode:', error);
        this.supportsRawMode = false;
      }
    }
  }
  
  /**
   * Desativa raw mode para permitir readline
   * Usado DURANTE input do usuário
   */
  public disableRawMode(): void {
    if (this.supportsRawMode && this.isRawMode) {
      try {
        process.stdin.setRawMode(false);
        this.isRawMode = false;
        logger.debug('[TerminalModeManager] Raw mode desativado');
      } catch (error) {
        logger.warn('[TerminalModeManager] Erro ao desativar raw mode:', error);
      }
    }
  }
  
  /**
   * Cleanup ao encerrar aplicação
   */
  public cleanup(): void {
    this.disableRawMode();
    logger.debug('[TerminalModeManager] Cleanup concluído');
  }
  
  /**
   * Verifica se raw mode está ativo
   */
  public get isRaw(): boolean {
    return this.isRawMode;
  }
}