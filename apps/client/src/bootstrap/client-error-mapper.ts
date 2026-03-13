import { SessionBootstrapError } from '../session/session-client.ts';

export type ClientErrorCode =
  | 'NETWORK_FETCH_FAILED'
  | 'CORS_BLOCKED'
  | 'SEAT_RESERVATION_EXPIRED'
  | 'ROOM_CONNECT_FAILED'
  | 'BOOTSTRAP_FAILED'
  | 'UNKNOWN';

export type ClientBootstrapError = {
  code: ClientErrorCode;
  phase: 'bootstrap';
  userMessage: string;
  technicalMessage: string;
  cause: unknown;
};

type ConsoleLike = Pick<Console, 'error'>;
const CLIENT_BOOTSTRAP_REPORTED = Symbol('client-bootstrap-reported');

const USER_MESSAGES: Record<ClientErrorCode, string> = {
  NETWORK_FETCH_FAILED: 'Could not reach the server. Check that the API is running and reachable.',
  CORS_BLOCKED: 'The browser blocked the request. Check the local CORS configuration.',
  SEAT_RESERVATION_EXPIRED: 'The room reservation expired before join completed. Retry the connection.',
  ROOM_CONNECT_FAILED: 'The session started, but joining the world room failed. Retry the connection.',
  BOOTSTRAP_FAILED: 'Could not start a guest session. Check the server and try again.',
  UNKNOWN: 'The client failed to start. Check the console for technical details.'
};

export function mapClientBootstrapError(error: unknown): ClientBootstrapError {
  const causeMessage = extractErrorMessage(error);
  const normalized = causeMessage.toLowerCase();
  let code: ClientErrorCode = 'UNKNOWN';

  if (error instanceof SessionBootstrapError) {
    code = 'BOOTSTRAP_FAILED';
  } else if (includesAny(normalized, ['cors policy', 'cross-origin', 'cors'])) {
    code = 'CORS_BLOCKED';
  } else if (includesAny(normalized, ['seat reservation', 'reservation expired'])) {
    code = 'SEAT_RESERVATION_EXPIRED';
  } else if (includesAny(normalized, ['failed to fetch', 'networkerror'])) {
    code = 'NETWORK_FETCH_FAILED';
  } else if (isRoomConnectFailureMessage(normalized)) {
    code = 'ROOM_CONNECT_FAILED';
  }

  return {
    code,
    phase: 'bootstrap',
    userMessage: USER_MESSAGES[code],
    technicalMessage: buildTechnicalMessage(code, error, causeMessage),
    cause: error
  };
}

export function reportClientBootstrapError(
  mappedError: ClientBootstrapError,
  consoleLike: ConsoleLike = console
): void {
  consoleLike.error({
    phase: mappedError.phase,
    code: mappedError.code,
    userMessage: mappedError.userMessage,
    technicalMessage: mappedError.technicalMessage,
    cause: mappedError.cause,
    causeName: mappedError.cause instanceof Error ? mappedError.cause.name : undefined,
    causeMessage: extractErrorMessage(mappedError.cause),
    status: mappedError.cause instanceof SessionBootstrapError ? mappedError.cause.status : undefined
  });
}

export function markClientBootstrapErrorReported(error: unknown): void {
  if (error && typeof error === 'object') {
    try {
      Object.defineProperty(error, CLIENT_BOOTSTRAP_REPORTED, {
        value: true,
        enumerable: false,
        configurable: true
      });
    } catch {
      // Ignore objects that cannot be extended; duplicate logging is safer than crashing the reporter.
    }
  }
}

export function hasClientBootstrapErrorReport(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && CLIENT_BOOTSTRAP_REPORTED in error);
}

function buildTechnicalMessage(code: ClientErrorCode, error: unknown, causeMessage: string): string {
  if (error instanceof SessionBootstrapError) {
    return `Bootstrap request failed with status ${error.status} and code ${error.code}`;
  }

  if (causeMessage.length > 0) {
    return `${code}: ${causeMessage}`;
  }

  return `${code}: unknown client bootstrap error`;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown client bootstrap error';
}

function includesAny(input: string, patterns: string[]): boolean {
  return patterns.some((pattern) => input.includes(pattern));
}

function isRoomConnectFailureMessage(input: string): boolean {
  return (
    includesAny(input, ['failed to connect room', 'failed to join room', 'join world']) ||
    (input.includes('join') && input.includes('room'))
  );
}
