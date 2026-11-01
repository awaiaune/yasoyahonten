CREATE TABLE IF NOT EXISTS mg_management_monitor (
 id INTEGER PRIMARY KEY CHECK(id=1), last_scan_at TEXT,
 alarm_state TEXT NOT NULL DEFAULT 'unknown', updated_at TEXT NOT NULL
);
