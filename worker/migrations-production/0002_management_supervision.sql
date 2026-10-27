-- Additive management supervision only; preserve orders, job IDs and mappings.
CREATE TABLE mg_job_notifications (
 job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_due INTEGER NOT NULL, first_attempt_at INTEGER, sent_at TEXT,
 last_error TEXT, created_at TEXT NOT NULL
);
CREATE INDEX mg_notification_due ON mg_job_notifications(state,next_due);
CREATE TABLE mg_management_monitor (
 id INTEGER PRIMARY KEY CHECK(id=1), last_scan_at TEXT,
 alarm_state TEXT NOT NULL DEFAULT 'unknown', updated_at TEXT NOT NULL
);
