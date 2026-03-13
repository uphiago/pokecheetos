import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { SessionBootstrapError, SessionClient } from './session-client.ts';

type StorageStub = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createStorageStub(initialToken: string | null) {
  const operations: Array<{ type: 'set' | 'remove'; key: string; value?: string }> = [];
  let storedToken = initialToken;

  const storage: StorageStub = {
    getItem(key) {
      assert.equal(key, 'pokecheetos.guestToken');
      return storedToken;
    },
    setItem(key, value) {
      operations.push({ type: 'set', key, value });
      storedToken = value;
    },
    removeItem(key) {
      operations.push({ type: 'remove', key });
      storedToken = null;
    }
  };

  return {
    storage,
    operations,
    getStoredToken() {
      return storedToken;
    }
  };
}

describe('SessionClient', () => {
  it('stores the returned guest token when there is no stored token yet', async () => {
    const storageState = createStorageStub(null);
    const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
    const client = new SessionClient({
      baseUrl: 'http://localhost:2567',
      storage: storageState.storage,
      fetchFn: async (input, init) => {
        fetchCalls.push({ input, init });

        return {
          ok: true,
          status: 200,
          async json() {
            return {
              guestId: 'guest-1',
              guestToken: 'token-1',
              displayName: 'Trainer 1',
              mapId: 'town',
              tileX: 4,
              tileY: 7,
              roomIdHint: 'town:base:1'
            };
          }
        };
      }
    });

    const response = await client.bootstrapStoredGuest();

    assert.equal(response.guestToken, 'token-1');
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0]?.input, 'http://localhost:2567/api/session/guest');
    assert.equal(fetchCalls[0]?.init?.body, JSON.stringify({}));
    assert.deepEqual(storageState.operations, [
      {
        type: 'set',
        key: 'pokecheetos.guestToken',
        value: 'token-1'
      }
    ]);
  });

  it('replaces an invalid stored token with the bootstrap response token', async () => {
    const storageState = createStorageStub('stale-token');
    const fetchBodies: string[] = [];
    const client = new SessionClient({
      storage: storageState.storage,
      fetchFn: async (_input, init) => {
        fetchBodies.push(String(init?.body ?? ''));

        return {
          ok: true,
          status: 200,
          async json() {
            return {
              guestId: 'guest-1',
              guestToken: 'fresh-token',
              displayName: 'Trainer 1',
              mapId: 'town',
              tileX: 4,
              tileY: 7,
              roomIdHint: 'town:base:1'
            };
          }
        };
      }
    });

    await client.bootstrapStoredGuest();

    assert.deepEqual(fetchBodies, [JSON.stringify({ guestToken: 'stale-token' })]);
    assert.equal(storageState.getStoredToken(), 'fresh-token');
  });

  it('treats a corrupted whitespace token as missing and stores the replacement token', async () => {
    const storageState = createStorageStub('   ');
    const fetchBodies: string[] = [];
    const client = new SessionClient({
      storage: storageState.storage,
      fetchFn: async (_input, init) => {
        fetchBodies.push(String(init?.body ?? ''));

        return {
          ok: true,
          status: 200,
          async json() {
            return {
              guestId: 'guest-2',
              guestToken: 'replacement-token',
              displayName: 'Trainer 2',
              mapId: 'town',
              tileX: 9,
              tileY: 9,
              roomIdHint: 'town:base:1'
            };
          }
        };
      }
    });

    await client.bootstrapStoredGuest();

    assert.deepEqual(fetchBodies, [JSON.stringify({})]);
    assert.equal(storageState.getStoredToken(), 'replacement-token');
  });

  it('surfaces retryable bootstrap failures without inventing a stored guest token', async () => {
    const storageState = createStorageStub(null);
    const client = new SessionClient({
      storage: storageState.storage,
      fetchFn: async () => ({
        ok: false,
        status: 503,
        async json() {
          return {
            code: 'bootstrap_failed',
            message: 'temporary outage'
          };
        }
      })
    });

    await assert.rejects(() => client.bootstrapStoredGuest(), (error: unknown) => {
      if (!(error instanceof SessionBootstrapError)) {
        return false;
      }

      assert.equal(error.code, 'bootstrap_failed');
      assert.equal(error.status, 503);
      return true;
    });
    assert.deepEqual(storageState.operations, []);
    assert.equal(storageState.getStoredToken(), null);
  });
});
