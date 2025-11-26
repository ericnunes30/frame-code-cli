export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};