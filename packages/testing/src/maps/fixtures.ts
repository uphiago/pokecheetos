import { getCompiledMapById } from '@pokecheetos/maps';

export function getMapFixture(mapId: string) {
  return getCompiledMapById(mapId);
}
