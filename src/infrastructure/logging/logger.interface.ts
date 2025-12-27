/**
 * Interface para serviço de logging.
 *
 * Permite trocar a implementação do logger sem afetar
 * módulos que dependem dele.
 */
export interface ILogger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}
