import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CompiledMap } from '../schema/map-schema';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadCompiledMap(mapId: string): CompiledMap {
  const filePath = join(packageRoot, 'generated', `${mapId}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as CompiledMap;
}

export function getCompiledMapById(mapId: string): CompiledMap {
  return loadCompiledMap(mapId);
}
