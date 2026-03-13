import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { createSqlite } from '../db';
import type { PlayerRecord } from '../schema';

type LastKnownState = {
  lastMapId: string;
  lastTileX: number;
  lastTileY: number;
  lastDirection: 'up' | 'down' | 'left' | 'right';
};

export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createPlayerRepository(dbPath = ':memory:') {
  const db = createSqlite(dbPath);
  return buildPlayerRepository(db);
}

export function buildPlayerRepository(db: Database.Database) {
  return {
    createGuest() {
      const guestId = randomUUID();
      const guestToken = randomUUID();
      const guestTokenHash = hashGuestToken(guestToken);
      const now = new Date().toISOString();
      const trainerCount = (db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number }).count;
      const displayName = `Trainer${trainerCount + 1}`;

      db.prepare(
        `INSERT INTO players (
          guest_id, guest_token_hash, display_name,
          last_map_id, last_tile_x, last_tile_y, last_direction,
          spawn_map_id, spawn_tile_x, spawn_tile_y,
          last_seen_at, flags_json, preferences_json, created_at, updated_at
        ) VALUES (
          @guest_id, @guest_token_hash, @display_name,
          @last_map_id, @last_tile_x, @last_tile_y, @last_direction,
          @spawn_map_id, @spawn_tile_x, @spawn_tile_y,
          @last_seen_at, @flags_json, @preferences_json, @created_at, @updated_at
        )`
      ).run({
        guest_id: guestId,
        guest_token_hash: guestTokenHash,
        display_name: displayName,
        last_map_id: 'town',
        last_tile_x: 11,
        last_tile_y: 38,
        last_direction: 'down',
        spawn_map_id: 'town',
        spawn_tile_x: 11,
        spawn_tile_y: 38,
        last_seen_at: now,
        flags_json: '{}',
        preferences_json: '{}',
        created_at: now,
        updated_at: now
      });

      return { guestId, guestToken, guestTokenHash, displayName, mapId: 'town', tileX: 11, tileY: 38, direction: 'down' as const };
    },

    findByTokenHash(tokenHash: string): PlayerRecord | null {
      const row = db
        .prepare(
          `SELECT
            guest_id as guestId,
            guest_token_hash as guestTokenHash,
            display_name as displayName,
            last_map_id as lastMapId,
            last_tile_x as lastTileX,
            last_tile_y as lastTileY,
            last_direction as lastDirection,
            spawn_map_id as spawnMapId,
            spawn_tile_x as spawnTileX,
            spawn_tile_y as spawnTileY,
            last_seen_at as lastSeenAt,
            flags_json as flagsJson,
            preferences_json as preferencesJson,
            created_at as createdAt,
            updated_at as updatedAt
          FROM players WHERE guest_token_hash = ?`
        )
        .get(tokenHash) as PlayerRecord | undefined;

      return row ?? null;
    },

    updateLastKnownState(guestId: string, state: LastKnownState): void {
      db.prepare(
        `UPDATE players
         SET last_map_id = @last_map_id,
             last_tile_x = @last_tile_x,
             last_tile_y = @last_tile_y,
             last_direction = @last_direction,
             updated_at = @updated_at
         WHERE guest_id = @guest_id`
      ).run({
        guest_id: guestId,
        last_map_id: state.lastMapId,
        last_tile_x: state.lastTileX,
        last_tile_y: state.lastTileY,
        last_direction: state.lastDirection,
        updated_at: new Date().toISOString()
      });
    },

    updateLastSeenAt(guestId: string): void {
      const now = new Date().toISOString();
      db.prepare('UPDATE players SET last_seen_at = ?, updated_at = ? WHERE guest_id = ?').run(now, now, guestId);
    }
  };
}
