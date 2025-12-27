// Configuração de nível de log via variáveis de ambiente:
// - DEBUG=true → mostra DEBUG, INFO, WARN, ERROR
// - INFO=true  → mostra INFO, WARN, ERROR (sem DEBUG)
// - padrão    → mostra apenas WARN, ERROR
const isDebug = process.env.DEBUG === 'True' || process.env.DEBUG === 'true';
const isInfo = process.env.INFO === 'True' || process.env.INFO === 'true';

const shouldShowInfo = isDebug || isInfo;
const shouldShowDebug = isDebug;

export const logger = {
  info: (message: string, ...args: any[]) => {
    // INFO só é impresso quando INFO=true ou DEBUG=true
    if (shouldShowInfo) {
      console.log(`[INFO] ${message}`, ...args);
      if (process.stdout.write) process.stdout.write('');
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
    if (process.stdout.write) process.stdout.write('');
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    if (process.stderr.write) process.stderr.write('');
  },
  debug: (message: string, ...args: any[]) => {
    // DEBUG só é impresso quando DEBUG=true
    if (shouldShowDebug) {
      console.log(`[DEBUG] ${message}`, ...args);
      if (process.stdout.write) process.stdout.write('');
    }
  }
};