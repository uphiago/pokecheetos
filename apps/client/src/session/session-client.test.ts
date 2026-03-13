import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SessionBootstrapError, SessionClient } from './session-client.ts';

describe('SessionClient', () => {
  it('posts the guest token and returns the bootstrap payload', async () => {
    const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
    const client = new SessionClient({
      baseUrl: 'http://localhost:2567',
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

    const response = await client.bootstrapGuest({ guestToken: 'token-1' });

    assert.equal(response.guestId, 'guest-1');
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0]?.input, 'http://localhost:2567/api/session/guest');
    assert.equal(fetchCalls[0]?.init?.method, 'POST');
    assert.equal(fetchCalls[0]?.init?.body, JSON.stringify({ guestToken: 'token-1' }));
  });

  it('throws a typed bootstrap error when the server responds with a failure payload', async () => {
    const client = new SessionClient({
      fetchFn: async () => ({
        ok: false,
        status: 500,
        async json() {
          return {
            code: 'bootstrap_failed',
            message: 'Failed to bootstrap guest session'
          };
        }
      })
    });

    await assert.rejects(() => client.bootstrapGuest(), (error: unknown) => {
      if (!(error instanceof SessionBootstrapError)) {
        return false;
      }

      assert.equal(error.code, 'bootstrap_failed');
      assert.equal(error.status, 500);
      assert.match(error.message, /bootstrap guest session/i);
      return true;
    });
  });
});
