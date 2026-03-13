type LogLevel = 'info' | 'error';

type LogContext = {
  event?: string;
  requestId?: string;
  guestId?: string;
  roomId?: string;
  mapId?: string;
  phase?:
    | 'bootstrap'
    | 'join'
    | 'simulate'
    | 'interact'
    | 'leave'
    | 'startup'
    | 'serialize'
    | 'lifecycle';
  errorCode?: string;
  error?: unknown;
  [key: string]: unknown;
};

type LogSink = (message: string) => void;

export type Logger = ReturnType<typeof createLogger>;

export function createLogger(options: {
  env?: string;
  infoSink?: LogSink;
  errorSink?: LogSink;
} = {}) {
  const env = options.env ?? process.env.NODE_ENV ?? 'development';
  const infoSink = options.infoSink ?? ((message: string) => console.log(message));
  const errorSink = options.errorSink ?? ((message: string) => console.error(message));

  return {
    info(context: LogContext, message: string) {
      infoSink(serializeLog('info', message, context, env));
    },
    error(context: LogContext, message: string) {
      errorSink(serializeLog('error', message, context, env));
    }
  };
}

export const logger = createLogger();

function serializeLog(level: LogLevel, message: string, context: LogContext, env: string): string {
  const { error, ...rest } = context;
  const safeContext = omitReservedFields(rest);
  const payload: Record<string, unknown> = {
    ...safeContext,
    level,
    message
  };

  if (error instanceof Error) {
    payload.errorName = error.name;
    payload.errorMessage = error.message;

    if (env === 'development') {
      payload.errorStack = error.stack;
    }
  } else if (error !== undefined) {
    payload.errorMessage = serializeUnknownError(error);

    if (typeof error === 'object' && error !== null) {
      payload.errorDetails = normalizeUnknownErrorDetails(error);
    }
  }

  return JSON.stringify(payload);
}

function omitReservedFields(context: Record<string, unknown>): Record<string, unknown> {
  const {
    level: _level,
    message: _message,
    errorMessage: _errorMessage,
    errorName: _errorName,
    errorStack: _errorStack,
    errorDetails: _errorDetails,
    ...safeContext
  } = context;

  return safeContext;
}

function serializeUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return '[unserializable error object]';
    }
  }

  return String(error);
}

function normalizeUnknownErrorDetails(error: object): unknown {
  try {
    return JSON.parse(JSON.stringify(error));
  } catch {
    return '[unserializable error object]';
  }
}
