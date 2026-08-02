CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  attending INTEGER NOT NULL,       -- 1 = yes, 0 = no
  guest_count INTEGER DEFAULT 0,
  dietary TEXT,                     -- comma-separated values
  message TEXT,
  submitted_at TEXT NOT NULL
);
