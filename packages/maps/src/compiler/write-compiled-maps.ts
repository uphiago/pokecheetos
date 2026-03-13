import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthoredMap } from '../schema/map-schema';
import { compileMap } from './compile-map';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const authoredDir = join(packageRoot, 'authored');
const generatedDir = join(packageRoot, 'generated');

const authoredMaps: AuthoredMap[] = readdirSync(authoredDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(authoredDir, name), 'utf8')) as AuthoredMap);

for (const map of authoredMaps) {
  const compiled = compileMap(map, authoredMaps);
  writeFileSync(join(generatedDir, `${map.mapId}.json`), `${JSON.stringify(compiled, null, 2)}\n`, 'utf8');
}
