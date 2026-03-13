import { describe, expect, it } from 'vitest';

import { runtimeConfig } from '@pokecheetos/config';
import { applyDirection } from '@pokecheetos/shared';
import { getCompiledMapById } from '@pokecheetos/maps';

import { createTestRoom } from '../server/create-test-room';
import { makeGuestBootstrapFixture } from '../session/fixtures';

describe('workspace smoke', () => {
  it('wires shared, config, maps, and local testing fixtures together', () => {
    const nextTile = applyDirection({ tileX: 10, tileY: 10 }, 'right');
    const town = getCompiledMapById('town');
    const room = createTestRoom({ mapId: 'town' });
    const guest = makeGuestBootstrapFixture({ mapId: 'town' });

    expect(nextTile).toEqual({ tileX: 11, tileY: 10 });
    expect(runtimeConfig.serverTickRate).toBe(20);
    expect(town.mapId).toBe('town');
    expect(room.mapId).toBe('town');
    expect(guest.mapId).toBe('town');
  });
});
