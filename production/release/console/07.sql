CREATE TABLE IF NOT EXISTS mg_jobs (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
 payload_json TEXT NOT NULL, body_json TEXT, result_json TEXT,
 state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_due INTEGER NOT NULL,
 last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
