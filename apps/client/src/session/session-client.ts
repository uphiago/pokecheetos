import type {
  GuestBootstrapErrorResponse,
  GuestBootstrapRequest,
  GuestBootstrapResponse
} from '@pokecheetos/shared';

type ResponseLike = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<ResponseLike>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const GUEST_TOKEN_STORAGE_KEY = 'pokecheetos.guestToken';

export class SessionBootstrapError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'SessionBootstrapError';
    this.code = code;
    this.status = status;
  }
}

export type SessionClientOptions = {
  baseUrl?: string;
  fetchFn?: FetchLike;
  storage?: StorageLike;
};

function isBootstrapErrorResponse(payload: unknown): payload is GuestBootstrapErrorResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'code' in payload &&
      typeof payload.code === 'string' &&
      'message' in payload &&
      typeof payload.message === 'string'
  );
}

export class SessionClient {
  readonly #baseUrl: string;
  readonly #fetchFn: FetchLike;
  readonly #storage?: StorageLike;

  constructor(options: SessionClientOptions = {}) {
    this.#baseUrl = options.baseUrl ?? '';
    this.#fetchFn = options.fetchFn ?? fetch;
    this.#storage = options.storage ?? resolveDefaultStorage();
  }

  async bootstrapGuest(request: GuestBootstrapRequest = {}): Promise<GuestBootstrapResponse> {
    const response = await this.#fetchFn(`${this.#baseUrl}/api/session/guest`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      if (isBootstrapErrorResponse(payload)) {
        throw new SessionBootstrapError(response.status, payload.code, payload.message);
      }

      throw new SessionBootstrapError(response.status, 'bootstrap_failed', 'Failed to bootstrap guest session');
    }

    return payload as GuestBootstrapResponse;
  }

  readStoredGuestToken(): string | undefined {
    const token = this.#storage?.getItem(GUEST_TOKEN_STORAGE_KEY);
    if (typeof token !== 'string') {
      return undefined;
    }

    const normalizedToken = token.trim();
    return normalizedToken.length > 0 ? normalizedToken : undefined;
  }

  async bootstrapStoredGuest(): Promise<GuestBootstrapResponse> {
    const storedGuestToken = this.readStoredGuestToken();
    const response = await this.bootstrapGuest(
      storedGuestToken ? { guestToken: storedGuestToken } : {}
    );

    this.#storage?.setItem(GUEST_TOKEN_STORAGE_KEY, response.guestToken);
    return response;
  }
}

function resolveDefaultStorage(): StorageLike | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  return localStorage;
}
