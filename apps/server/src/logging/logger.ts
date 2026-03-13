type LogContext = Record<string, unknown>;

function normalizeLogContext(context: LogContext): LogContext {
  const normalizedContext: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (key === 'error' && value instanceof Error) {
      normalizedContext.errorName = value.name;
      normalizedContext.errorMessage = value.message;
      if ('code' in value && typeof value.code === 'string') {
        normalizedContext.errorCode = value.code;
      }
      if (typeof value.stack === 'string') {
        normalizedContext.errorStack = value.stack;
      }
      continue;
    }

    normalizedContext[key] = value;
  }

  return normalizedContext;
}

export const logger = {
  info(context: LogContext, message: string) {
    console.log(JSON.stringify({ level: 'info', message, ...normalizeLogContext(context) }));
  },
  error(context: LogContext, message: string) {
    console.error(JSON.stringify({ level: 'error', message, ...normalizeLogContext(context) }));
  }
};
