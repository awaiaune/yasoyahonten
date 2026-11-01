CREATE TABLE mg_job_notifications (
 job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_due INTEGER NOT NULL, first_attempt_at INTEGER, sent_at TEXT,
 last_error TEXT, created_at TEXT NOT NULL
);
