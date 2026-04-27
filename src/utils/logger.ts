/**
 * Logger utility untuk mencatat flow aplikasi
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const COLORS = {
  INFO: '\x1b[36m', // Cyan
  DEBUG: '\x1b[35m', // Magenta
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  SUCCESS: '\x1b[32m', // Green
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
};

function formatTimestamp(): string {
  return new Date().toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function formatLog(level: LogLevel, message: string, data?: any): string {
  const timestamp = formatTimestamp();
  const color = COLORS[level];
  const reset = COLORS.RESET;
  const bold = COLORS.BOLD;
  
  let log = `${color}[${timestamp}]${reset} ${bold}${level}${reset} ${message}`;
  
  if (data !== undefined) {
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      log += ` → ${data}`;
    } else {
      log += `\n${JSON.stringify(data, null, 2)}`;
    }
  }
  
  return log;
}

export const logger = {
  /**
   * Log informasi umum
   */
  info: (message: string, data?: any) => {
    console.log(formatLog('INFO', message, data));
  },

  /**
   * Log debug (detail level)
   */
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('DEBUG', message, data));
    }
  },

  /**
   * Log warning
   */
  warn: (message: string, data?: any) => {
    console.warn(formatLog('WARN', message, data));
  },

  /**
   * Log error
   */
  error: (message: string, error?: any) => {
    console.error(formatLog('ERROR', message));
    if (error instanceof Error) {
      console.error(`  ${COLORS.ERROR}Error: ${error.message}${COLORS.RESET}`);
      if (error.stack) {
        console.error(`  ${COLORS.DIM}${error.stack}${COLORS.RESET}`);
      }
    } else if (error) {
      console.error(`  ${JSON.stringify(error, null, 2)}`);
    }
  },

  /**
   * Log sukses
   */
  success: (message: string, data?: any) => {
    console.log(formatLog('SUCCESS', message, data));
  },

  /**
   * Separator untuk memisahkan log section
   */
  separator: () => {
    console.log(`\n${COLORS.DIM}${'═'.repeat(80)}${COLORS.RESET}\n`);
  },

  /**
   * Log dengan indentasi (untuk flow detail)
   */
  step: (step: number, message: string, data?: any) => {
    const indent = '  ';
    const stepLog = `${indent}${COLORS.BOLD}Step ${step}:${COLORS.RESET} ${message}`;
    if (data !== undefined) {
      if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        console.log(`${stepLog} → ${data}`);
      } else {
        console.log(stepLog);
        console.log(JSON.stringify(data, null, 4).split('\n').map(line => indent + line).join('\n'));
      }
    } else {
      console.log(stepLog);
    }
  },
};

export default logger;
