CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  attending INTEGER NOT NULL DEFAULT 1,
  has_companion TEXT NOT NULL DEFAULT '无',
  companion_names TEXT,
  has_dietary_need TEXT NOT NULL DEFAULT '无',
  dietary_detail TEXT,
  needs_lodging TEXT NOT NULL DEFAULT '不需要',
  lodging_detail TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rsvps_submitted_at
ON rsvps (submitted_at DESC);
