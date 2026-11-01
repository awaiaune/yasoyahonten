CREATE TABLE IF NOT EXISTS mg_revisions (
 product_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(product_id,revision)
);
