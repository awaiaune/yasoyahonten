CREATE TABLE IF NOT EXISTS mg_products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','stopped','archived')),
 version INTEGER NOT NULL, draft_revision INTEGER NOT NULL, published_revision INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
