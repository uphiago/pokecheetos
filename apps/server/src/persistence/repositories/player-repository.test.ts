import { describe, expect, it } from 'vitest';
import { createPlayerRepository } from './player-repository';

describe('player repository', () => {
  it('createGuest persists guest with generated identity and default spawn', () => {
    const repo = createPlayerRepository(':memory:');
    const guest = repo.createGuest();
    const restored = repo.findByTokenHash(guest.guestTokenHash);

    expect(guest.guestId).toBeTruthy();
    expect(guest.displayName).toBe('Trainer1');
    expect(restored?.guestId).toBe(guest.guestId);
    expect(restored?.lastMapId).toBe('town');
    expect(restored?.lastTileX).toBe(2);
    expect(restored?.lastTileY).toBe(2);
  });

  it('findByTokenHash restores previously saved guest', () => {
    const repo = createPlayerRepository(':memory:');
    const guest = repo.createGuest();
    const restored = repo.findByTokenHash(guest.guestTokenHash);

    expect(restored?.displayName).toBe(guest.displayName);
  });

  it('updateLastKnownState persists world fields', () => {
    const repo = createPlayerRepository(':memory:');
    const guest = repo.createGuest();

    repo.updateLastKnownState(guest.guestId, {
      lastMapId: 'route-1',
      lastTileX: 11,
      lastTileY: 12,
      lastDirection: 'left'
    });

    const restored = repo.findByTokenHash(guest.guestTokenHash);
    expect(restored?.lastMapId).toBe('route-1');
    expect(restored?.lastTileX).toBe(11);
    expect(restored?.lastTileY).toBe(12);
    expect(restored?.lastDirection).toBe('left');
  });

  it('updateLastSeenAt updates timestamp', async () => {
    const repo = createPlayerRepository(':memory:');
    const guest = repo.createGuest();
    const before = repo.findByTokenHash(guest.guestTokenHash)?.lastSeenAt as string;

    await new Promise((resolve) => setTimeout(resolve, 5));
    repo.updateLastSeenAt(guest.guestId);

    const after = repo.findByTokenHash(guest.guestTokenHash)?.lastSeenAt as string;
    expect(new Date(after).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});
