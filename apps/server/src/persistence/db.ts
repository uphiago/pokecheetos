import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationPath = join(dirname(fileURLToPath(import.meta.url)), 'migrations', '0001_initial.sql');

export function createSqlite(dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  const migrationSql = readFileSync(migrationPath, 'utf8');
  db.exec(migrationSql);
  return db;
}
