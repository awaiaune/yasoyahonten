CREATE TABLE mg_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT NOT NULL,
 detail_json TEXT NOT NULL, created_at TEXT NOT NULL
);
