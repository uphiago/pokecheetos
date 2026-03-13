import { readFileSync } from 'node:fs';
import type { AuthoredMap } from '../schema/map-schema';

export function loadAuthoredMap(path: string): AuthoredMap {
  return JSON.parse(readFileSync(path, 'utf8')) as AuthoredMap;
}
