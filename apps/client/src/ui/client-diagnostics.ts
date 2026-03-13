import { RoomConnectionError } from '../network/room-connection-manager.ts';
import { SessionBootstrapError } from '../session/session-client.ts';

export type ClientDiagnosticCode =
  | 'BOOTSTRAP_FAILED'
  | 'NETWORK_FETCH_FAILED'
  | 'CORS_BLOCKED'
  | 'SEAT_RESERVATION_EXPIRED'
  | 'ROOM_CONNECT_FAILED'
  | 'UNKNOWN';

export type ClientDiagnosticPhase = 'bootstrap' | 'connect';

export type ClientDiagnostics = {
  code: ClientDiagnosticCode;
  phase: ClientDiagnosticPhase;
  message: string;
  detail: string;
  retryable: boolean;
  attempts?: number;
  status?: number;
  roomIdHint?: string;
};

type ClientDiagnosticContext = {
  phase: ClientDiagnosticPhase;
  roomIdHint?: string;
};

export function createClientDiagnostics(
  error: unknown,
  context: ClientDiagnosticContext
): ClientDiagnostics {
  if (error instanceof SessionBootstrapError) {
    return {
      code: 'BOOTSTRAP_FAILED',
      phase: 'bootstrap',
      message: 'We could not restore your session',
      detail: 'Please try again in a moment.',
      retryable: true,
      status: error.status,
      roomIdHint: context.roomIdHint
    };
  }

  if (error instanceof RoomConnectionError) {
    const code = classifyRoomConnectionCode(error);

    return {
      code,
      phase: 'connect',
      message:
        code === 'SEAT_RESERVATION_EXPIRED'
          ? 'That room took too long to open'
          : 'We could not finish joining the room',
      detail:
        code === 'SEAT_RESERVATION_EXPIRED'
          ? 'Retry to request a fresh room seat.'
          : 'Retry and the client will try the room join again.',
      retryable: error.retryable,
      attempts: error.attempts,
      roomIdHint: error.roomIdHint
    };
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown client error';
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes('failed to fetch')) {
    return {
      code: 'NETWORK_FETCH_FAILED',
      phase: context.phase,
      message: 'We could not reach the server',
      detail: 'Check your connection, then try again.',
      retryable: true,
      roomIdHint: context.roomIdHint
    };
  }

  if (normalizedMessage.includes('cors')) {
    return {
      code: 'CORS_BLOCKED',
      phase: context.phase,
      message: 'The browser blocked the server request',
      detail: 'Verify the server URL and browser permissions, then try again.',
      retryable: true,
      roomIdHint: context.roomIdHint
    };
  }

  if (normalizedMessage.includes('seat reservation')) {
    return {
      code: 'SEAT_RESERVATION_EXPIRED',
      phase: 'connect',
      message: 'That room took too long to open',
      detail: 'Retry to request a fresh room seat.',
      retryable: true,
      roomIdHint: context.roomIdHint
    };
  }

  if (context.phase === 'connect') {
    return {
      code: 'ROOM_CONNECT_FAILED',
      phase: 'connect',
      message: 'We could not finish joining the room',
      detail: 'Retry and the client will try the room join again.',
      retryable: true,
      roomIdHint: context.roomIdHint
    };
  }

  return {
    code: 'UNKNOWN',
    phase: context.phase,
    message: 'The game hit an unexpected startup issue',
    detail: 'Try again. If it keeps happening, check the browser console for the debug code.',
    retryable: true,
    roomIdHint: context.roomIdHint
  };
}

function classifyRoomConnectionCode(error: RoomConnectionError): ClientDiagnosticCode {
  return error.message.toLowerCase().includes('seat reservation')
    ? 'SEAT_RESERVATION_EXPIRED'
    : 'ROOM_CONNECT_FAILED';
}

export function reportClientDiagnostics(input: {
  diagnostics: ClientDiagnostics;
  error: unknown;
  logger?: Pick<Console, 'error'>;
}): void {
  const logger = input.logger ?? console;
  logger.error(`[client][${input.diagnostics.phase}] ${input.diagnostics.code}`, {
    code: input.diagnostics.code,
    phase: input.diagnostics.phase,
    retryable: input.diagnostics.retryable,
    attempts: input.diagnostics.attempts,
    status: input.diagnostics.status,
    roomIdHint: input.diagnostics.roomIdHint,
    causeMessage: input.error instanceof Error ? input.error.message : String(input.error),
    error: input.error
  });
}
