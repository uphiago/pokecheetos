import type { GuestBootstrapResponse } from '@pokecheetos/shared';

export type GuestFixtureOverrides = Partial<GuestBootstrapResponse>;

export function makeGuestBootstrapFixture(
  overrides: GuestFixtureOverrides = {}
): GuestBootstrapResponse {
  return {
    guestId: overrides.guestId ?? 'guest-fixture-1',
    guestToken: overrides.guestToken ?? 'guest-token-fixture',
    displayName: overrides.displayName ?? 'Guest 001',
    mapId: overrides.mapId ?? 'town',
    tileX: overrides.tileX ?? 8,
    tileY: overrides.tileY ?? 8,
    roomIdHint: overrides.roomIdHint ?? `room-${overrides.mapId ?? 'town'}-1`
  };
}
