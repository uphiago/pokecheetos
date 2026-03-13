CREATE TABLE IF NOT EXISTS players (
  guest_id TEXT PRIMARY KEY,
  guest_token_hash TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  last_map_id TEXT NOT NULL,
  last_tile_x INTEGER NOT NULL,
  last_tile_y INTEGER NOT NULL,
  last_direction TEXT NOT NULL,
  spawn_map_id TEXT NOT NULL,
  spawn_tile_x INTEGER NOT NULL,
  spawn_tile_y INTEGER NOT NULL,
  last_seen_at TEXT NOT NULL,
  flags_json TEXT NOT NULL,
  preferences_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
